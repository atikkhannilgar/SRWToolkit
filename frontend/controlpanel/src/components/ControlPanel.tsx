import { ChangeEvent, FC, useState, useEffect } from "react";
import { IoMdMic, IoMdPersonAdd } from "react-icons/io";
import { MdKeyboard, MdSettingsSuggest, MdSubtitles } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "store";
import { addNewBot, socketUpdateConfig } from "store/actions/communicationActions";
import { SkinData, skinsList } from "utils";


const ControlPanel: FC = () => {
  const { isBotConnected, communicationId, config, availableModels, availableVoices, availableGenders } = useSelector(
    (state: RootState) => state.communication,
  );
  const dispatch = useDispatch<AppDispatch>();

  const handleAddBot = () => {
    if (communicationId) dispatch(addNewBot(communicationId));
  };

  const handleMicClick = () => {
    dispatch(
      socketUpdateConfig({
        ...config,
        audioEnabled: !config.audioEnabled,
      }),
    );
  };

  const handleKeyboardClick = () => {
    dispatch(
      socketUpdateConfig({
        ...config,
        textEnabled: !config.textEnabled,
      }),
    );
  };

  const handleSkinChange = (skinData: SkinData) => {
    dispatch(
      socketUpdateConfig({
        ...config,
        skin: skinData.id,
      }),
    );
  };

  const handleSelectInput = (e: ChangeEvent<HTMLSelectElement>) => {
    const possibleFields = ["llmModel", "voiceLanguageCode", "voiceGender"];
    if (!possibleFields.includes(e.target.name) || !e.target.value) return;
    dispatch(
      socketUpdateConfig({
        ...config,
        [e.target.name]: e.target.value,
      }),
    );
  };

  const handleProactiveModeClick = () => {
    dispatch(
      socketUpdateConfig({
        ...config,
        proactiveModeEnabled: !config.proactiveModeEnabled,
      }),
    );
  };

  const [customPrompt, setCustomPrompt] = useState("");
  const [userInput, setUserInput] = useState("");
  const [promptResponse, setPromptResponse] = useState("");

  useEffect(() => {
    if (config?.customPromptSuffix) {
      setCustomPrompt(config.customPromptSuffix);
    }
  }, [config]);

  const handlePromptSubmit = async () => {
    if (!customPrompt.trim()) {
      setPromptResponse("❌ Please enter a custom prompt");
      return;
    }

    setPromptResponse("⏳ Saving custom prompt...");
  
    const suffixBody = {
      communication_id: communicationId,
      suffix: customPrompt,
    };

    try {
      // Save suffix to backend
      const suffixRes = await fetch("http://localhost:1339/api/set-prompt-suffix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(suffixBody)
      });
  
      let suffixJson;
      try {
        suffixJson = await suffixRes.json();
      } catch (err) {
        console.error("Failed to parse suffix response:", err);
        setPromptResponse("❌ Invalid response from server");
        return;
      }

      if (suffixJson?.message !== "Prompt suffix updated successfully") {
        setPromptResponse(`❌ Failed to save prompt: ${JSON.stringify(suffixJson)}`);
        return;
      }
  
      // Update Redux config
      dispatch(
        socketUpdateConfig({
          ...config,
          customPromptSuffix: customPrompt,
        })
      );
  
      // Clear chat history in backend
      await fetch("http://localhost:1339/api/clear-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communication_id: communicationId })
      });
  
      setPromptResponse("✅ Custom prompt saved successfully! This will be used for all future conversations.");
    } catch (err: any) {
      console.error("Failed to save prompt", err);
      setPromptResponse(`❌ Error: ${err?.message || 'Unknown error occurred'}`);
    }
  };

  useEffect(() => {
    if (!config.llmModel && availableModels.length > 0) {
      dispatch(
        socketUpdateConfig({
          ...config,
          llmModel: availableModels[0]
        })
      );
    }
  }, [availableModels, config.llmModel]);

  const handleSubtitlesToggle = () => {
    dispatch(
      socketUpdateConfig({
        ...config,
        subtitlesEnabled: !config.subtitlesEnabled,
      }),
    );
  };

  return (
    <div className="cp-wrapper">
      <div className="cp-header">
        <div className="cph-name-wrapper">
          <MdSettingsSuggest className="cph-icon" />
          <div className="cph-name">Control Panel</div>
        </div>
        <div className="cph-status-wrapper">
          <div className="cph-bot-status">
            <div
              className={`cph-bot-connectstatus ${isBotConnected ? "cph-bot-status-success" : "cph-bot-status-failure"}`}></div>
            <p className="cph-bot-counttext">{!isBotConnected && "No"} Bot Connected</p>
          </div>
          <button
            className="cph-addbot-button"
            disabled={isBotConnected}
            title={isBotConnected ? "Bot already connected" : ""}
            onClick={handleAddBot}>
            <IoMdPersonAdd className="cph-addicon" />
            <p className="cph-addtext">Connect Bot</p>
          </button>
        </div>
      </div>
      <div className="cp-body">
        <div className="cpb-section">
          <div className="cpb-header">Select Skin</div>
          <div className="cpb-content">
            <div className="cpb-skins-container">
              {skinsList.map((skinData) => {
                const { id, name, url } = skinData;

                return (
                  <div
                    key={id}
                    className={`skin-wrapper ${config.skin === id ? "skin-wrapper-selected" : ""}`}
                    onClick={() => handleSkinChange(skinData)}>
                    <img src={url} alt={name} className="skin-img" />
                    <span className="skin-name">{name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="cpb-section">
          <div className="cpb-header">
            Custom Prompt
          </div>
          <div className="cpb-content space-y-2">
            <div>
              <textarea
                className="w-full border p-2 rounded min-h-[200px] text-base"
                rows={8}
                placeholder="Enter your custom prompt..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
              />
            </div>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded"
              onClick={handlePromptSubmit}
            >
              Save Custom Prompt
            </button>
            {promptResponse && (
              <div className="mt-2 p-2 border rounded bg-gray-50">
                <p className="mt-1 whitespace-pre-line">{promptResponse}</p>
              </div>
            )}
          </div>
        </div>
        <div className="cpb-section">
          <div className="cpb-header">Bot Controls</div>
          <div className="cpb-content">
            <div className="cpb-controls-section">
              <div className={`cpb-control ${!config.audioEnabled ? "cpb-control-disabled" : ""}`}>
                <button onClick={handleMicClick} className="cpb-icon-button">
                  <IoMdMic className="cpb-control-icon" />
                </button>
                <span className="cpb-control-name">Voice Chat</span>
                <span className="cpb-control-state">{config.audioEnabled ? "On" : "Off"}</span>
              </div>
              <div className={`cpb-control ${!config.textEnabled ? "cpb-control-disabled" : ""}`}>
                <button onClick={handleKeyboardClick} className="cpb-icon-button">
                  <MdKeyboard className="cpb-control-icon" />
                </button>
                <span className="cpb-control-name">Text Chat</span>
                <span className="cpb-control-state">{config.textEnabled ? "On" : "Off"}</span>
              </div>
              <div className={`cpb-control ${!config.subtitlesEnabled ? "cpb-control-disabled" : ""}`}>
                <button onClick={handleSubtitlesToggle} className="cpb-icon-button">
                  <MdSubtitles className="cpb-control-icon" />
                </button>
                <span className="cpb-control-name">Subtitles</span>
                <span className="cpb-control-state">{config.subtitlesEnabled ? "On" : "Off"}</span>
              </div>
              <div className="cpb-control-2wrapper">
                <div className="cpb-control-2">
                  <label className="cpb-select-label" htmlFor="model-select">
                    Select Model:
                  </label>
                  <select
                    name="llmModel"
                    id="model-select"
                    className="cpb-select"
                    value={config.llmModel}
                    onChange={handleSelectInput}>
                    <option className="cpb-dropdown" value="">
                      --Please choose an option--
                    </option>
                    {availableModels.map((model, idx) => (
                      <option className="cpb-dropdown" key={idx} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="cpb-control-2">
                  <label className="cpb-select-label" htmlFor="voice-select">
                    Select Voice Language Code:
                  </label>
                  <select
                    name="voiceLanguageCode"
                    id="voice-select"
                    className="cpb-select"
                    value={config.voiceLanguageCode}
                    onChange={handleSelectInput}>
                    <option className="cpb-dropdown" value="">
                      --Please choose an option--
                    </option>
                    {availableVoices.map((voice, idx) => (
                      <option key={idx} className="cpb-dropdown" value={voice}>
                        {voice}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="cpb-control-2">
                  <label className="cpb-select-label" htmlFor="voice-select">
                    Select Voice Gender:
                  </label>
                  <select
                    name="voiceGender"
                    id="voice-select"
                    className="cpb-select"
                    value={config.voiceGender}
                    onChange={handleSelectInput}>
                    <option className="cpb-dropdown" value="">
                      --Please choose an option--
                    </option>
                    {availableGenders.map((gender, idx) => (
                      <option key={idx} className="cpb-dropdown" value={gender}>
                        {gender}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="cpb-section">
          <div className="cpb-header">Proactive Mode</div>
          <div className="cpb-content">
            <button className="cpb-proactive-button" onClick={handleProactiveModeClick}>
              {config.proactiveModeEnabled ? "Disable" : "Enable"}
            </button>
            <div className="text-gray-600 mt-2">
              Say "Hey Bot" to activate the robot.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
