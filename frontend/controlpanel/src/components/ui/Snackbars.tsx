import { FC } from "react";

import PropTypes from "prop-types";
import { IconType } from "react-icons";
import { MdCheckCircle, MdClose, MdError, MdInfo, MdWarning } from "react-icons/md";
import { SnackbarData, SnackbarType } from "store/slices/globalSlice";

interface SnackbarsProps {
  snackbarsList: SnackbarData[];
  hideSnackbar(snackId: string): void;
}

const getSnackbarData = (type: SnackbarType = SnackbarType.INFO): { icon: IconType; typeId: string } => {
  switch (type) {
    case SnackbarType.SUCCESS:
      return { icon: MdCheckCircle, typeId: "success" };

    case SnackbarType.WARNING:
      return { icon: MdWarning, typeId: "warning" };

    case SnackbarType.ERROR:
      return { icon: MdError, typeId: "error" };

    case SnackbarType.INFO:
      return { icon: MdInfo, typeId: "info" };

    default:
      return { icon: MdInfo, typeId: "info" };
  }
};

const Snackbars: FC<SnackbarsProps> = (props) => {
  const { snackbarsList, hideSnackbar } = props;

  const handleCloseSnackbar = (snackId = "") => {
    hideSnackbar(snackId);
  };

  return (
    <div className="snacklist-wrapper">
      {snackbarsList.map((snackbar) => {
        const { id, message, type } = snackbar;
        const { icon: SnackIcon, typeId } = getSnackbarData(type);

        return (
          <div key={id} className={`lay-snackbar lay-snackbar-${typeId}`}>
            <div className="lay-snack-contents">
              <div className="lay-snack-left">
                <div className="ls-icon-wrapper">
                  <SnackIcon className="ls-icon" />
                </div>
                <div className="ls-message-wrapper">
                  <p className="ls-message">{message}</p>
                </div>
              </div>
              <button className="ls-close-btn" onClick={() => handleCloseSnackbar(id)}>
                <MdClose className="ls-close-icon" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

Snackbars.propTypes = {
  snackbarsList: PropTypes.array.isRequired,
  hideSnackbar: PropTypes.func.isRequired,
};

export default Snackbars;
