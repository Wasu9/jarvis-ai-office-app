import React, { useState, useEffect, useRef } from 'react';
import { Mic, Radio } from 'lucide-react';

interface VoiceAssistantProps {
  onSpeechResult: (text: string) => void;
  onCommandReady?: (text: string) => void;
  isProcessing?: boolean;
}

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  onSpeechResult,
  onCommandReady,
  isProcessing = false,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcriptPreview, setTranscriptPreview] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'hi-IN';

      recognition.onstart = () => {
        setIsListening(true);
        setTranscriptPreview('');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) final += event.results[i][0].transcript;
          else interim += event.results[i][0].transcript;
        }
        if (final.trim()) {
          const command = final.trim();
          onSpeechResult(command);
          setTranscriptPreview(command);
          setIsListening(false);
          onCommandReady?.(command);
        } else if (interim) {
          setTranscriptPreview(interim);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('Speech recognition initialization failed:', e);
      setIsSupported(false);
    }

    return () => {
      try { recognitionRef.current?.abort(); } catch {}
    };
  }, [onSpeechResult, onCommandReady]);

  const toggleListening = () => {
    if (!isSupported) {
      alert('Voice speech recognition is not supported in this browser. Please type your command.');
      return;
    }
    if (isListening) {
      try { recognitionRef.current?.stop(); } catch {}
      setIsListening(false);
      return;
    }
    try { recognitionRef.current?.start(); } catch (err) { console.warn('Failed to start speech recognition:', err); }
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        id="btn-voice-input"
        onClick={toggleListening}
        disabled={isProcessing}
        title={isListening ? 'Listening... click to stop' : 'Speak to JARVIS'}
        aria-label={isListening ? 'Stop listening' : 'Speak to JARVIS'}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl backdrop-blur-md transition-all ${
          isListening
            ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.6)] ring-2 ring-rose-400'
            : 'border border-white/10 bg-white/5 text-slate-300 hover:border-cyan-500/50 hover:bg-cyan-500/15 hover:text-cyan-200 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]'
        }`}
      >
        {isListening ? (
          <>
            <Radio className="h-5 w-5 animate-pulse text-white" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
            </span>
          </>
        ) : <Mic className="h-5 w-5" />}
      </button>

      {isListening && (
        <div className="absolute bottom-12 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-2xl border border-rose-500/40 bg-[#0c0e1d]/95 px-4 py-2.5 text-xs font-medium text-slate-200 shadow-2xl backdrop-blur-2xl">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-ping rounded-full bg-rose-500" />
            <span className="font-semibold text-rose-400">JARVIS Listening:</span>
            <span className="max-w-xs truncate italic text-slate-300">{transcriptPreview || 'Boliye, JARVIS sun raha hai...'}</span>
          </div>
        </div>
      )}
    </div>
  );
};
