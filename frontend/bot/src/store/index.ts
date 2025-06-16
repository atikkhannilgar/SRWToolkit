import { configureStore } from "@reduxjs/toolkit";

import botReducer from "./slices/botSlice";
import globalReducer from "./slices/globalSlice";

const store = configureStore({
  reducer: {
    bot: botReducer,
    global: globalReducer,
  },
});

export default store;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
