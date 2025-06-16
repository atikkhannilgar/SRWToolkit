import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export enum SnackbarType {
  SUCCESS = "SUCCESS",
  WARNING = "WARNING",
  ERROR = "ERROR",
  INFO = "INFO",
}
export interface SnackbarData {
  id?: string;
  message: string;
  type: SnackbarType;
}

interface GlobalState {
  snackbarsList: SnackbarData[];
}

const initialState: GlobalState = {
  snackbarsList: [],
};

const globalSlice = createSlice({
  name: "global",
  initialState,
  reducers: {
    doNothing: () => {}, // eslint-disable-line
    addSnackbar: (state, action: PayloadAction<SnackbarData>) => {
      state.snackbarsList = [action.payload, ...state.snackbarsList];
    },
    removeSnackbar: (state, action: PayloadAction<string>) => {
      state.snackbarsList = state.snackbarsList.filter((snackbar) => snackbar.id != action.payload);
    },
  },
});

export const { addSnackbar, removeSnackbar, doNothing } = globalSlice.actions;
export default globalSlice.reducer;
