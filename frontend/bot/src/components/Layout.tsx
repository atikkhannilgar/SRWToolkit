import { FC, useState, useEffect, PropsWithChildren, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "store";
import { handleMicrophoneClick } from "store/actions/botActions";
import { hideSnackbar } from "store/actions/globalActions";
import { ConnectionStatus, setConfig, clearAllAudioAndReset } from "store/slices/botSlice";
import Controls from "./ui/Controls";
import Snackbars from "./ui/Snackbars";
import Avatar from "./Avatar";

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

const Layout: FC<PropsWithChildren> = ({ children }) => {
  const { snackbarsList } = useSelector((state: RootState) => state.global);
  const { connectionStatus, config, waitingForResponse, recordingInProgress, assistantMessage, audioQueue, isPlaying } = useSelector(
    (state: RootState) => state.bot,
  );
  const dispatch = useDispatch<AppDispatch>();

  // Streaming effect for assistant message
  const [streamedText, setStreamedText] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const currentSegmentRef = useRef<{ start: number; end: number } | null>(null);
  const [textAlign, setTextAlign] = useState<'center' | 'left'>("center");
  const [lastWordShown, setLastWordShown] = useState(false);

  // Cancel animation frame
  const cancelAnimation = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  // Clear subtitles and reset states
  const clearSubtitles = () => {
    setStreamedText("");
    setTextAlign("center");
    setLastWordShown(false);
    currentSegmentRef.current = null;
  };

  useEffect(() => {
    if (!assistantMessage || !audioQueue.length || recordingInProgress || waitingForResponse) {
      cancelAnimation();
      clearSubtitles();
      return;
    }

    const audio = new Audio(audioQueue[0]);
    audioRef.current = audio;
    let audioDone = false;
    
    audio.onloadedmetadata = () => {
      const duration = audio.duration || 2;
      const words = assistantMessage.split(/(\s+)/); // keep spaces
      const totalWords = words.length;
      
      clearSubtitles();
      
      // Start playing audio
      audio.play();
      
      // Function to update text based on audio position
      const updateSubtitles = () => {
        if (!audio.paused && !audioDone) {
          // Calculate current position in text based on audio progress
          const progress = audio.currentTime / duration;
          const currentWordIndex = Math.floor(progress * totalWords);
          
          // For very short phrases (3 words or less), show the entire phrase
          if (totalWords <= 3) {
            setStreamedText(assistantMessage);
            return;
          }
          
          // Check if we need to start a new segment
          if (!currentSegmentRef.current || currentWordIndex > currentSegmentRef.current.end) {
            // Clear previous segment
            setStreamedText("");
            
            // Calculate new segment boundaries
            const segmentStart = currentWordIndex;
            const segmentEnd = Math.min(
              // Look ahead to find natural break (period, question mark, exclamation)
              words.slice(segmentStart).findIndex((w) => /[.!?]/.test(w)) + segmentStart,
              // If no natural break, use next 5 words or end of text
              Math.min(segmentStart + 5, totalWords - 1)
            );
            
            currentSegmentRef.current = {
              start: segmentStart,
              end: segmentEnd > segmentStart ? segmentEnd : totalWords - 1
            };
            
            // Show new segment
            const display = words.slice(currentSegmentRef.current.start, currentWordIndex + 1).join("");
            if (display.trim()) {
              setStreamedText(display);
            }
          } else {
            // Update current segment
            const display = words.slice(currentSegmentRef.current.start, currentWordIndex + 1).join("");
            if (display.trim()) {
              setStreamedText(display);
            }
          }
          
          // Continue animation
          animationFrameRef.current = requestAnimationFrame(updateSubtitles);
        }
      };
      
      // Start animation
      animationFrameRef.current = requestAnimationFrame(updateSubtitles);
      
      // Handle audio completion
      audio.onended = () => {
        audioDone = true;
        cancelAnimation();
        // For short phrases, clear immediately
        if (totalWords <= 3) {
          clearSubtitles();
          return;
        }
        // Show final segment if any words remain
        if (currentSegmentRef.current) {
          const finalText = words.slice(currentSegmentRef.current.start).join("");
          if (finalText.trim()) {
            setStreamedText(finalText);
            setTimeout(clearSubtitles, 300);
          } else {
            clearSubtitles();
          }
        } else {
          clearSubtitles();
        }
      };
    };
    
    audio.load();
    
    return () => {
      cancelAnimation();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [assistantMessage, audioQueue, recordingInProgress, waitingForResponse]);

  // Function to stop robot speech immediately
  const handleStopSpeech = () => {
    console.log("handleStopSpeech called"); // Debug log
    
    // Cancel any ongoing animation
    cancelAnimation();
    
    // Stop and clear current audio from Layout
    if (audioRef.current) {
      console.log("Stopping Layout audio"); // Debug log
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    
    // Clear all audio and reset state - this will set shouldStopAudio=true
    console.log("Dispatching clearAllAudioAndReset"); // Debug log
    dispatch(clearAllAudioAndReset());
    
    // Clear subtitles immediately
    clearSubtitles();
  };

  const handleCloseSnackbar = (snackId = "") => {
    dispatch(hideSnackbar(snackId));
  };

  const handleMicClick = () => {
    dispatch(handleMicrophoneClick());
  };

  const handleSubtitlesToggle = () => {
    dispatch(setConfig({
      ...config,
      subtitlesEnabled: !config.subtitlesEnabled,
    }));
  };

  const statusMeta = getConnectionStatusMeta(connectionStatus);

  return (
    <div className="layout-wrapper">
      {/* Communicatino Info */}
      <div className="communication-info">
        <div className="detail-wrapper">
          <div className="detail-value detail-value-status">
            <div className={`status-color status-${statusMeta.id}`}></div>
          </div>
        </div>
      </div>
      {/* Snackbars */}
      <Snackbars snackbarsList={snackbarsList} hideSnackbar={handleCloseSnackbar} />
      {/* Actual Content */}
      <div className="layout">
        <Avatar />
        {/* Only show the assistant message if streamedText is non-empty and subtitles are enabled */}
        {config.subtitlesEnabled && streamedText && (
          <div className="assistant-message mt-4 p-4 bg-white rounded shadow text-lg max-w-xl mx-auto">
            <div
              className="whitespace-pre-line mt-1"
              style={{ color: '#5dbe6b', textAlign }}
            >
              {streamedText}
            </div>
          </div>
        )}
        {children}
      </div>
      {/* User Controls */}
      <Controls
        config={config}
        onMicClick={handleMicClick}
        onStopClick={handleStopSpeech}
        waitingForResponse={waitingForResponse}
        recordingInProgress={recordingInProgress}
        isPlaying={isPlaying}
      />
    </div>
  );
};

export default Layout;

