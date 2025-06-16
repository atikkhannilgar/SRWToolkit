import { communicationApi, initializeWebSocket } from "apis";
import { CreateCommunicationResponse } from "apis/communication";
import { AppDispatch } from "store";
import {
  ConnectionStatus,
  setAvailableGenders,
  setAvailableModels,
  setAvailableVoices,
  setBotConnectedStatus,
  setCommunicationId,
  setConfig,
  setConnectionStatus,
  setLoading,
  SystemConfig,
  
} from "store/slices/communicationSlice";
import { doNothing, SnackbarType } from "store/slices/globalSlice";
import { botUrl, LS_COMMUNICATION_ID_KEY, messageToJson, socketReceiveMsgTypes, socketSendMsgTypes } from "utils";

import { showSnackbar } from "./globalActions";

let socket: WebSocket | null = null;

export const fetchControlPanelConfig = () => (dispatch: AppDispatch) => {
  communicationApi.getControlPanelConfig({
    onSuccess: (data) => {
      dispatch(setAvailableModels(data.models));
      dispatch(setAvailableVoices(data.voices));
      dispatch(setAvailableGenders(data.genders));
    },
  });
};

const loadOrCreateCommunicationSuccess = (data: CreateCommunicationResponse) => (dispatch: AppDispatch) => {
  const communicationId = data?.communication_id;
  localStorage.setItem(LS_COMMUNICATION_ID_KEY, communicationId);
  dispatch(setCommunicationId(data.communication_id));
  dispatch(setLoading(false));
  dispatch(initAndHandleWebsocket(communicationId));
};

const loadOrCreateCommunicationFailure = (error: any) => (dispatch: AppDispatch) => {
  dispatch(
    showSnackbar({
      message: error?.response?.data?.detail ?? error?.message ?? "Communication creation failed!",
      type: SnackbarType.ERROR,
    }),
  );
  dispatch(setLoading(false));
  dispatch(setConnectionStatus(ConnectionStatus.NOT_CONNECTED));
};

export const loadOrCreateCommunication = () => async (dispatch: AppDispatch) => {
  dispatch(setLoading(true));
  dispatch(setConnectionStatus(ConnectionStatus.CONNECTING));
  const communicationId = localStorage.getItem(LS_COMMUNICATION_ID_KEY);
  if (communicationId) {
    dispatch(setCommunicationId(communicationId));
    dispatch(initAndHandleWebsocket(communicationId));
    return;
  }
  await communicationApi.createCommunication({
    onSuccess: (data) => dispatch(loadOrCreateCommunicationSuccess(data)),
    onFailure: (error) => dispatch(loadOrCreateCommunicationFailure(error)),
  });
};

export const addNewBot = (communicationId: string) => async (dispatch: AppDispatch) => {
  window.open(`${botUrl}/?communication_id=${communicationId}`);
  dispatch(
    showSnackbar({
      message: "Adding Bot",
      type: SnackbarType.INFO,
    }),
  );
};

const handleConnectionOnOpen = () => {
  initPing(5000);
  return setConnectionStatus(ConnectionStatus.CONNECTED);
};

const handleSocketOnMessage = (event: MessageEvent) => (dispatch: AppDispatch) => {
  const { type, data } = messageToJson(event.data);

  switch (type) {
    // Try to reconnect if invalid communication id
    case socketReceiveMsgTypes.INVALID_COMMUNICATION_ID:
      localStorage.removeItem(LS_COMMUNICATION_ID_KEY);
      dispatch(loadOrCreateCommunication());
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

    case socketReceiveMsgTypes.CLOSE_CONNECTION:
      dispatch(
        showSnackbar({
          message: data.message,
          type: SnackbarType.ERROR,
        }),
      );
      break;

    case socketReceiveMsgTypes.IS_BOT_CONNECTED:
      if (data.message) {
        dispatch(
          showSnackbar({
            message: data.message,
            type: SnackbarType.INFO,
          }),
        );
      }
      dispatch(setBotConnectedStatus(data.value));
      break;

    case socketReceiveMsgTypes.PING_STATE:
      dispatch(setBotConnectedStatus(data.is_bot_connected ?? false));
      break;

    case socketReceiveMsgTypes.NEW_CONTROL_PANEL_DETECTED:
      dispatch(
        showSnackbar({
          message: data.message,
          type: SnackbarType.ERROR,
        }),
      );
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
  socket?.send(JSON.stringify(data));
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
    voiceLanguageCode: data["voice_language_code"],
    voiceGender: data["voice_gender"],
    proactiveModeEnabled: data["proactive_mode_enabled"],
    subtitlesEnabled: data["subtitles_enabled"] ?? true,
  };
};

const makeSocketConfig = (data: SystemConfig): Record<string, any> => {
  return {
    skin: data.skin,
    audio_enabled: data.audioEnabled,
    text_enabled: data.textEnabled,
    llm_model: data.llmModel,
    voice_language_code: data.voiceLanguageCode,
    voice_gender: data.voiceGender,
    proactive_mode_enabled: data.proactiveModeEnabled,
    subtitles_enabled: data.subtitlesEnabled !== undefined ? data.subtitlesEnabled : true,
  };
};

export const socketUpdateConfig = (config: SystemConfig) => {
  handleSocketMessageSend({
    type: socketSendMsgTypes.UPDATE_CONFIG,
    data: {
      config: makeSocketConfig(config),
    },
  });
  return doNothing();
};

export const initPing = (interval = 5000) => {
  setInterval(
    () =>
      handleSocketMessageSend({
        type: socketSendMsgTypes.PING,
      }),
    interval,
  );
};
