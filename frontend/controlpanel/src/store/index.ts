import { configureStore } from "@reduxjs/toolkit";

import communicationReducer from "./slices/communicationSlice";
import globalReducer from "./slices/globalSlice";

const store = configureStore({
  reducer: {
    communication: communicationReducer,
    global: globalReducer,
  },
});

export default store;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
