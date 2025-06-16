import { ChangeEvent, FC, FormEvent, Fragment, useEffect, useRef, useState } from "react";

import { Skins, skins } from "configs/skins";
import PropTypes from "prop-types";
import { IoMdMic, IoMdSend, IoMdSquare } from "react-icons/io";
import { useDispatch } from "react-redux";
import { AppDispatch } from "store";
import { handleUserTextInput, startSpeechRecognition, stopSpeechRecognition } from "store/actions/botActions";
import { SystemConfig } from "store/slices/botSlice";

interface ControlsProps {
  config: SystemConfig;
  onMicClick(): void;
  onStopClick(): void;
  waitingForResponse: boolean;
  recordingInProgress: boolean;
  isPlaying: boolean;
}

const Controls: FC<ControlsProps> = (props) => {
  const { config, onMicClick, onStopClick, waitingForResponse, recordingInProgress, isPlaying } = props;
  const [userText, setUserText] = useState<string>("");
  const dispatch = useDispatch<AppDispatch>();
  const inputBox = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (config.proactiveModeEnabled) {
      dispatch(startSpeechRecognition());
    } else {
      dispatch(stopSpeechRecognition());
    }
  }, [config.proactiveModeEnabled]);

  const handleUserInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUserText(e.target.value);
  };

  const handleMicClick = () => {
    setUserText("");
    onMicClick();
  };

  const handleStopClick = () => {
    console.log("Stop button clicked");
    onStopClick();
  };

  const handleMessageSend = (e: FormEvent<HTMLFormElement> | null) => {
    setUserText("");
    inputBox?.current?.blur();
    if (e) e.preventDefault();
    if (!userText?.trim()) return;
    dispatch(handleUserTextInput(userText));
  };

  if (!config.audioEnabled && !config.textEnabled) {
    return <Fragment />;
  }

  return (
    <div className="user-controls">
      {recordingInProgress && (
        <div className="uc-recording-wrapper">
          <div className="uc-recording-circle"></div>
          <div className="uc-recording-text">Listening</div>
        </div>
      )}
      <div className="uc-bgwrapper">
        {!waitingForResponse ? (
          <div className="uc-wrapper">
            {/* When audio is playing, only show stop button */}
            {isPlaying ? (
              <button className="uc-button uc-stop-button" onClick={handleStopClick} title="Stop robot speech">
                <IoMdSquare className="uc-icon" />
              </button>
            ) : (
              // When audio is not playing, show normal controls
              <>
                {config.audioEnabled && !config.proactiveModeEnabled ? (
                  <button className="uc-button" onClick={handleMicClick}>
                    <IoMdMic className="uc-icon" />
                  </button>
                ) : (
                  <Fragment />
                )}
                {config.textEnabled && !config.proactiveModeEnabled ? (
                  <form
                    onSubmit={handleMessageSend}
                    className={`uc-textinput-wrapper ${!config.audioEnabled ? "uc-textconfig-audiodisabled" : ""}`}>
                    <input
                      type="text"
                      value={userText}
                      ref={inputBox}
                      placeholder="Type your message..."
                      className="uc-textinput"
                      onChange={handleUserInputChange}
                    />
                    <button type="submit" className="uc-button uc-sendbutton" onClick={() => handleMessageSend(null)}>
                      <IoMdSend className="uc-icon uc-sendicon" />
                    </button>
                  </form>
                ) : (
                  <Fragment />
                )}
              </>
            )}
          </div>
        ) : (
          <div className="loader"></div>
        )}
      </div>
    </div>
  );
};

Controls.propTypes = {
  config: PropTypes.shape({
    skin: PropTypes.oneOf(Object.keys(skins) as (keyof Skins)[]).isRequired,
    audioEnabled: PropTypes.bool.isRequired,
    textEnabled: PropTypes.bool.isRequired,
    llmModel: PropTypes.string.isRequired,
    proactiveModeEnabled: PropTypes.bool.isRequired,
    subtitlesEnabled: PropTypes.bool.isRequired,
  }).isRequired,
  onMicClick: PropTypes.func.isRequired,
  onStopClick: PropTypes.func.isRequired,
  waitingForResponse: PropTypes.bool.isRequired,
  recordingInProgress: PropTypes.bool.isRequired,
  isPlaying: PropTypes.bool.isRequired,
};

export default Controls;
