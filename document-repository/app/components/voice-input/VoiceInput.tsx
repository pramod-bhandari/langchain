"use client";

import { useState, useEffect, useRef } from "react";

// Define types for the Web Speech API
type SpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
};

type SpeechRecognitionEvent = {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
        confidence: number;
      };
    };
  };
};

type SpeechRecognitionErrorEvent = {
  error: string;
  message: string;
};

// Define interface for window with Speech Recognition
interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
}

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

const VoiceInput: React.FC<VoiceInputProps> = ({
  onTranscript,
  disabled = false,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // Check if the browser supports Web Speech API
    if (
      typeof window !== "undefined" &&
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      setIsSupported(false);
      return;
    }

    // Setup Speech Recognition
    const windowWithSpeech = window as WindowWithSpeechRecognition;
    const SpeechRecognitionConstructor =
      windowWithSpeech.SpeechRecognition ||
      windowWithSpeech.webkitSpeechRecognition;

    if (SpeechRecognitionConstructor) {
      recognitionRef.current = new SpeechRecognitionConstructor();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        onTranscript(transcript);
        stopListening();
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error", event.error);
        stopListening();
      };

      recognitionRef.current.onend = () => {
        stopListening();
      };
    }

    return () => {
      if (recognitionRef.current) {
        stopListening();
      }
    };
  }, [onTranscript]);

  const startListening = () => {
    if (!isSupported || disabled || !recognitionRef.current) return;

    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (error) {
      console.error("Error starting speech recognition:", error);
    }
  };

  const stopListening = () => {
    if (!isSupported || !recognitionRef.current) return;

    try {
      recognitionRef.current.stop();
    } catch (error) {
      console.error("Error stopping speech recognition:", error);
    }
    setIsListening(false);
  };

  if (!isSupported) {
    return null; // Don't render anything if not supported
  }

  return (
    <button
      type="button"
      onClick={isListening ? stopListening : startListening}
      disabled={disabled}
      className={`p-3 border border-gray-300 rounded-lg hover:bg-gray-100 ${
        isListening ? "bg-red-100" : ""
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      title={isListening ? "Stop Voice Input" : "Start Voice Input"}
    >
      {isListening ? "🔴" : "🎤"}
    </button>
  );
};

export default VoiceInput;
