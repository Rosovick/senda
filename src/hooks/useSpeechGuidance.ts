"use client";

import { useCallback, useEffect, useRef } from "react";

// Único punto de la app que toca window.speechSynthesis (sección 54). Esto
// es NAVEGACIÓN POR VOZ (texto → voz para instrucciones), no el
// reconocimiento de voz de los inputs (voz → texto, ver useVoiceInput):
// son sistemas distintos, sección 53.
//
// `enabled` es la preferencia de Perfil ("Indicaciones por voz"): si está
// apagada, `speak` no hace nada — así ningún componente necesita repetir
// ese chequeo.
export function useSpeechGuidance(enabled: boolean) {
  const lastSpokenRef = useRef<{ text: string; at: number } | null>(null);
  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  // Evita leer la misma instrucción dos veces seguidas en poco tiempo
  // (sección 56: "no saturar con voz... evitar repetir la misma
  // instrucción").
  const DEDUPE_WINDOW_MS = 8000;

  const speak = useCallback(
    (text: string, options: { interrupt?: boolean } = {}) => {
      if (!enabled || !isSupported) return;

      const now = Date.now();
      const last = lastSpokenRef.current;
      if (last && last.text === text && now - last.at < DEDUPE_WINDOW_MS) return;

      if (options.interrupt) window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "es-AR";
      lastSpokenRef.current = { text, at: now };
      window.speechSynthesis.speak(utterance);
    },
    [enabled, isSupported]
  );

  const cancel = useCallback(() => {
    if (isSupported) window.speechSynthesis.cancel();
  }, [isSupported]);

  // Si la persona apaga "Indicaciones por voz" a mitad de una instrucción,
  // cortarla en vez de dejarla terminar.
  useEffect(() => {
    if (!enabled && isSupported) window.speechSynthesis.cancel();
  }, [enabled, isSupported]);

  // Cleanup al desmontar (salir de /ruta durante navegación activa).
  useEffect(() => {
    return () => {
      if (isSupported) window.speechSynthesis.cancel();
    };
  }, [isSupported]);

  return { speak, cancel, isSupported };
}
