import { FC, useEffect, useRef } from "react";

import Avatar from "components/Avatar";
import Layout from "components/Layout";
import { useDispatch } from "react-redux";
import { AppDispatch } from "store";
import { loadCommunication } from "store/actions/botActions";

import "styles/global.scss";

const App: FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const initiated = useRef(false);

  useEffect(() => {
    if (!initiated.current) {
      initiated.current = true;
      dispatch(loadCommunication());
    }
  }, []);

  return (
    <Layout>
      <Avatar />
    </Layout>
  );
};

export default App;
