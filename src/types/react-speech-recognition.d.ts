declare module "react-speech-recognition" {
  export interface StartListeningOptions {
    continuous?: boolean;
    language?: string;
  }

  export interface SpeechRecognitionHookResult {
    transcript: string;
    listening: boolean;
    resetTranscript: () => void;
    browserSupportsSpeechRecognition: boolean;
    browserSupportsContinuousListening?: boolean;
    isMicrophoneAvailable?: boolean;
  }

  export function useSpeechRecognition(): SpeechRecognitionHookResult;

  const SpeechRecognition: {
    startListening: (
      options?: StartListeningOptions
    ) => Promise<void>;
    stopListening: () => void;
  };

  export default SpeechRecognition;
}
