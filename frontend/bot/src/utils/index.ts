// ENVIRONMENT VARIABLES
export const serverUrl = process.env.REACT_APP_SERVER_URL ?? "http://localhost:1339";

// UI CONSTANTS
export const SNACKBAR_DURATION = 6000; // milliseconds

// WEBSOCKET RECEIVED MESSAGES TYPES
export const socketReceiveMsgTypes = {
  UI_ERROR: "UI_ERROR",
  CLOSE_CONNECTION: "CLOSE_CONNECTION",
  INVALID_COMMUNICATION_ID: "INVALID_COMMUNICATION_ID",
  NEW_BOT_DETECTED: "NEW_BOT_DETECTED",
  ERROR: "ERROR",
  SYSTEM_CONFIG: "SYSTEM_CONFIG",
  AUDIO_RESPONSE: "AUDIO_RESPONSE",
  SUBTITLES_TOGGLE: "SUBTITLES_TOGGLE",
};

// WEBSOCKET SEND MESSAGES TYPES
export const socketSendMsgTypes = {
  SEND_TEXT: "SEND_TEXT",
  SEND_AUDIO: "SEND_AUDIO",
};

// UTILS
type SocketMessageDataContent = Record<string, any>;
interface SocketMessageResponse {
  type: string;
  data: SocketMessageDataContent;
}
export const messageToJson = (data: string): SocketMessageResponse => {
  try {
    return JSON.parse(data);
  } catch {
    return {
      data: {
        message: "Error parsing json!",
      },
      type: socketReceiveMsgTypes.UI_ERROR,
    };
  }
};
