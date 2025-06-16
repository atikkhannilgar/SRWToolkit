import { FC, ReactNode } from "react";

import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "store";
import { hideSnackbar } from "store/actions/globalActions";
import { ConnectionStatus } from "store/slices/communicationSlice";

import Snackbars from "./ui/Snackbars";

interface LayoutProps {
  children: ReactNode;
}

interface ConnectionStatusMeta {
  id: string;
  text: string;
}

const getConnectionStatusMeta = (status: ConnectionStatus): ConnectionStatusMeta => {
  switch (status) {
    case ConnectionStatus.CONNECTED:
      return {
        id: "connected",
        text: "Connected",
      };

    case ConnectionStatus.CONNECTING:
      return {
        id: "connecting",
        text: "Attempting To Connect...",
      };

    case ConnectionStatus.NOT_CONNECTED:
      return {
        id: "notconnected",
        text: "Not Connected",
      };
  }
};

const Layout: FC<LayoutProps> = (props) => {
  const { children } = props;

  const { snackbarsList } = useSelector((state: RootState) => state.global);
  const { connectionStatus, communicationId } = useSelector((state: RootState) => state.communication);
  const dispatch = useDispatch<AppDispatch>();

  const handleCloseSnackbar = (snackId = "") => {
    dispatch(hideSnackbar(snackId));
  };

  const statusMeta = getConnectionStatusMeta(connectionStatus);

  return (
    <div className="layout-wrapper">
      <div className="communication-info">
        <div className="detail-wrapper">
          <span className="detail-name">Status: </span>
          <div className="detail-value detail-value-status">
            <div className="status-value">{statusMeta.text}</div>
            <div className={`status-color status-${statusMeta.id}`}></div>
          </div>
        </div>
        <div className="detail-wrapper">
          <span className="detail-name">Communication Id: </span>
          <span className="detail-value">{communicationId ?? "--"}</span>
        </div>
      </div>
      <Snackbars snackbarsList={snackbarsList} hideSnackbar={handleCloseSnackbar} />
      <div className="layout">{children}</div>
    </div>
  );
};

Layout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default Layout;
