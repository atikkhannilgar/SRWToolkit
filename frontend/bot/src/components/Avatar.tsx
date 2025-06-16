import { FC, useEffect, useState, useRef } from "react";

import { skins } from "configs/skins";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "store";
import { startSpeechRecognition } from "store/actions/botActions";
import { removeFirstFromAudioQueue, resetStopAudioFlag, setIsPlaying } from "store/slices/botSlice";

const Avatar: FC = () => {
  const [mouthState, setMouthState] = useState<string>("closed");
  const { config, audioQueue, assistantMessage, shouldStopAudio, isPlaying } = useSelector((state: RootState) => state.bot);
  const dispatch = useDispatch<AppDispatch>();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const shouldStopRef = useRef<boolean>(false); // Flag to stop audio immediately

  const botSkin = skins[config.skin] ?? skins.fullbot;

  // Function to stop all audio and reset avatar state
  const stopAllAudio = () => {
    console.log("stopAllAudio called"); // Debug log
    shouldStopRef.current = true; // Set stop flag
    
    // AGGRESSIVE: Stop ALL audio elements on the page
    const allAudioElements = document.querySelectorAll('audio');
    console.log("Found audio elements:", allAudioElements.length); // Debug log
    allAudioElements.forEach((audio, index) => {
      console.log(`Stopping audio element ${index}:`, audio.src); // Debug log
      audio.pause();
      audio.currentTime = 0;
      audio.src = "";
    });
    
    // Stop current audio more aggressively
    if (audioRef.current) {
      console.log("Stopping audio:", audioRef.current.src); // Debug log
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = ""; // Clear the source
      audioRef.current.load(); // Reset the audio element
      audioRef.current.removeEventListener('ended', () => {});
      audioRef.current.removeEventListener('error', () => {});
      audioRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      console.log("Closing audio context"); // Debug log
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
    
    // Reset avatar state
    dispatch(setIsPlaying(false));
    setMouthState("open-10");
    
    console.log("Avatar state reset"); // Debug log
  };

  // Watch for shouldStopAudio flag changes
  useEffect(() => {
    if (shouldStopAudio) {
      console.log("shouldStopAudio flag detected, stopping audio"); // Debug log
      stopAllAudio();
      // Reset the flag
      dispatch(resetStopAudioFlag());
    }
  }, [shouldStopAudio, dispatch]);

  // Listen for stop audio events (keeping as backup)
  useEffect(() => {
    const handleStopAudio = () => {
      stopAllAudio();
    };

    window.addEventListener('stopAudio', handleStopAudio);
    return () => {
      window.removeEventListener('stopAudio', handleStopAudio);
    };
  }, []);

  useEffect(() => {
    shouldStopRef.current = false; // Reset stop flag when new audio comes
    if (!isPlaying && audioQueue.length > 0) {
      playNAudio();
    }
    if (!isPlaying && config.proactiveModeEnabled && !audioQueue.length) {
      dispatch(startSpeechRecognition());
    }
    // eslint-disable-next-line
  }, [audioQueue, isPlaying, dispatch]);

  // Updated playNAudio function with Redux isPlaying
  const playNAudio = async () => {
    if (!audioQueue.length || shouldStopRef.current) return;
    const nextUrl = audioQueue[0];
    console.log("Starting to play audio:", nextUrl); // Debug log
    
    try {
      const audioContext = new window.AudioContext();
      audioContextRef.current = audioContext;
      await audioContext.resume();
      
      if (shouldStopRef.current) {
        console.log("Stop requested before audio setup"); // Debug log
        audioContext.close();
        return;
      }
      
      const audio = new Audio();
      audioRef.current = audio;
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      audio.src = nextUrl;
      audio.autoplay = true;
      audio.preload = "auto";
      dispatch(setIsPlaying(true)); // Update Redux state
      
      let previousAmplitude = 0;
      const updateMouthState = () => {
        if (shouldStopRef.current) {
          console.log("Stop requested during playback"); // Debug log
          audio.pause();
          dispatch(setIsPlaying(false));
          setMouthState("open-10");
          return;
        }
        
        analyser.getByteFrequencyData(dataArray);
        const sliceStart = Math.floor(dataArray.length * 0.2);
        const sliceEnd = Math.floor(dataArray.length * 0.7);
        const relevantData = dataArray.slice(sliceStart, sliceEnd);
        const amplitude = relevantData.reduce((a, b) => a + b, 0) / relevantData.length;
        const smoothedAmplitude = amplitude * 0.7 + previousAmplitude * 0.3;
        previousAmplitude = smoothedAmplitude;
        const scaledAmplitude = Math.min(Math.max((smoothedAmplitude / 255) * 100, 0) * 5, 100);
        let mState = "open-10";
        if (scaledAmplitude > 90) mState = "open-100";
        else if (scaledAmplitude > 80) mState = "open-90";
        else if (scaledAmplitude > 70) mState = "open-80";
        else if (scaledAmplitude > 60) mState = "open-70";
        else if (scaledAmplitude > 50) mState = "open-60";
        else if (scaledAmplitude > 40) mState = "open-50";
        else if (scaledAmplitude > 30) mState = "open-40";
        else if (scaledAmplitude > 20) mState = "open-30";
        else if (scaledAmplitude > 10) mState = "open-20";
        if (mouthState !== mState) {
          setMouthState(mState);
        }
        if (!audio.paused && !audio.ended && !shouldStopRef.current) {
          requestAnimationFrame(updateMouthState);
        } else {
          setMouthState("open-10");
        }
      };
      
      audio.onplay = () => {
        if (!shouldStopRef.current) {
          updateMouthState();
        }
      };
      
      audio.onended = () => {
        console.log("Audio ended normally"); // Debug log
        dispatch(setIsPlaying(false));
        setMouthState("open-10");
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        dispatch(removeFirstFromAudioQueue());
      };
      
      audio.onerror = () => {
        console.error("Error playing audio:", nextUrl);
        dispatch(setIsPlaying(false));
        setMouthState("open-10");
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        dispatch(removeFirstFromAudioQueue());
      };
      
    } catch (error) {
      console.error("Error setting up audio:", error);
      dispatch(setIsPlaying(false));
    }
  };

  return (
    <div className="avatar-wrapper">
      <div className={`avatar ${botSkin.customClassName}`}>
        <img src={botSkin.image} alt="Avatar Face" className="avatar-body" />
        <div className="avatar-face">
          <div className="avatar-eyes avatar-eyes-normal">
            <div className="avatar-eye avatar-eye-left"></div>
            <div className="avatar-eye avatar-eye-right"></div>
          </div>
          <div className={`avatar-mouth avatar-mouth-${mouthState}`}></div>
        </div>
      </div>
    </div>
  );
};

export default Avatar;
