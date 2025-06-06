"use client";

import { useState, useEffect, useRef } from "react";
import {
  EnhancedVoiceService,
  RecognitionOptions,
  ResultHandlers,
  SupportedLanguage,
  VoiceCommand,
} from "@/app/lib/voice/enhancedVoiceService";
import { Mic, MicOff, Volume2, Check, Globe2, Settings, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Switch,
  Slider,
  Label,
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/components/ui";

interface EnhancedVoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  commands?: VoiceCommand[];
  continuousModeDefault?: boolean;
  interimResultsDefault?: boolean;
  languageDefault?: string;
  size?: "sm" | "md" | "lg";
  onCommandDetected?: (command: string, transcript: string) => void;
  visualFeedback?: boolean;
}

export default function EnhancedVoiceInput({
  onTranscript,
  disabled = false,
  placeholder = "Say something...",
  commands = [],
  continuousModeDefault = false,
  interimResultsDefault = true,
  languageDefault = "en-US",
  size = "md",
  onCommandDetected,
  visualFeedback = true,
}: EnhancedVoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [confidenceLevel, setConfidenceLevel] = useState(0);
  const [languages, setLanguages] = useState<SupportedLanguage[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState(languageDefault);
  const [continuousMode, setContinuousMode] = useState(continuousModeDefault);
  const [interimResults, setInterimResults] = useState(interimResultsDefault);
  const [noiseThreshold, setNoiseThreshold] = useState(0.5);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const voiceService = useRef<EnhancedVoiceService | null>(null);

  // Initialize voice service
  useEffect(() => {
    voiceService.current = EnhancedVoiceService.getInstance();
    setIsSupported(voiceService.current.isSpeechRecognitionSupported());

    // Load supported languages
    if (voiceService.current.isSpeechRecognitionSupported()) {
      setLanguages(voiceService.current.getSupportedLanguages());
    }

    // Register commands if provided
    if (commands.length > 0 && voiceService.current) {
      voiceService.current.registerCommands(commands);
    }

    // Set noise threshold
    if (voiceService.current) {
      voiceService.current.setNoiseThreshold(noiseThreshold);
    }

    return () => {
      // Clean up
      if (voiceService.current && isListening) {
        voiceService.current.stopListening();
      }
    };
  }, [commands, noiseThreshold]);

  // Update noise threshold when slider changes
  useEffect(() => {
    if (voiceService.current) {
      voiceService.current.setNoiseThreshold(noiseThreshold);
    }
  }, [noiseThreshold]);

  const handleVoiceToggle = () => {
    if (!isSupported || disabled) return;

    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = () => {
    if (!voiceService.current) return;

    const options: RecognitionOptions = {
      continuous: continuousMode,
      interimResults: interimResults,
      language: selectedLanguage,
      maxAlternatives: 1,
    };

    const handlers: ResultHandlers = {
      onInterimResult: (transcript, confidence) => {
        setInterimTranscript(transcript);
        setConfidenceLevel(confidence);
      },
      onFinalResult: (transcript, confidence) => {
        setInterimTranscript("");
        setConfidenceLevel(confidence);
        onTranscript(transcript);

        // In non-continuous mode, we stop listening after getting a final result
        if (!continuousMode && voiceService.current) {
          voiceService.current.stopListening();
        }
      },
      onError: (error) => {
        console.error("Speech recognition error:", error);
        setInterimTranscript("");
      },
      onStateChange: (listening) => {
        setIsListening(listening);
      },
      onCommand: (command, transcript) => {
        onCommandDetected?.(command, transcript);
      },
    };

    voiceService.current.startListening(options, handlers);
  };

  const stopListening = () => {
    if (!voiceService.current) return;
    voiceService.current.stopListening();
    setInterimTranscript("");
  };

  // Calculate styles based on size
  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return {
          button: "p-2 rounded-full",
          icon: "h-4 w-4",
          container: "max-w-xs",
        };
      case "lg":
        return {
          button: "p-4 rounded-full",
          icon: "h-6 w-6",
          container: "max-w-xl",
        };
      default:
        return {
          button: "p-3 rounded-full",
          icon: "h-5 w-5",
          container: "max-w-md",
        };
    }
  };

  const sizeStyles = getSizeStyles();

  if (!isSupported) {
    return (
      <div className="text-sm text-gray-500">
        Voice input is not supported in this browser.
      </div>
    );
  }

  // Get confidence color
  const getConfidenceColor = () => {
    if (confidenceLevel > 0.8) return "bg-green-500";
    if (confidenceLevel > 0.6) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className={`voice-input-container ${sizeStyles.container}`}>
      <div className="flex items-center gap-2 w-full">
        {/* Voice input field with visual feedback */}
        <div className="relative flex-1 group">
          <div
            className={`border rounded-lg px-3 py-2 flex-1 min-h-[40px] 
                        ${
                          isListening
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-300"
                        } 
                        ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {interimTranscript ? (
              <p className="break-words">{interimTranscript}</p>
            ) : (
              <p className="text-gray-400">{placeholder}</p>
            )}

            {/* Visual audio level indicator (only visible when listening) */}
            {isListening && visualFeedback && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-[2px]">
                <div
                  className={`h-3 w-1 rounded-full animate-pulse ${getConfidenceColor()}`}
                ></div>
                <div
                  className={`h-5 w-1 rounded-full animate-pulse ${getConfidenceColor()} animation-delay-100`}
                ></div>
                <div
                  className={`h-7 w-1 rounded-full animate-pulse ${getConfidenceColor()} animation-delay-200`}
                ></div>
                <div
                  className={`h-4 w-1 rounded-full animate-pulse ${getConfidenceColor()} animation-delay-300`}
                ></div>
              </div>
            )}
          </div>
        </div>

        {/* Voice activation button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleVoiceToggle}
                disabled={disabled}
                className={`${sizeStyles.button} ${
                  isListening
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-blue-500 text-white hover:bg-blue-600"
                } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                aria-label={
                  isListening ? "Stop voice input" : "Start voice input"
                }
              >
                {isListening ? (
                  <MicOff className={sizeStyles.icon} />
                ) : (
                  <Mic className={sizeStyles.icon} />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {isListening ? "Stop voice input" : "Start voice input"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Settings button */}
        <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              className={`${
                sizeStyles.button
              } bg-gray-200 text-gray-700 hover:bg-gray-300 ${
                disabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
              aria-label="Voice input settings"
            >
              <Settings className={sizeStyles.icon} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <h3 className="font-medium">Voice Input Settings</h3>

              {/* Language selector */}
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select
                  value={selectedLanguage}
                  onValueChange={(value) => setSelectedLanguage(value)}
                >
                  <SelectTrigger id="language" className="w-full">
                    <SelectValue placeholder="Select a language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name} ({lang.localName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Continuous mode toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="continuous-mode" className="mr-2">
                    Continuous Mode
                  </Label>
                  <p className="text-sm text-gray-500">
                    Keep listening after results
                  </p>
                </div>
                <Switch
                  id="continuous-mode"
                  checked={continuousMode}
                  onCheckedChange={setContinuousMode}
                />
              </div>

              {/* Interim results toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="interim-results" className="mr-2">
                    Show Interim Results
                  </Label>
                  <p className="text-sm text-gray-500">
                    Display results as you speak
                  </p>
                </div>
                <Switch
                  id="interim-results"
                  checked={interimResults}
                  onCheckedChange={setInterimResults}
                />
              </div>

              {/* Noise threshold slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="noise-threshold">Noise Threshold</Label>
                  <span className="text-sm">
                    {Math.round(noiseThreshold * 100)}%
                  </span>
                </div>
                <Slider
                  id="noise-threshold"
                  min={0}
                  max={1}
                  step={0.05}
                  value={[noiseThreshold]}
                  onValueChange={(values) => setNoiseThreshold(values[0])}
                />
                <p className="text-xs text-gray-500">
                  Higher values filter out more background noise
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSettingsOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Command list (if provided and not empty) */}
      {commands.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-gray-500">
            Available commands: {commands.map((cmd) => cmd.name).join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}
