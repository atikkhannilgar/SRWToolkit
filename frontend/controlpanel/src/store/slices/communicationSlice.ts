import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Skins } from "utils";

export enum ConnectionStatus {
  CONNECTING = "CONNECTING",
  CONNECTED = "CONNECTED",
  NOT_CONNECTED = "NOT_CONNECTED",
}

interface CommunicationState {
  isBotConnected: boolean;
  communicationId: string | null;
  loadingState: boolean;
  connectionStatus: ConnectionStatus;
  config: SystemConfig;
  availableModels: string[];
  availableVoices: string[];
  availableGenders: string[];
}

export interface SystemConfig {
  skin: Skins;
  audioEnabled: boolean;
  textEnabled: boolean;
  llmModel: string;
  voiceLanguageCode: string;
  voiceGender: string;
  proactiveModeEnabled: boolean;
  customPromptSuffix?: string;
  subtitlesEnabled: boolean;
}

const initialState: CommunicationState = {
  isBotConnected: false,
  communicationId: null,
  loadingState: false,
  connectionStatus: ConnectionStatus.NOT_CONNECTED,
  config: {
    skin: Skins.fullbot,
    audioEnabled: true,
    textEnabled: true,
    llmModel: "",
    voiceLanguageCode: "en-US",
    voiceGender: "MALE",
    proactiveModeEnabled: false,
    subtitlesEnabled: true,
  },
  availableModels: [],
  availableVoices: [],
  availableGenders: [],
};

const communicationSlice = createSlice({
  name: "communication",
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loadingState = action.payload;
    },
    setCommunicationId: (state, action: PayloadAction<string>) => {
      state.communicationId = action.payload;
    },
    setBotConnectedStatus: (state, action: PayloadAction<boolean>) => {
      state.isBotConnected = action.payload;
    },
    setConnectionStatus: (state, action: PayloadAction<ConnectionStatus>) => {
      state.connectionStatus = action.payload;
    },
    setConfig: (state, action: PayloadAction<SystemConfig>) => {
      state.config = action.payload;
    },
    setAvailableModels: (state, action: PayloadAction<string[]>) => {
      state.availableModels = action.payload;
    },
    setAvailableVoices: (state, action: PayloadAction<string[]>) => {
      state.availableVoices = action.payload;
    },
    setAvailableGenders: (state, action: PayloadAction<string[]>) => {
      state.availableGenders = action.payload;
    },
  },
});

export const {
  setLoading,
  setCommunicationId,
  setBotConnectedStatus,
  setConnectionStatus,
  setConfig,
  setAvailableModels,
  setAvailableVoices,
  setAvailableGenders,
} = communicationSlice.actions;
export default communicationSlice.reducer;
