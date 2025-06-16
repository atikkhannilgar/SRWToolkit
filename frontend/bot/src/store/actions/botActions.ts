import { initializeWebSocket } from "apis";
import { AppDispatch } from "store";
import {
  addAudioToQueue,
  ConnectionStatus,
  setcommunicationId,
  setConfig,
  setConnectionStatus,
  setRecordingState,
  setWaitingForResponseState,
  SystemConfig,
  setAssistantMessage,
} from "store/slices/botSlice";
import { doNothing, SnackbarType } from "store/slices/globalSlice";
import { messageToJson, socketReceiveMsgTypes, socketSendMsgTypes } from "utils";

import { showSnackbar } from "./globalActions";

let socket: WebSocket | null = null;
// for proactive mode, object of type SpeechRecognition
// @ts-ignore
let recognition: SpeechRecognition | webkitSpeechRecognition | null = null;

export const loadCommunication = () => (dispatch: AppDispatch) => {
  const urlParams = new URLSearchParams(window.location.search);
  const communicationId = urlParams.get("communication_id");
  if (!communicationId) {
    dispatch(
      showSnackbar({
        type: SnackbarType.ERROR,
        message: "Communication id not found. Please retry!",
      }),
    );
    return;
  }

  dispatch(setcommunicationId(communicationId));
  dispatch(initAndHandleWebsocket(communicationId));
};

const handleConnectionOnOpen = () => {
  return setConnectionStatus(ConnectionStatus.CONNECTED);
};

const handleSocketOnMessage = (event: MessageEvent) => (dispatch: AppDispatch) => {
  const { type, data } = messageToJson(event.data);

  switch (type) {
    // Display error if invalid communication id
    case socketReceiveMsgTypes.INVALID_COMMUNICATION_ID:
      dispatch(
        showSnackbar({
          message: data.message,
          type: SnackbarType.ERROR,
        }),
      );
      break;

    // Show error when UI Error
    case socketReceiveMsgTypes.UI_ERROR:
      dispatch(
        showSnackbar({
          message: data.message,
          type: SnackbarType.ERROR,
        }),
      );
      break;

    case socketReceiveMsgTypes.NEW_BOT_DETECTED:
      dispatch(
        showSnackbar({
          message: data.message,
          type: SnackbarType.ERROR,
        }),
      );
      break;

    case socketReceiveMsgTypes.CLOSE_CONNECTION:
      dispatch(
        showSnackbar({
          message: data.message,
          type: SnackbarType.ERROR,
        }),
      );
      break;

    case socketReceiveMsgTypes.ERROR:
      if (data.message) {
        dispatch(
          showSnackbar({
            message: data.message,
            type: SnackbarType.ERROR,
          }),
        );
      }
      break;

    case socketReceiveMsgTypes.SYSTEM_CONFIG:
      dispatch(setConfig(parseSocketConfig(data.config)));
      break;

    case socketReceiveMsgTypes.AUDIO_RESPONSE:
      dispatch(handleAudioResponse(data));
      break;

    default:
      dispatch(doNothing());
      break;
  }
};

const handleSocketOnError = () => {
  return setConnectionStatus(ConnectionStatus.NOT_CONNECTED);
};

const handleSocketOnClose = () => {
  return setConnectionStatus(ConnectionStatus.NOT_CONNECTED);
};

const handleSocketMessageSend = (data: Record<string, any>) => {
  if (
    !socket ||
    socket.readyState === socket.CONNECTING ||
    socket.readyState === socket.CLOSING ||
    socket.readyState === socket.CLOSED
  )
    return;
  socket.send(JSON.stringify(data));
};

const initAndHandleWebsocket = (communicationId: string) => (dispatch: AppDispatch) => {
  socket = initializeWebSocket(
    communicationId,
    () => dispatch(handleConnectionOnOpen()),
    (e) => dispatch(handleSocketOnMessage(e)),
    () => dispatch(handleSocketOnError()),
    () => dispatch(handleSocketOnClose()),
  );
};

const parseSocketConfig = (data: Record<string, any>): SystemConfig => {
  return {
    skin: data["skin"],
    audioEnabled: data["audio_enabled"],
    textEnabled: data["text_enabled"],
    llmModel: data["llm_model"],
    proactiveModeEnabled: data["proactive_mode_enabled"],
    subtitlesEnabled: data["subtitles_enabled"] !== undefined ? data["subtitles_enabled"] : true,
  };
};

const playAudioFromPath = (path: string) => {
  const beat = new Audio(path);
  beat.play();
};

export const handleMicrophoneClick = () => (dispatch: AppDispatch) => {
  playAudioFromPath("/assets/audios/recording_start.mp3");
  dispatch(setRecordingState(true));
  dispatch(recordAndSendAudio());
};

export const handleUserTextInput = (userText: string) => (dispatch: AppDispatch) => {
  dispatch(setWaitingForResponseState(true));
  handleSocketMessageSend({
    type: socketSendMsgTypes.SEND_TEXT,
    data: {
      text: userText,
    },
  });
};

const recordAndSendAudio = () => (dispatch: AppDispatch) => {
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const mediaRecorder = new MediaRecorder(stream);

      // get the voice level
      const checkVoiceLevel = () => {
        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (const i of dataArray) {
          const value = (i - 128) / 128;
          sum += value * value;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const voiceLevel = Math.round(rms * 100);
        console.log("Voice Level:", voiceLevel);
      };

      const voiceLevelInterval = setInterval(checkVoiceLevel, 100);

      mediaRecorder.ondataavailable = (event) => {
        clearInterval(voiceLevelInterval);

        const reader: FileReader = new FileReader();
        reader.onloadend = () => {
          playAudioFromPath("/assets/audios/recording_stop.mp3");
          const base64AudioData = (reader?.result as string).split(",")[1];
          handleSocketMessageSend({
            type: socketSendMsgTypes.SEND_AUDIO,
            data: {
              audio: base64AudioData,
            },
          });
          dispatch(setRecordingState(false));
          setTimeout(() => {
            dispatch(setWaitingForResponseState(true));
          }, 750);
        };

        reader.readAsDataURL(event.data);
      };

      mediaRecorder.start();
      setTimeout(() => {
        mediaRecorder.stop();
        audioContext.close();
      }, 5000);
    })
    .catch((err) => {
      console.error("Error accessing microphone", err); // eslint-disable-line
    });
  dispatch(doNothing());
};

const handleAudioResponse = (data: any) => (dispatch: AppDispatch) => {
  const { response: audioBase64, content, user_query, fixed_prompt } = data;
  // Store last bot data globally for Avatar visualization
  // @ts-ignore
  window.__lastBotData = { user_query, fixed_prompt, assistantMessage: content };
  dispatch(setWaitingForResponseState(false));
  if (typeof content === "string" && content.trim()) {
    dispatch(setAssistantMessage(content));
  }
  if (!audioBase64?.trim()) {
    dispatch(doNothing());
    return;
  }
  const binaryString = atob(audioBase64);
  const binaryLen = binaryString.length;
  const bytes = new Uint8Array(binaryLen);
  for (let i = 0; i < binaryLen; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Create a Blob from the binary data
  const audioBlob = new Blob([bytes], { type: "audio/mpeg" });

  // Create a URL for the Blob and play the audio
  const audioUrl = URL.createObjectURL(audioBlob);
  dispatch(addAudioToQueue(audioUrl));
};
let isRecognitionRunning = false;
export const startSpeechRecognition = () => (dispatch: AppDispatch) => {
  if (!recognition) {
    dispatch(enableProactiveMode());
  }

  if (isRecognitionRunning) {
    dispatch(doNothing());
    return;
  }

  try {
    recognition?.start();
    isRecognitionRunning = true;
  } catch (error) {
    console.error("Speech recognition start error:", error);
  }
};

export const stopSpeechRecognition = () => (dispatch: AppDispatch) => {
  if (!recognition || !isRecognitionRunning) {
    dispatch(doNothing());
    return;
  }

  recognition.stop();
  isRecognitionRunning = false;
};

export const enableProactiveMode = () => (dispatch: AppDispatch) => {
  // @ts-ignore
  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  // @ts-ignore
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      // @ts-ignore
      .map((result) => result[0].transcript)
      .join("")
      .toLowerCase();

    console.log("transcript", transcript);
    if (transcript.includes("hey bot") || transcript.includes("hey what") || transcript.includes("hey boy") || transcript.includes("hey bought") || transcript.includes("he bought")) {
      recognition.stop();
      playAudioFromPath("/assets/audios/recording_start.mp3");
      dispatch(setRecordingState(true));
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          const audioContext = new AudioContext();
          const analyser = audioContext.createAnalyser();
          const source = audioContext.createMediaStreamSource(stream);
          source.connect(analyser);

          const mediaRecorder = new MediaRecorder(stream);

          mediaRecorder.ondataavailable = (event) => {
            const reader: FileReader = new FileReader();
            reader.onloadend = () => {
              playAudioFromPath("/assets/audios/recording_stop.mp3");
              const base64AudioData = (reader?.result as string).split(",")[1];
              handleSocketMessageSend({
                type: socketSendMsgTypes.SEND_AUDIO,
                data: {
                  audio: base64AudioData,
                },
              });
              dispatch(setRecordingState(false));
              setTimeout(() => {
                dispatch(setWaitingForResponseState(true));
              }, 750);
            };

            reader.readAsDataURL(event.data);
          };

          mediaRecorder.start();
          setTimeout(() => {
            mediaRecorder.stop();
            audioContext.close();
          }, 5000);
        })
        .catch((err) => {
          console.error("Error accessing microphone", err); // eslint-disable-line
        });
    }
  };

  // @ts-ignore
  recognition.onerror = (event) => {
    console.error("Speech recognition error detected: " + event.error);
    dispatch(showSnackbar({ message: event.error, type: SnackbarType.ERROR }));
  };

  recognition.onend = () => {
    isRecognitionRunning = false;
  };

  // recognition.start();
  dispatch(doNothing());
};
