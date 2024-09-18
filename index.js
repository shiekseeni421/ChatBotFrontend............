"use client";
import React, { useState, useEffect, useRef } from "react";
import moment from "moment";
import chatbotCustomStyles from "@/styles/chatbot.module.css";
/* Icons Import */
import { MdOutlineDelete } from "react-icons/md";
import { CiMicrophoneOff } from "react-icons/ci";
import { IoMdSend } from "react-icons/io";
import TouchAppOutlinedIcon from "@mui/icons-material/TouchAppOutlined";
import VolumeOffOutlinedIcon from "@mui/icons-material/VolumeOffOutlined";
import VolumeUpOutlinedIcon from "@mui/icons-material/VolumeUpOutlined";
import CircularProgress from "@mui/material/CircularProgress";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";

import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Link,
  Box,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Card,
  CardContent,
  Tooltip,
  Snackbar,
  Alert,
} from "@mui/material";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { getAdminTransilateKey } from "@/lib/axiosApiServices";
import { useMediaQuery } from "@mui/material";

import {
  chatBotBaseApi,
  chatBotGenerateSummary,
  generateChatBotAudio,
} from "./chatbotapi";

import { useCombinedAuth } from "@/customhooks/useCombinedAuth";
import { useAlerContext } from "@/context/AlertContext";

const ChatBot = () => {
  const { handleSuccess, handleError, handleInfo, handleWarning } =
    useAlerContext();
  const isMobile = useMediaQuery("(max-width:600px)");
  const isMobileHegit = useMediaQuery("(min-height:780px)");
  const chatBotlgn = { en: "en", hi: "hi", te: "te" };
  const storedLanguage =
    typeof window !== "undefined" && sessionStorage.getItem("sessionLgn");
  let [messages, setMessages] = useState([]);
  let [isModalOpen, setIsModalOpen] = useState(false);
  let [input, setInput] = useState("");
  let [rating, setRating] = useState(0);
  let [Feedback, setFeedBack] = useState("");
  let [mute, setMute] = useState(false);
  let [voiceMute, setVoiceMute] = useState(true);
  let [BotResponse, setBotResponse] = useState(true);
  let [language, setLanguage] = useState("");
  const [showChatbot, setShowChatbot] = useState(false);
  const [summaries, setSummaries] = useState({});
  const [open, setOpen] = useState(false);
  let [botLoader, setBotLoader] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const vipedia = "/officialslogo/vipedia.png";
  const botimg = "/officialslogo/vpediaChatBotLog.png";
  const ChatBotIcon = "/officialslogo/chatbotLog.png";
  const [listening, setListening] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const chatContainerRef = useRef(null);
  const [botResponseCount, setBotResponseCount] = useState(0);
  const {
    isAuthenticated,
    userDetails,
    myRole,
    myLangOptions,
    token,
    logoutFromCookie,
  } = useCombinedAuth();
  let userName = userDetails;
  const timerRef = useRef(null); // Use useRef to persist the timer
  const [feedbackText, setFeedbackText] = useState("");
  // const [feedbackOpen, setFeedbackOpen] = useState(false);
  let currentAudio = null; // Global variable to store the current audio instance
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const recognitionActiveRef = useRef(false); // Use useRef to track recognition state
  const recognitionRef = useRef(null);
  const latestMessageRef = useRef(null);

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  useEffect(() => {
    setLanguage(chatBotlgn[storedLanguage] ? storedLanguage : "en");
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      recognitionRef.current = new (window.SpeechRecognition ||
        window.webkitSpeechRecognition)();
      recognitionRef.current.continuous = true; // Set continuous to true for continuous recognition
      recognitionRef.current.interimResults = true; // Allow interim results (partial speech)
      recognitionRef.current.onresult = (event) => {
        const results = Array.from(event.results);
        const transcript = results
          .map((result) => result[0].transcript)
          .join("");
        setInput(transcript);
      };
      recognitionRef.current.onerror = (event) => {
        setListening(false);
        setVoiceMute(true);
        setSeconds(0);
        clearInterval(timerRef.current);
        // handleError(event.error);
        recognitionActiveRef.current = false;
      };
      recognitionRef.current.onstart = () => {
        recognitionActiveRef.current = true;
        setListening(true);
      };

      recognitionRef.current.onend = () => {
        recognitionActiveRef.current = false;
        setListening(false);
        setVoiceMute(true);
        setSeconds(0);
        clearInterval(timerRef.current);
      };
    } else {
      // handleError("Web Speech API is not supported in this browser.");
    }
  }, []);

  const checkMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      stream.getTracks().forEach((track) => track.stop());
    } catch (err) {
      setSnackbarMessage("Microphone access denied. Please enable it.");
      setSnackbarOpen(true);
    }
  };

  const startRecognition = () => {
    checkMicrophonePermission();
    if (!recognitionActiveRef.current) {
      setInput("");
      try {
        recognitionRef.current.start();
        setVoiceMute(false);
        startTimer();
      } catch (error) {
        console.error("Error starting recognition:", error);
      }
    }
  };

  const stopRecognition = () => {
    if (recognitionActiveRef.current) {
      try {
        recognitionRef.current.stop();
        clearInterval(timerRef.current);
        setSeconds(0);
        setListening(false);
        setVoiceMute(true);
      } catch (error) {
        console.error("Error stopping recognition:", error);
      }
    }
  };

  const startTimer = () => {
    let count = 0;
    timerRef.current = setInterval(() => {
      if (count < 15) {
        count += 1;
        setSeconds((prev) => prev + 1);
      } else {
        stopRecognition();
      }
    }, 1000);
  };

  const handleClickVoice = () => {
    // Toggle recognition based on its current state
    if (!recognitionActiveRef.current) {
      startRecognition();
    } else {
      stopRecognition();
    }
  };

  // // Function to handle rating changes
  // const handleRatingChange = (event, newRating) => {
  //   setRating(newRating); // Update rating state with new rating value
  // };

  // // Function to handle text field changes
  // const handleFeedbackChange = (event) => {
  //   setFeedbackText(event.target.value); // Update feedback text state with user input
  // };

  // // Function to handle form submission
  // const handleSubmit = () => {
  //   // Call the onSubmit function passed from the parent component
  //   console.log({ rating, feedbackText });
  // };

  // const handleCollapseClick = () => {
  //   setExpanded(!expanded);
  // };

  const handleLanguageChange = (event) => {
    language = event.target.value;
    setLanguage(language);
    messages = [];
    input = "";
    BotResponse = false;
    setMessages(messages);
    setInput(input);
    setBotResponse(BotResponse);
    sendMessage();
  };

  // /* Feedback Model Functionality */
  // const showModal = () => {
  //   setIsModalOpen(true);
  // };
  const handleToggleChatbot = () => {
    setShowChatbot((prevState) => !prevState);
  };

  /* Send Meassage to Dailogflow Api Functionality */
  var sendMessage = async () => {
    let intentName = "";
    let inputvarible = input;
    input = "";
    setInput(input);
    var data = [...messages];
    const dayOfWeek = moment().format("dddd"); // Get day in English
    const days = dayMappings[language] || dayMappings["en"];

    if (inputvarible !== "") {
      if (inputvarible.trim() === "") return;
      var userInput = (
        <Box
          ref={latestMessageRef}
          name="User"
          style={{ alignSelf: "flex-end" }}
        >
          <Box className={chatbotCustomStyles.userContaint}>
            <Box style={{ display: "flex", flexDirection: "column" }}>
              <Typography
                sx={{
                  padding: "15px 25px",
                  display: "inline",
                  borderRadius: "20px 0px 20px 20px",
                  fontSize: "15px",
                  backgroundColor: (theme) => `${theme.palette.primary.main}`,
                  color: "#ffffff",
                }}
              >
                {inputvarible}
              </Typography>
              <Typography className={chatbotCustomStyles.TimeStap}>
                {`${days[dayOfWeek] || dayOfWeek}, ${moment().format(
                  "h:mm A"
                )}`}
              </Typography>
            </Box>
            <Typography className={chatbotCustomStyles.userImage}>
              You
            </Typography>
          </Box>
        </Box>
      );

      data.push(userInput);
      messages = [...data];
      setMessages([messages]);
    }
    BotResponse = true;
    setBotResponse(BotResponse);

    try {
      const response = await chatBotBaseApi({
        query: `${
          inputvarible.trim("") === "" ? `hi` : `${inputvarible.trim("")}`
        }`,
        sessionId: "4567891",
        languageCode: language,
        userName: userName?.fullName == undefined ? "" : userName?.fullName,
      });
      data = [...messages];
      intentName = response.fulfillmentMessages[0].text[0];
      const fulfillmentMessages = response.fulfillmentMessages.slice(1); // Skip the first element
      for (let i of fulfillmentMessages) {
        if (i.type === "text") {
          var BotInput = (
            <div className={chatbotCustomStyles.botContaint}>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  marginLeft: "25px",
                }}
              >
                <Typography
                  sx={{
                    marginTop: "10px",
                    padding: "10px",
                    width: "65%",
                    fontSize: "15px",
                    borderRadius: "20px 20px 20px 0px",
                    backgroundColor: (theme) => `${theme.palette.primary.main}`,
                    color: "#ffffff",
                  }}
                >
                  {i.text[0]}
                </Typography>
                <Typography className={chatbotCustomStyles.TimeStap}>
                  {`${days[dayOfWeek] || dayOfWeek}, ${moment().format(
                    "h:mm A"
                  )}`}
                </Typography>
              </Box>
              <img
                className={chatbotCustomStyles.botImage}
                src={botimg}
                alt="Bot"
              />
            </div>
          );
          data.push(BotInput);
          messages = [...data];
          setMessages(messages);
          BotResponse = false;
          setBotResponse(BotResponse);
          speakResponse(i.text[0], intentName);
        } else {
          if (i.type === "buttons") {
            const buttonel = (
              <div className={chatbotCustomStyles.botContaint}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    marginLeft: "25px",
                  }}
                >
                  <div className={chatbotCustomStyles.card}>
                    {i?.buttons.map((item, index) => {
                      return (
                        <div
                          className={chatbotCustomStyles.hoverableButton}
                          key={`${index + 1}-buttonclick-${item}`}
                          onClick={() => {
                            input = item;
                            setInput(input);
                            sendMessage();
                          }}
                        >
                          <TouchAppOutlinedIcon />
                          <Typography
                            className={chatbotCustomStyles.buttonText}
                          >
                            {item}
                          </Typography>
                        </div>
                      );
                    })}
                  </div>
                  <Typography className={chatbotCustomStyles.TimeStap}>
                    {`${days[dayOfWeek] || dayOfWeek}, ${moment().format(
                      "h:mm A"
                    )}`}
                  </Typography>
                </div>
                <img
                  className={chatbotCustomStyles.botImage}
                  src={botimg}
                  alt="Bot"
                />
              </div>
            );
            data.push(buttonel);
            messages = [...data];
            setMessages(messages);
            BotResponse = false;
            setBotResponse(BotResponse);
          } else if (i.type === "list") {
            const ListCard = (
              <div className={chatbotCustomStyles.botContaint}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    marginLeft: "25px",
                  }}
                >
                  <Card
                    style={{
                      maxWidth: 345,
                      cursor: "pointer",
                      transition: "transform 0.3s, box-shadow 0.3s",
                      boxShadow: "0px 3px 6px rgba(0, 0, 0, 0.16)",
                      borderRadius: "12px", // Border radius for the card
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "scale(1.05)";
                      e.currentTarget.style.boxShadow =
                        "0px 6px 12px rgba(0, 0, 0, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.boxShadow =
                        "0px 3px 6px rgba(0, 0, 0, 0.16)";
                    }}
                  >
                    {/* Header section with background color */}
                    <Box
                      sx={{
                        backgroundColor: (theme) =>
                          `${theme.palette.primary.main}`,
                        color: "#fff", // Text color for the header
                        padding: "16px",
                        fontWeight: "bold",
                        borderTopLeftRadius: "12px",
                        borderTopRightRadius: "12px",
                        textAlign: "center",
                      }}
                    >
                      {i.title}
                    </Box>

                    {/* Divider */}
                    <div
                      style={{
                        height: "1px",
                        backgroundColor: "#ccc",
                      }}
                    />

                    {/* Card content */}
                    <CardContent>
                      {i.list.map((item, index) => (
                        <Box
                          key={`${index + 1}-card-content-${item}`}
                          style={{
                            display: "flex",
                            marginBottom: "5px", // Adjust spacing between items
                          }}
                        >
                          <Typography style={{ marginRight: "5px" }}>
                            {index + 1}.
                          </Typography>
                          <Typography>{item}</Typography>
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                  <Typography className={chatbotCustomStyles.TimeStap}>
                    {`${days[dayOfWeek] || dayOfWeek}, ${moment().format(
                      "h:mm A"
                    )}`}
                  </Typography>
                </div>
                <img
                  className={chatbotCustomStyles.botImage}
                  src={botimg}
                  alt="Bot"
                />
              </div>
            );
            data.push(ListCard);
            messages = [...data];
            setMessages(messages);
            BotResponse = false;
            setBotResponse(BotResponse);
          } else if (i.type == "listItems") {
            const ListOfElement = (
              <div className={chatbotCustomStyles.botContaint}>
                <Box style={{ marginLeft: "25px", padding: "10px" }}>
                  {i.listItems.map((item, index) => (
                    <Accordion key={`${index + 1}-accordion-list-${item}`}>
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls={`panel${index}-content`}
                        id={`panel${index}-header`}
                      >
                        <Typography
                          variant="h6"
                          style={{ fontSize: "0.99rem" }}
                        >
                          {item.title.split("—")[0]}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography style={{ fontSize: "0.8rem" }}>
                          {item.description}
                          <br />
                          <Button
                            onClick={() =>
                              handleGenerateSummary(
                                item.title.split("—")[0],
                                item.contextPath
                              )
                            }
                          >
                            <Typography
                              sx={{
                                color: (theme) =>
                                  `${theme.palette.common.black}`,

                                fontWeight: "400",
                              }}
                            >
                              {chatBotHeaddings[language]["View Summary"]}
                            </Typography>
                          </Button>
                        </Typography>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                  <Typography className={chatbotCustomStyles.TimeStap}>
                    {`${days[dayOfWeek] || dayOfWeek}, ${moment().format(
                      "h:mm A"
                    )}`}
                  </Typography>
                </Box>

                <img
                  className={chatbotCustomStyles.botImage}
                  src={botimg}
                  alt="Bot"
                />
              </div>
            );
            data.push(ListOfElement);
            messages = [...data];
            setMessages(messages);
            BotResponse = false;
            setBotResponse(BotResponse);
          } else if (i.type === "listOfText") {
            i.listOfText.map((item, index) => {
              const ListCard = (
                <div
                  className={chatbotCustomStyles.botContaint}
                  key={`${index + 1}-list-of-test-${item}`}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      marginLeft: "25px",
                    }}
                  >
                    <Card
                      style={{
                        maxWidth: 345,
                        cursor: "pointer",
                        transition: "transform 0.3s, box-shadow 0.3s",
                        boxShadow: "0px 3px 6px rgba(0, 0, 0, 0.16)",
                        borderRadius: "12px", // Border radius for the card
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "scale(1.05)";
                        e.currentTarget.style.boxShadow =
                          "0px 6px 12px rgba(0, 0, 0, 0.2)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                        e.currentTarget.style.boxShadow =
                          "0px 3px 6px rgba(0, 0, 0, 0.16)";
                      }}
                    >
                      {/* Header section with background color */}
                      <Box
                        sx={{
                          backgroundColor: (theme) =>
                            `${theme.palette.primary.main}`,
                          color: "#fff", // Text color for the header
                          padding: "16px",
                          fontWeight: "bold",
                          borderTopLeftRadius: "12px",
                          borderTopRightRadius: "12px",
                          textAlign: "center",
                        }}
                      >
                        {item.title}
                      </Box>

                      {/* Divider */}
                      <div
                        style={{
                          height: "1px",
                          backgroundColor: "#ccc",
                        }}
                      />

                      {/* Card content */}
                      <CardContent>
                        {item.list.map((item, index) => (
                          <Box
                            key={`${index + 1}-card2-item-${item}`}
                            style={{
                              display: "flex",
                              marginBottom: "5px", // Adjust spacing between items
                            }}
                          >
                            <Typography style={{ marginRight: "5px" }}>
                              {index + 1}.
                            </Typography>
                            <Typography>{item}</Typography>
                          </Box>
                        ))}
                      </CardContent>
                    </Card>

                    <Typography className={chatbotCustomStyles.TimeStap}>
                      {`${days[dayOfWeek] || dayOfWeek}, ${moment().format(
                        "h:mm A"
                      )}`}
                    </Typography>
                  </div>
                  <img
                    className={chatbotCustomStyles.botImage}
                    src={botimg}
                    alt="Bot"
                  />
                </div>
              );
              data.push(ListCard);
              messages = [...data];
              setMessages(messages);
              BotResponse = false;
              setBotResponse(BotResponse);
            });
          }
        }
      }
    } catch (error) {
      console.error("Error communicating with Dialogflow", error);
    }
  };

  useEffect(() => {
    const container = chatContainerRef.current;
    const latestMessage = latestMessageRef.current;
    if (container && latestMessage) {
      const scrollToElement = (element, duration) => {
        const start = container.scrollTop;
        const end =
          element.offsetTop - container.clientHeight + element.clientHeight;
        const startTime = performance.now();

        const animateScroll = (currentTime) => {
          const elapsedTime = currentTime - startTime;
          const progress = Math.min(elapsedTime / duration, 1);
          const currentScroll = start + (end - start) * progress;

          container.scrollTop = currentScroll;

          if (progress < 1) {
            requestAnimationFrame(animateScroll);
          }
        };

        requestAnimationFrame(animateScroll);
      };

      scrollToElement(latestMessage, 1000); // Adjust duration if needed
    }
  }, [messages]);

  useEffect(() => {
    if (showChatbot === true && botResponseCount === 0) {
      setBotResponseCount(1);
      sendMessage();
    }
  }, [showChatbot]);

  /* Delete Functionality */
  const reloadChat = () => {
    messages = [];
    input = "";
    mute = false;
    rating = 0;
    Feedback = "";
    BotResponse = false;
    voiceMute = true;
    setMessages(messages);
    setInput(input);
    setRating(rating);
    setFeedBack(Feedback);
    setMute(mute);
    setBotResponse(BotResponse);
    setVoiceMute(voiceMute);
    sendMessage();
  };

  const handleGenerateSummary = async (title, plainTextContent) => {
    setOpen(true);
    setBotLoader(true);
    setSummaries({
      title: title,
      url: plainTextContent,
    });
    const payload = {
      lang: language,
      links: plainTextContent,
    };
    try {
      const formData = new FormData();
      for (const key in payload) {
        formData.append(key, payload[key]);
      }

      const response = await chatBotGenerateSummary(formData);
      // await axios.post(
      //   "http://10.244.2.187:5003/generateSummaryFromLinks",
      //   formData,
      //   { headers: headers }
      // );

      setSummaries({
        title: title,
        url: plainTextContent,
        data: response.result,
      });
      setBotLoader(false);
    } catch (error) {
      setBotLoader(false);
      handleError(error);
    }
  };

  /*text to speech */
  const speakResponse = async (text, intentName) => {
    if (mute === true) {
      const payload = {
        lang: language,
        text: text,
        intent: intentName,
      };

      try {
        const formData = new FormData();
        for (const key in payload) {
          formData.append(key, payload[key]);
        }
        const response = await generateChatBotAudio(formData);

        const audioUrl = response.speechUrl;
        /* use this for local
        
        .replace(
          `/var/www/html/`,
          `http://10.244.2.187/`
        );
        */

        // If there's already an audio playing, stop it
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0; // Reset the audio time to the beginning
          currentAudio = null; // Clear the previous audio instance
        }

        // Create a new audio instance for the new audio
        currentAudio = new Audio(audioUrl);

        currentAudio.onended = () => {
          currentAudio = null; // Reset the currentAudio once the playback is done
        };

        await currentAudio.play();
      } catch (error) {
        handleError(error);
      }
    }
  };

  async function getTranslation(inputText, lgn) {
    try {
      let res = await getAdminTransilateKey(inputText, lgn);
      return res;
    } catch (err) {
      handleError(err);
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === " " && language !== "en") {
      getTranslation(input, language).then((apiResponse) => {
        const isRequestSuccessful =
          Array.isArray(apiResponse) &&
          apiResponse[0] === "SUCCESS" &&
          apiResponse[1]?.[0]?.[1]?.[0] !== "" &&
          apiResponse[1]?.[0]?.[1]?.[0] !== null;
        if (isRequestSuccessful) {
          input = apiResponse[1][0][1][0] + " ";
          setInput(apiResponse[1][0][1][0] + " ");
        } else {
          setInput(input);
        }
      });
    } else if (
      event.key === "Enter" &&
      input != " " &&
      input != "" &&
      language !== "en"
    ) {
      getTranslation(input, language).then((apiResponse) => {
        const isRequestSuccessful =
          Array.isArray(apiResponse) &&
          apiResponse[0] === "SUCCESS" &&
          apiResponse[1]?.[0]?.[1]?.[0] !== "" &&
          apiResponse[1]?.[0]?.[1]?.[0] !== null;
        if (isRequestSuccessful) {
          input = apiResponse[1][0][1][0] + " ";
          setInput(apiResponse[1][0][1][0] + " ");
          sendMessage();
        } else {
          setInput(input);
          sendMessage();
        }
      });
    } else if (input != " " && input != "" && event.key === "Enter") {
      sendMessage();
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const chatBotHeaddings = {
    en: {
      "enter the text": "enter the text",
      "Suggestion Tab": "Suggestion Tab",
      "View Summary": "View Summary",
      "Close Button": "CLOSE",
      "See More": "SEE MORE",
      Listening: "Listening.....",
    },
    te: {
      "enter the text": "వచనాన్ని నమోదు చేయండి",
      "Suggestion Tab": "సూచన ట్యాబ్",
      "View Summary": "సారాంశాన్ని వీక్షించండి",
      "Close Button": "మూసివేయి",
      "See More": "మరిన్ని చూడండి",
      Listening: "Listening.....",
    },
    hi: {
      "enter the text": "पाठ दर्ज करें",
      "Suggestion Tab": "सुझाव टैब",
      "View Summary": "सारांश देखें",
      "Close Button": "बंद करना",
      "See More": "और देखें",
      Listening: "Listening.....",
    },
    ta: {
      "enter the text": "உரையை உள்ளிடவும்",
      "Suggestion Tab": "பரிந்துரை தாவல்",
      "View Summary": "சுருக்கத்தைப் பார்க்கவும்",
      "Close Button": "மூடவும்",
      "See More": "மேலும் பார்க்கவும்",
      Listening: "Listening.....",
    },
  };

  const suggestionQuestions = {
    te: [
      "వికాస్పీడియా లో చేరండి ?",
      "వికాస్పీడియా అంటే ఏమిటి ?",
      "వికాస్పీడియాలో అందుబాటులో ఉన్న విభిన్న వినియోగదారు పాత్రలు ఏమిటి ?",
      "వికాస్పీడియాలోని విభిన్న డొమైన్‌లు ఏమిటి ?",
      "నేను వికాస్పీడియాలో కంటెంట్‌ను ఎలా సృష్టించగలను ?",
      "నేను వికాస్పీడియాకు కంటెంట్ కంట్రిబ్యూటర్‌గా ఎలా మారగలను ?",
      "వికాస్పీడియా వెబ్‌సైట్‌లో ఏ ఫీచర్లు అందుబాటులో ఉన్నాయి ?",
      "వికాస్పీడియా వెబ్‌సైట్ ఎన్ని భారతీయ భాషల్లో అందుబాటులో ఉంది ?",
      "వికాస్పీడియా వెబ్‌సైట్‌ను రూపొందించిన సంస్థ గురించి చెప్పగలరా ?",
      "వికాస్పీడియాలో ఏ వినియోగదారు పాత్రలు కంటెంట్‌ని సృష్టించవచ్చు మరియు సవరించవచ్చు ? ",
    ],
    en: [
      "Join Vikaspedia ?",
      "What is the Vikaspedia ?",
      "What are the different user roles available in Vikaspedia ?",
      "What are the different domains in Vikaspedia ?",
      "How can I Create to content in Vikaspedia ?",
      "How can I become a content contributor to Vikaspedia ?",
      "What are the features available in Vikaspedia website ?",
      "how many indian languages vikaspedia website is avliable ?",
      "Can you tell me about the organisation that created Vikaspedia website ?",
      "Which user roles can create and edit content on Wikaspedia ?",
    ],
    hi: [
      "विकासपीडिया से जुड़ें?",
      "विकासपीडिया क्या है?",
      "विकासपीडिया में विभिन्न उपयोगकर्ता भूमिकाएँ क्या उपलब्ध हैं?",
      "विकासपीडिया में विभिन्न डोमेन क्या हैं?",
      "मैं विकासपीडिया में सामग्री कैसे बना सकता हूँ?",
      "मैं विकासपीडिया में सामग्री योगदानकर्ता कैसे बन सकता हूँ?",
      "विकासपीडिया वेबसाइट में क्या सुविधाएँ उपलब्ध हैं?",
      "विकासपीडिया वेबसाइट कितनी भारतीय भाषाओं में उपलब्ध है?",
      "क्या आप मुझे उस संगठन के बारे में बता सकते हैं जिसने विकासपीडिया वेबसाइट बनाई है?",
      "विकिपीडिया पर कौन सी उपयोगकर्ता भूमिकाएँ सामग्री बना और संपादित कर सकती हैं?",
    ],
    ta: [
      "Join Vikaspedia ?",
      "What is the Vikaspedia ?",
      "What are the different user roles available in Vikaspedia ?",
      "What are the different domains in Vikaspedia ?",
      "How can I Create to content in Vikaspedia ?",
      "How can I become a content contributor to Vikaspedia ?",
      "What are the features available in Vikaspedia website ?",
      "how many indian languages vikaspedia website is avliable ?",
      "Can you tell me about the organisation that created Vikaspedia website ?",
      "Which user roles can create and edit content on Wikaspedia ?",
    ],
  };

  const dayMappings = {
    en: {
      Sunday: "Sunday",
      Monday: "Monday",
      Tuesday: "Tuesday",
      Wednesday: "Wednesday",
      Thursday: "Thursday",
      Friday: "Friday",
      Saturday: "Saturday",
    },
    ta: {
      Sunday: "ஞாயிறு",
      Monday: "செவ்வாய்",
      Tuesday: "புதன்",
      Wednesday: "வியாழன்",
      Thursday: "வெள்ளி",
      Friday: "சனிக்கிழமை",
      Saturday: "சனி",
    },
    te: {
      Sunday: "ఆదివారం",
      Monday: "సోమవారం",
      Tuesday: "మంగళవారం",
      Wednesday: "బుధవారం",
      Thursday: "గురువారం",
      Friday: "శుక్రవారం",
      Saturday: "శనివారం",
    },
    hi: {
      Sunday: "रविवार",
      Monday: "सोमवार",
      Tuesday: "मंगलवार",
      Wednesday: "बुधवार",
      Thursday: "गुरुवार",
      Friday: "शुक्रवार",
      Saturday: "शनिवार",
    },
  };

  return (
    <>
      <div className={chatbotCustomStyles.appContainer}>
        {showChatbot && (
          <Box
            className={chatbotCustomStyles.ChatbotContainer}
            sx={{
              width: isMobile ? "100%" : "400px",
              right: isMobile ? "0" : "70px",
              bottom: isMobile ? "104px" : "70px",
              height: isMobileHegit ? "80%" : "450px",
            }}
          >
            <Box
              className={chatbotCustomStyles.chatbotNavbar}
              sx={{
                backgroundColor: (theme) => `${theme.palette.primary.main}`,
              }}
            >
              <img
                src={vipedia}
                alt="Logo"
                height={50}
                width={50}
                className={chatbotCustomStyles.logoStyle}
              />

              <div className={chatbotCustomStyles.menuItems}>
                <div>
                  <Select
                    value={language}
                    onChange={handleLanguageChange}
                    displayEmpty
                    inputProps={{ "aria-label": "Language Selector" }}
                    style={{
                      color: "white",
                      border: 0,
                    }}
                    MenuProps={{
                      PaperProps: {
                        style: {
                          backgroundColor: "#333",
                          color: "white",
                        },
                      },
                    }}
                  >
                    <MenuItem value="en">
                      <span style={{ color: "white" }}>English</span>
                    </MenuItem>
                    <MenuItem value="te">
                      <span style={{ color: "white" }}>తెలుగు</span>
                    </MenuItem>
                    <MenuItem value="hi">
                      <span style={{ color: "white" }}>हिन्दी</span>
                    </MenuItem>
                  </Select>
                </div>
                {mute === true ? (
                  <VolumeUpOutlinedIcon
                    className={chatbotCustomStyles.chatBotIcons}
                    onClick={() => {
                      mute = false;
                      setMute(mute);
                    }}
                  />
                ) : (
                  <VolumeOffOutlinedIcon
                    className={chatbotCustomStyles.chatBotIcons}
                    onClick={() => {
                      mute = true;
                      setMute(mute);
                    }}
                  />
                )}
                <MdOutlineDelete
                  onClick={() => {
                    reloadChat();
                  }}
                  className={chatbotCustomStyles.chatBotIcons}
                />
                {/* <ClearOutlinedIcon
                  onClick={() => {
                    setFeedbackOpen(true);
                  }}
                  className={chatbotCustomStyles.chatBotIcons}
                /> */}
                {/* <Box>
                <IconButton
                  aria-controls={openMenu ? "menu" : undefined}
                  aria-haspopup="true"
                  aria-expanded={open ? "true" : undefined}
                  onClick={handleMenuClick}
                  sx={{ color: "white" }}
                >
                  <MoreHorizIcon />
                </IconButton>
                <Menu
                  id="menu"
                  anchorEl={anchorEl}
                  open={openMenu}
                  onClose={handleMenuClose}
                  transformOrigin={{ horizontal: "right", vertical: "top" }}
                  anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                >
                  {MenuItems.map((item, index) => (
                    <MenuItem key={index}>{item.label}</MenuItem>
                  ))}
                </Menu>
              </Box> */}
              </div>
            </Box>
            <Box
              ref={chatContainerRef}
              className={chatbotCustomStyles.chatbotBody}
              sx={{
                height: isMobileHegit ? "80%" : "70%",
              }}
            >
              {messages?.map((item, index) => {
                return (
                  <React.Fragment key={`${item}-body-${index}`}>
                    {item}
                  </React.Fragment>
                );
              })}

              {BotResponse && (
                <div className={chatbotCustomStyles.loderContainer}>
                  <div className={chatbotCustomStyles.loader}></div>
                </div>
              )}
            </Box>
            <div className={chatbotCustomStyles.suggestionInptContainer}>
              {/* <Box
                className={chatbotCustomStyles.suggestionTab}
                onClick={handleCollapseClick}
              >
                <Box
                  sx={{
                    backgroundColor: (theme) => `${theme.palette.primary.main}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    color: (theme) => `${theme.palette.common.black}`,
                  }}
                >
                  <span>{chatBotHeaddings[language]["Suggestion Tab"]}</span>
                  {expanded ? (
                    <IconButton>
                      <IndeterminateCheckBoxOutlinedIcon />
                    </IconButton>
                  ) : (
                    <IconButton>
                      <AspectRatioOutlinedIcon />
                    </IconButton>
                  )}
                </Box>
                {expanded && (
                  <div className={chatbotCustomStyles.suggestionBody}>
                    {suggestionQuestions[language]?.map((item, index) => (
                      <div className={chatbotCustomStyles.card} key={index}>
                        <div
                          className={chatbotCustomStyles.hoverableButton}
                          onClick={() => {
                            input = item;
                            setInput(input);
                            sendMessage();
                            setExpanded(false);
                          }}
                        >
                          <TouchAppOutlinedIcon />
                          <Typography
                            className={chatbotCustomStyles.buttonText}
                          >
                            {item}
                          </Typography>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Box> */}
              <Box className={chatbotCustomStyles.inputContainer}>
                <Box className={chatbotCustomStyles.inputMic}>
                  <input
                    variant="filled"
                    className={chatbotCustomStyles.chatInput}
                    placeholder={
                      listening == true
                        ? chatBotHeaddings[language]["Listening"]
                        : chatBotHeaddings[language]["enter the text"]
                    }
                    onKeyDown={handleKeyDown}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                    }}
                  />

                  <Box>
                    {voiceMute === true ? (
                      <CiMicrophoneOff
                        className={chatbotCustomStyles.chatBotIcons}
                        onClick={handleClickVoice}
                        color="#121212"
                      />
                    ) : (
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          color: "red",
                        }}
                      >
                        <Typography
                          sx={{ marginRight: "5px", marginTop: "6px" }}
                        >
                          {String(seconds).padStart(2, "0")}
                        </Typography>

                        <RadioButtonCheckedIcon
                          onClick={handleClickVoice}
                          sx={{
                            cursor: "pointer",
                            marginRight: "10px",
                          }}
                        />
                      </Box>
                    )}
                  </Box>
                </Box>

                <IoMdSend
                  onClick={() => {
                    if (input !== "" && language !== "en" && input !== " ") {
                      getTranslation(input, language).then((apiResponse) => {
                        const isRequestSuccessful =
                          Array.isArray(apiResponse) &&
                          apiResponse[0] === "SUCCESS" &&
                          apiResponse[1]?.[0]?.[1]?.[0] !== "" &&
                          apiResponse[1]?.[0]?.[1]?.[0] !== null;
                        if (isRequestSuccessful) {
                          input = apiResponse[1][0][1][0] + " ";
                          setInput(apiResponse[1][0][1][0] + " ");
                          sendMessage();
                        } else {
                          setInput(input);
                          sendMessage();
                        }
                      });
                    } else if (input !== " " && input !== "") {
                      sendMessage();
                    }
                  }}
                  className={chatbotCustomStyles.Button}
                />
              </Box>
            </div>
          </Box>
        )}
        <Button
          onClick={handleToggleChatbot}
          sx={{
            position: "fixed",
            bottom: "50px",
            right: "5px",
            cursor: "pointer",
            zIndex: "999",
            borderRadius: "50%",
            width: "50px",
            height: "60px",
            backgroundColor: (theme) => `${theme.palette.primary.main}`,
          }}
          size="large"
          variant="contained"
        >
          <Tooltip
            title={
              showChatbot
                ? "Close"
                : "Hello! I'm Info Vikas. How can I help you?"
            }
          >
            {showChatbot ? (
              <CloseOutlinedIcon />
            ) : (
              <img
                alt="vikasAi"
                src={ChatBotIcon}
                height={80}
                width={80}
                style={{
                  borderRadius: "50%",
                }}
              />
            )}
          </Tooltip>
        </Button>
      </div>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="responsive-dialog-title"
      >
        <DialogTitle id="responsive-dialog-title">
          {summaries.title}
        </DialogTitle>
        <DialogContent
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {botLoader && <CircularProgress />}
          <DialogContentText
            style={{
              marginTop: "16px",
              maxHeight: "200px",
              overflow: "auto",
            }}
          >
            {!botLoader && (
              <Typography
                dangerouslySetInnerHTML={{ __html: summaries.data }}
              />
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} autoFocus color="secondary">
            Close
          </Button>
          <Button autoFocus>
            <Link
              href={summaries.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              See More
            </Link>
          </Button>
        </DialogActions>
      </Dialog>

      {/* feedback code  */}

      {/* <Dialog
        open={feedbackOpen}
        onClose={() => {
          setFeedbackOpen(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Feedback
          <IconButton
            aria-label="close"
            onClose={() => {
              setFeedbackOpen(false);
            }}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography>Rate Your Experience.</Typography>
          <Rating
            name="feedback-rating"
            value={rating}
            onChange={handleRatingChange}
            size="large"
          />
          <TextField
            label="Write your feedback"
            multiline
            fullWidth
            rows={4}
            margin="normal"
            variant="outlined"
            value={feedbackText}
            onChange={handleFeedbackChange}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClose={() => {
              setFeedbackOpen(false);
            }}
            color="primary"
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} color="primary" variant="contained">
            Submit
          </Button>
        </DialogActions>
      </Dialog> */}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity="error"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ChatBot;
