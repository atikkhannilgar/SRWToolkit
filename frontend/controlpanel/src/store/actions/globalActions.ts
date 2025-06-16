import { AppDispatch } from "store";
import { addSnackbar, removeSnackbar, SnackbarData } from "store/slices/globalSlice";
import { SNACKBAR_DURATION } from "utils";
import { v4 as uuidv4 } from "uuid";

export const showSnackbar = (snackbarData: SnackbarData) => (dispatch: AppDispatch) => {
  const snackId = uuidv4();
  dispatch(
    addSnackbar({
      ...snackbarData,
      id: snackId,
    }),
  );
  // close snackbar after SNACKBAR_DURATION milliseconds
  setTimeout(() => {
    dispatch(removeSnackbar(snackId));
  }, SNACKBAR_DURATION);
};

export const hideSnackbar = (snackId: string) => {
  return removeSnackbar(snackId);
};
