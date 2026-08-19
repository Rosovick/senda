"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Superficie mínima de la Web Speech API que usamos. TypeScript no incluye
// estos tipos en el DOM lib por defecto (todavía no es un estándar estable),
// así que se declaran acá, encapsulados en este único archivo: ningún otro
// componente debe tocar window.SpeechRecognition directamente.
type SpeechRecognitionErrorLike = { error: string };
type SpeechRecognitionResultLike = { 0: { transcript: string }; isFinal: boolean };
type SpeechRecognitionResultListLike = {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
};
type SpeechRecognitionEventLike = { results: SpeechRecognitionResultListLike };

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionConstructorLike {
  new (): SpeechRecognitionLike;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructorLike;
    webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
  }
}

const UNSUPPORTED_MESSAGE = "El dictado por voz no está disponible en este navegador.";
const PERMISSION_DENIED_MESSAGE =
  "No pudimos acceder al micrófono. Revisá los permisos del navegador.";
const NO_SPEECH_MESSAGE = "No escuchamos nada. Probá de nuevo.";
const GENERIC_ERROR_MESSAGE = "No pudimos completar el dictado por voz.";

function getSpeechRecognitionCtor(): SpeechRecognitionConstructorLike | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

// Solo un reconocimiento activo en toda la app a la vez (sección 8): si se
// inicia uno nuevo mientras otro campo está escuchando, el anterior se
// detiene primero. Vive a nivel de módulo a propósito, fuera de React: la
// regla es "un micrófono a la vez" en toda SENDA, no por componente.
let activeRecognition: SpeechRecognitionLike | null = null;

function stopActiveRecognition() {
  if (activeRecognition) {
    try {
      activeRecognition.stop();
    } catch {
      // noop: ya puede estar detenido.
    }
    activeRecognition = null;
  }
}

type UseVoiceInputOptions = {
  /** Código de idioma para el reconocimiento. "es-AR" por defecto. */
  lang?: string;
  /** Se llama UNA VEZ con el texto final reconocido (nunca con resultados
   * parciales): quien lo use decide cómo insertarlo en su campo. */
  onResult: (transcript: string) => void;
  onError?: (message: string) => void;
};

type UseVoiceInputReturn = {
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
  start: () => void;
  stop: () => void;
  toggle: () => void;
};

// Abstracción única de dictado por voz para toda SENDA (sección 3): todos
// los micrófonos de la app deben usar este hook en vez de acceder a
// SpeechRecognition por su cuenta. Espera siempre el resultado FINAL de una
// única frase (interimResults: false, continuous: false) — nunca dispara
// onResult por cada palabra parcial, para no romper buscadores con
// autocompletado ni mover mapas con resultados incompletos.
export function useVoiceInput({
  lang = "es-AR",
  onResult,
  onError,
}: UseVoiceInputOptions): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  // Mantener las últimas callbacks sin reiniciar el reconocimiento activo
  // ni recrear start/stop en cada render (ver deps de useCallback más
  // abajo). Escribir refs es un efecto, no algo puro de render.
  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  }, [onResult, onError]);

  const isSupported = getSpeechRecognitionCtor() !== null;

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // noop
      }
    }
  }, []);

  const reportError = useCallback((message: string) => {
    setError(message);
    onErrorRef.current?.(message);
  }, []);

  const start = useCallback(() => {
    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    if (!SpeechRecognitionCtor) {
      reportError(UNSUPPORTED_MESSAGE);
      return;
    }

    stopActiveRecognition();

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setError(null);
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      const transcript = last?.[0]?.transcript?.trim();
      if (transcript) onResultRef.current(transcript);
    };

    recognition.onerror = (event) => {
      const message =
        event.error === "not-allowed" || event.error === "permission-denied" || event.error === "service-not-allowed"
          ? PERMISSION_DENIED_MESSAGE
          : event.error === "no-speech"
            ? NO_SPEECH_MESSAGE
            : GENERIC_ERROR_MESSAGE;
      reportError(message);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (activeRecognition === recognition) activeRecognition = null;
      if (recognitionRef.current === recognition) recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    activeRecognition = recognition;

    try {
      recognition.start();
    } catch {
      setIsListening(false);
      recognitionRef.current = null;
      if (activeRecognition === recognition) activeRecognition = null;
      reportError(GENERIC_ERROR_MESSAGE);
    }
  }, [lang, reportError]);

  const toggle = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }, [isListening, start, stop]);

  // Cleanup: cambiar de pantalla, cerrar el formulario o desmontar el
  // componente mientras escucha detiene el reconocimiento (sección 12).
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // noop
        }
        if (activeRecognition === recognitionRef.current) activeRecognition = null;
        recognitionRef.current = null;
      }
    };
  }, []);

  return { isListening, isSupported, error, start, stop, toggle };
}
