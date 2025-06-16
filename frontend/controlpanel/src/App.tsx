import { FC, useEffect, useRef } from "react";

import ControlPanel from "components/ControlPanel";
import Layout from "components/Layout";
import { useDispatch } from "react-redux";
import { AppDispatch } from "store";
import { fetchControlPanelConfig, loadOrCreateCommunication } from "store/actions/communicationActions";
import "./styles/global.scss";

const App: FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const initiated = useRef(false);

  useEffect(() => {
    if (!initiated.current) {
      initiated.current = true;
      dispatch(loadOrCreateCommunication());
      dispatch(fetchControlPanelConfig());
    }
  }, []);

  return (
    <Layout>
      <ControlPanel />
    </Layout>
  );
};

export default App;
