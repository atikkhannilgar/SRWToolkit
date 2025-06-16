import { apiRequest, RequestMethod, RequestParams } from "apis";

export interface CreateCommunicationResponse {
  communication_id: string;
}

export const createCommunication = async (params: RequestParams<CreateCommunicationResponse>) => {
  await apiRequest<CreateCommunicationResponse>({
    method: RequestMethod.POST,
    path: "/api/create-communication",
    onSuccess: params.onSuccess,
    onFailure: params.onFailure,
  });
};

export interface ControlPanelConfigResponse {
  models: string[];
  voices: string[];
  genders: string[];
}

export const getControlPanelConfig = async (params: RequestParams<ControlPanelConfigResponse>) => {
  await apiRequest<ControlPanelConfigResponse>({
    method: RequestMethod.GET,
    path: "/api/controlpanel-config",
    onSuccess: params.onSuccess,
    onFailure: params.onFailure,
  });
};
