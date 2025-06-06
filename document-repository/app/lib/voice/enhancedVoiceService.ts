/**
 * Enhanced Voice Service
 * 
 * Provides advanced voice recognition capabilities with:
 * - Continuous listening mode
 * - Interim results for real-time feedback
 * - Multiple language support
 * - Confidence scoring
 * - Noise handling
 * - Command detection
 */

// Speech recognition types
export type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  onstart: () => void;
  onspeechstart?: () => void;
  onspeechend?: () => void;
  onnomatch?: () => void;
  onaudiostart?: () => void;
  onaudioend?: () => void;
  onsoundstart?: () => void;
  onsoundend?: () => void;
};

export type SpeechRecognitionEvent = {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  isTrusted: boolean;
};

export type SpeechRecognitionResultList = {
  [index: number]: SpeechRecognitionResult;
  length: number;
};

export type SpeechRecognitionResult = {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
};

export type SpeechRecognitionAlternative = {
  transcript: string;
  confidence: number;
};

export type SpeechRecognitionErrorEvent = {
  error: string;
  message: string;
};

// Window with Speech Recognition API
interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: new () => SpeechRecognitionInstance;
  webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
}

// Supported languages
export type SupportedLanguage = {
  code: string;
  name: string;
  localName: string;
};

// Available commands that can be detected
export interface VoiceCommand {
  name: string;
  phrases: string[];
  action: (transcript: string) => void;
}

// Recognition options
export interface RecognitionOptions {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
  maxAlternatives?: number;
}

// Result handlers
export interface ResultHandlers {
  onInterimResult?: (transcript: string, confidence: number) => void;
  onFinalResult: (transcript: string, confidence: number) => void;
  onError?: (error: string) => void;
  onStateChange?: (isListening: boolean) => void;
  onCommand?: (command: string, transcript: string) => void;
}

export class EnhancedVoiceService {
  private static instance: EnhancedVoiceService;
  private recognition: SpeechRecognitionInstance | null = null;
  private isListening = false;
  private isSupported = false;
  private commands: VoiceCommand[] = [];
  private noiseThreshold = 0.5; // Confidence threshold for noise filtering
  private inactivityTimer: NodeJS.Timeout | null = null;
  private inactivityTimeout = 10000; // 10 seconds of inactivity before auto-stop

  // List of supported languages
  private supportedLanguages: SupportedLanguage[] = [
    { code: 'en-US', name: 'English (US)', localName: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)', localName: 'English (UK)' },
    { code: 'es-ES', name: 'Spanish', localName: 'Español' },
    { code: 'fr-FR', name: 'French', localName: 'Français' },
    { code: 'de-DE', name: 'German', localName: 'Deutsch' },
    { code: 'it-IT', name: 'Italian', localName: 'Italiano' },
    { code: 'ja-JP', name: 'Japanese', localName: '日本語' },
    { code: 'ko-KR', name: 'Korean', localName: '한국어' },
    { code: 'zh-CN', name: 'Chinese (Simplified)', localName: '中文 (简体)' },
    { code: 'zh-TW', name: 'Chinese (Traditional)', localName: '中文 (繁體)' },
    { code: 'ar-SA', name: 'Arabic', localName: 'العربية' },
    { code: 'hi-IN', name: 'Hindi', localName: 'हिन्दी' },
    { code: 'pt-BR', name: 'Portuguese (Brazil)', localName: 'Português (Brasil)' },
    { code: 'ru-RU', name: 'Russian', localName: 'Русский' },
  ];

  private resultHandlers: ResultHandlers = {
    onFinalResult: () => {},
  };

  private constructor() {
    this.checkSupport();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): EnhancedVoiceService {
    if (!EnhancedVoiceService.instance) {
      EnhancedVoiceService.instance = new EnhancedVoiceService();
    }
    return EnhancedVoiceService.instance;
  }

  /**
   * Check if speech recognition is supported
   */
  private checkSupport(): void {
    if (typeof window === 'undefined') {
      this.isSupported = false;
      return;
    }

    const windowWithSpeech = window as WindowWithSpeechRecognition;
    this.isSupported = !!(windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition);
  }

  /**
   * Initialize speech recognition
   */
  private initializeRecognition(options: RecognitionOptions = {}): void {
    if (!this.isSupported) return;

    const windowWithSpeech = window as WindowWithSpeechRecognition;
    const SpeechRecognition = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    // Create new recognition instance
    this.recognition = new SpeechRecognition();
    
    // Configure options
    this.recognition.continuous = options.continuous ?? false;
    this.recognition.interimResults = options.interimResults ?? false;
    this.recognition.lang = options.language ?? 'en-US';
    this.recognition.maxAlternatives = options.maxAlternatives ?? 1;

    // Set up event handlers
    this.recognition.onstart = () => {
      this.isListening = true;
      this.resultHandlers.onStateChange?.(true);
      this.resetInactivityTimer();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.resultHandlers.onStateChange?.(false);
      this.clearInactivityTimer();
    };

    this.recognition.onerror = (event) => {
      if (event.error !== 'no-speech') { // Ignore no-speech errors
        this.resultHandlers.onError?.(event.error);
      }
    };

    this.recognition.onresult = (event) => {
      this.resetInactivityTimer();
      
      const resultIndex = event.resultIndex;
      const results = event.results;
      
      for (let i = resultIndex; i < results.length; i++) {
        const result = results[i];
        const isFinal = result.isFinal;
        
        // Get the most confident alternative
        const alternative = result[0];
        const transcript = alternative.transcript.trim();
        const confidence = alternative.confidence;
        
        // Filter out low confidence results that might be noise
        if (confidence < this.noiseThreshold) continue;
        
        if (isFinal) {
          this.resultHandlers.onFinalResult(transcript, confidence);
          
          // Check for commands
          const command = this.detectCommand(transcript);
          if (command) {
            this.resultHandlers.onCommand?.(command, transcript);
          }
        } else if (this.resultHandlers.onInterimResult) {
          this.resultHandlers.onInterimResult(transcript, confidence);
        }
      }
    };
  }

  /**
   * Start listening
   */
  public startListening(options: RecognitionOptions = {}, handlers: ResultHandlers): boolean {
    if (!this.isSupported) return false;
    
    // Update handlers
    this.resultHandlers = { ...this.resultHandlers, ...handlers };
    
    // Stop any existing recognition
    this.stopListening();
    
    // Initialize with new options
    this.initializeRecognition(options);
    
    if (!this.recognition) return false;
    
    try {
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      return false;
    }
  }

  /**
   * Stop listening
   */
  public stopListening(): void {
    this.clearInactivityTimer();
    
    if (!this.recognition) return;
    
    try {
      this.recognition.stop();
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  }

  /**
   * Abort recognition (emergency stop)
   */
  public abortListening(): void {
    this.clearInactivityTimer();
    
    if (!this.recognition) return;
    
    try {
      this.recognition.abort();
    } catch (error) {
      console.error('Error aborting speech recognition:', error);
    }
  }

  /**
   * Get current listening state
   */
  public isCurrentlyListening(): boolean {
    return this.isListening;
  }

  /**
   * Check if speech recognition is supported
   */
  public isSpeechRecognitionSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Get list of supported languages
   */
  public getSupportedLanguages(): SupportedLanguage[] {
    return [...this.supportedLanguages];
  }

  /**
   * Register a voice command
   */
  public registerCommand(command: VoiceCommand): void {
    this.commands.push(command);
  }

  /**
   * Register multiple voice commands
   */
  public registerCommands(commands: VoiceCommand[]): void {
    this.commands.push(...commands);
  }

  /**
   * Clear all registered commands
   */
  public clearCommands(): void {
    this.commands = [];
  }

  /**
   * Detect if transcript contains a command
   */
  private detectCommand(transcript: string): string | null {
    const lowerTranscript = transcript.toLowerCase();
    
    for (const command of this.commands) {
      for (const phrase of command.phrases) {
        if (lowerTranscript.includes(phrase.toLowerCase())) {
          // Execute the command action
          command.action(transcript);
          return command.name;
        }
      }
    }
    
    return null;
  }

  /**
   * Set noise threshold for filtering low-quality results
   */
  public setNoiseThreshold(threshold: number): void {
    if (threshold >= 0 && threshold <= 1) {
      this.noiseThreshold = threshold;
    }
  }

  /**
   * Reset inactivity timer
   */
  private resetInactivityTimer(): void {
    this.clearInactivityTimer();
    
    this.inactivityTimer = setTimeout(() => {
      if (this.isListening) {
        this.stopListening();
      }
    }, this.inactivityTimeout);
  }

  /**
   * Clear inactivity timer
   */
  private clearInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  /**
   * Set inactivity timeout in milliseconds
   */
  public setInactivityTimeout(timeout: number): void {
    this.inactivityTimeout = timeout;
  }
} 