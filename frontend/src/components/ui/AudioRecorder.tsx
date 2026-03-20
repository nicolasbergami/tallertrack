import { useState, useEffect, useRef, useCallback } from "react";

// TypeScript shim for the Web Speech API (not included in lib.dom.d.ts by default)
declare global {
  interface Window {
    SpeechRecognition:       new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous:     boolean;
  interimResults: boolean;
  lang:           string;
  start():        void;
  stop():         void;
  onresult:       ((e: SpeechRecognitionEvent) => void) | null;
  onerror:        ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend:          (() => void) | null;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results:     SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length:  number;
  item(i: number): SpeechRecognitionResult;
  [i: number]:     SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [i: number]: { transcript: string };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

// ────────────────────────────────────────────────────────────────────────────

const MAX_SECONDS = 30;

interface Props {
  onTranscriptReady: (transcript: string) => void;
  onError?:          (msg: string) => void;
}

type RecorderState = "idle" | "recording" | "done";

export function AudioRecorder({ onTranscriptReady, onError }: Props) {
  const [state,      setState]      = useState<RecorderState>("idle");
  const [seconds,    setSeconds]    = useState(0);
  const [transcript, setTranscript] = useState("");
  const [interim,    setInterim]    = useState("");

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalRef       = useRef("");   // accumulates final transcript chunks
  const isRecordingRef = useRef(false); // mirrors "recording" state for closures

  // Check browser support
  const SpeechRecognition =
    typeof window !== "undefined"
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  const isSupported = !!SpeechRecognition;

  const stopRecording = useCallback((fromTimer = false) => {
    isRecordingRef.current = false;
    recognitionRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setState("done");
    setInterim("");
    if (!fromTimer) return;
    // If stopped by timer, auto-submit
    const text = finalRef.current.trim();
    if (text) onTranscriptReady(text);
  }, [onTranscriptReady]);

  const startRecording = useCallback(() => {
    if (!SpeechRecognition) return;

    finalRef.current       = "";
    isRecordingRef.current = true;
    setTranscript("");
    setInterim("");
    setSeconds(0);
    setState("recording");

    const recognition = new SpeechRecognition();
    recognition.continuous     = true;
    recognition.interimResults = true;
    recognition.lang           = "es-CL";
    recognitionRef.current     = recognition;

    recognition.onresult = (e) => {
      let finalChunk = "";
      let interimChunk = "";

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalChunk += text + " ";
        } else {
          interimChunk += text;
        }
      }

      if (finalChunk) {
        finalRef.current += finalChunk;
        setTranscript(finalRef.current);
      }
      setInterim(interimChunk);
    };

    recognition.onerror = (e) => {
      if (e.error === "not-allowed") {
        onError?.("Permiso de micrófono denegado. Habilítalo en la configuración del navegador.");
      } else if (e.error === "network") {
        onError?.("Sin conexión con el servidor de voz. Verificá tu conexión a internet e intentá de nuevo.");
      } else if (e.error !== "no-speech") {
        onError?.(`Error de reconocimiento: ${e.error}. Intentá de nuevo.`);
      }
      setState("idle");
    };

    recognition.onend = () => {
      // auto-restart if still recording (continuous mode can stop unexpectedly).
      // Use isRecordingRef instead of `state` to avoid stale closure capture.
      if (recognitionRef.current === recognition && isRecordingRef.current) {
        try { recognition.start(); } catch (_) { /* already started */ }
      }
    };

    recognition.start();

    // Timer
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_SECONDS) {
          stopRecording(true);
          return MAX_SECONDS;
        }
        return s + 1;
      });
    }, 1000);
  }, [SpeechRecognition, stopRecording, onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleConfirm = () => {
    const text = (transcript + " " + interim).trim();
    if (text) onTranscriptReady(text);
  };

  const handleReset = () => {
    finalRef.current = "";
    setTranscript("");
    setInterim("");
    setSeconds(0);
    setState("idle");
  };

  const progressPct = Math.min((seconds / MAX_SECONDS) * 100, 100);
  const timeLeft    = MAX_SECONDS - seconds;

  if (!isSupported) {
    return (
      <div className="rounded-xl bg-amber-950/40 border border-amber-800/50 px-4 py-3">
        <p className="text-amber-300 text-sm">
          Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">

      {/* Transcript display */}
      <div className="min-h-[5rem] max-h-36 overflow-y-auto rounded-xl bg-surface-raised border border-surface-border p-3">
        {(transcript || interim) ? (
          <p className="text-sm text-slate-200 leading-relaxed">
            {transcript}
            {interim && <span className="text-slate-500 italic">{interim}</span>}
          </p>
        ) : (
          <p className="text-sm text-slate-600 italic">
            {state === "recording"
              ? "Escuchando… habla claramente sobre las reparaciones y repuestos"
              : "Pulsa Grabar y describe el trabajo a realizar"}
          </p>
        )}
      </div>

      {/* Timer bar — only while recording */}
      {state === "recording" && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-surface-raised overflow-hidden">
            <div
              className="h-full bg-brand transition-all duration-1000 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs font-mono text-slate-400 flex-shrink-0 tabular-nums">
            {timeLeft}s
          </span>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        {state === "idle" && (
          <button
            onClick={startRecording}
            className="flex-1 h-11 rounded-xl bg-brand hover:bg-brand-hover text-white
                       font-semibold text-sm flex items-center justify-center gap-2
                       transition-colors active:scale-95"
          >
            <span className="w-2 h-2 rounded-full bg-white" />
            Grabar ({MAX_SECONDS}s)
          </button>
        )}

        {state === "recording" && (
          <button
            onClick={() => stopRecording(false)}
            className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-500 text-white
                       font-semibold text-sm flex items-center justify-center gap-2
                       transition-colors active:scale-95 animate-pulse"
          >
            <span className="w-2 h-2 rounded-full bg-white" />
            Detener
          </button>
        )}

        {state === "done" && (transcript || interim) && (
          <>
            <button
              onClick={handleReset}
              className="h-11 px-4 rounded-xl border border-surface-border text-slate-400
                         hover:text-slate-200 text-sm font-semibold transition-colors"
            >
              Regrabar
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 h-11 rounded-xl bg-brand hover:bg-brand-hover text-white
                         font-semibold text-sm transition-colors active:scale-95"
            >
              Analizar con IA →
            </button>
          </>
        )}

        {state === "done" && !transcript && !interim && (
          <button
            onClick={handleReset}
            className="flex-1 h-11 rounded-xl border border-surface-border text-slate-400
                       hover:text-slate-200 text-sm font-semibold transition-colors"
          >
            Intentar de nuevo
          </button>
        )}
      </div>
    </div>
  );
}
