import axios, { AxiosResponse } from "axios";
import { serverUrl } from "utils";

type OnSuccess<T> = (data: T) => void;
type OnFailure = (error: any) => void;

enum RequestMethod {
  GET = "GET",
  PUT = "PUT",
  POST = "POST",
  DELETE = "DELETE",
}

interface ApiRequestParams<T> {
  method: RequestMethod;
  path: string;
  onSuccess: OnSuccess<T>;
  onFailure?: OnFailure;
  data?: any;
}

export interface RequestParams<T> {
  onSuccess: OnSuccess<T>;
  onFailure?: OnFailure;
}

const apiRequest = async <T>(params: ApiRequestParams<T>) => {
  const { method, data, path, onSuccess, onFailure } = params;
  try {
    const response: AxiosResponse<T> = await axios({
      method,
      url: `${serverUrl}${path}`,
      data,
    });
    if (response.status >= 200 && response.status < 300) {
      onSuccess(response.data);
      return;
    }
  } catch (error) {
    if (onFailure) {
      onFailure(error);
    }
  }
};

const initializeWebSocket = (
  communicationId: string,
  onOpen: () => any,
  onMessage: (event: MessageEvent) => any,
  onError: (event: Event) => any,
  onClose: (event: CloseEvent) => any,
): WebSocket => {
  const socket = new WebSocket(`${serverUrl}/api/ws/communication/${communicationId}?client_identifier=controlpanel`);
  socket.onopen = onOpen;
  socket.onmessage = onMessage;
  socket.onerror = onError;
  socket.onclose = onClose;
  return socket;
};

export * as communicationApi from "./communication";
export { apiRequest, initializeWebSocket, RequestMethod };
