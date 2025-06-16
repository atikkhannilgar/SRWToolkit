import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Skins } from "configs/skins";

export enum ConnectionStatus {
  CONNECTING = "CONNECTING",
  CONNECTED = "CONNECTED",
  NOT_CONNECTED = "NOT_CONNECTED",
}
export interface SystemConfig {
  skin: keyof Skins;
  audioEnabled: boolean;
  textEnabled: boolean;
  llmModel: string;
  proactiveModeEnabled: boolean;
  subtitlesEnabled: boolean;
}
interface BotState {
  communicationId: string | null;
  connectionStatus: ConnectionStatus;
  config: SystemConfig;
  recordingInProgress: boolean;
  waitingForResponse: boolean;
  audioQueue: string[];
  assistantMessage?: string;
  shouldStopAudio: boolean;
  isPlaying: boolean;
}

const initialState: BotState = {
  communicationId: null,
  connectionStatus: ConnectionStatus.NOT_CONNECTED,
  config: {
    audioEnabled: false,
    textEnabled: false,
    llmModel: "",
    skin: "fullbot",
    proactiveModeEnabled: false,
    subtitlesEnabled: true,
  },
  recordingInProgress: false,
  waitingForResponse: false,
  audioQueue: [],
  assistantMessage: "",
  shouldStopAudio: false,
  isPlaying: false,
};

const botSlice = createSlice({
  name: "bot",
  initialState,
  reducers: {
    setcommunicationId: (state, action: PayloadAction<string>) => {
      state.communicationId = action.payload;
    },
    setConnectionStatus: (state, action: PayloadAction<ConnectionStatus>) => {
      state.connectionStatus = action.payload;
    },
    setConfig: (state, action: PayloadAction<SystemConfig>) => {
      state.config = action.payload;
    },
    setRecordingState: (state, action: PayloadAction<boolean>) => {
      state.recordingInProgress = action.payload;
    },
    setWaitingForResponseState: (state, action: PayloadAction<boolean>) => {
      state.waitingForResponse = action.payload;
    },
    addAudioToQueue: (state, action: PayloadAction<string>) => {
      state.audioQueue = [...state.audioQueue, action.payload];
    },
    removeFirstFromAudioQueue: (state) => {
      state.audioQueue = state.audioQueue.slice(1);
    },
    setAssistantMessage: (state, action: PayloadAction<string>) => {
      state.assistantMessage = action.payload;
    },
    clearAllAudioAndReset: (state) => {
      state.audioQueue = [];
      state.assistantMessage = "";
      state.waitingForResponse = false;
      state.shouldStopAudio = true;
      state.isPlaying = false;
    },
    resetStopAudioFlag: (state) => {
      state.shouldStopAudio = false;
    },
    setIsPlaying: (state, action: PayloadAction<boolean>) => {
      state.isPlaying = action.payload;
    },
  },
});

export const {
  setcommunicationId,
  setConnectionStatus,
  setConfig,
  setRecordingState,
  setWaitingForResponseState,
  addAudioToQueue,
  removeFirstFromAudioQueue,
  setAssistantMessage,
  clearAllAudioAndReset,
  resetStopAudioFlag,
  setIsPlaying,
} = botSlice.actions;
export default botSlice.reducer;
