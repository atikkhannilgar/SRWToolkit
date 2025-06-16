// ENVIRONMENT VARIABLES
export const serverUrl = process.env.REACT_APP_SERVER_URL ?? "http://localhost:1339";
export const botUrl = process.env.REACT_APP_BOT_URL ?? "http://localhost:5000";

// UI CONSTANTS
export const SNACKBAR_DURATION = 1500; // milliseconds

// LOCAL STORAGE KEYS
export const LS_COMMUNICATION_ID_KEY = "communicationId";

// WEBSOCKET RECEIVED MESSAGE TYPES
export const socketReceiveMsgTypes = {
  UI_ERROR: "UI_ERROR",
  CLOSE_CONNECTION: "CLOSE_CONNECTION",
  INVALID_COMMUNICATION_ID: "INVALID_COMMUNICATION_ID",
  ERROR: "ERROR",
  IS_BOT_CONNECTED: "IS_BOT_CONNECTED",
  NEW_CONTROL_PANEL_DETECTED: "NEW_CONTROL_PANEL_DETECTED",
  SYSTEM_CONFIG: "SYSTEM_CONFIG",
  PING_STATE: "PING_STATE",
};

// WEBSOCKET SEND MESSAGE TYPES
export const socketSendMsgTypes = {
  UPDATE_CONFIG: "UPDATE_CONFIG",
  PING: "PING",
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

// SKINS
export enum Skins {
  simple = "simple",
  fullbot = "fullbot",
  faceonly = "faceonly",
}
export interface SkinData {
  id: Skins;
  name: string;
  url: string;
}
export const skinsList: SkinData[] = [
  { id: Skins.simple, name: "Simple", url: `${botUrl}/assets/skins/simple.svg` },
  { id: Skins.fullbot, name: "Full Bot", url: `${botUrl}/assets/skins/fullbot.png` },
  { id: Skins.faceonly, name: "Face Only", url: `${botUrl}/assets/skins/faceonly.png` },
];
