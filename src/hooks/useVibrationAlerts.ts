"use client";

import { useCallback } from "react";

// La vibración tiene UNA ÚNICA función en SENDA: avisar que el usuario está
// por pasar una señalización relevante (ver useRouteNavigation, el único
// lugar que llama a `vibrate`). Nunca para giros, inicio de recorrido,
// recalculado ni llegada — por eso hay un solo patrón, no uno por tipo de
// evento como antes.
const SIGNAL_VIBRATION_PATTERN = [200, 100, 200];

// navigator.vibrate no existe en todos los navegadores (Safari/iOS no lo
// soporta): nunca debe producir error si falta soporte. La vibración NO
// significa que SENDA detectó físicamente un obstáculo — se dispara a
// partir de GPS + ruta + señalizaciones comunitarias conocidas, nunca de un
// sensor real.
//
// `enabled` es la preferencia compartida "Avisos por vibración"
// (useProfilePreferences → navigationPreferences.vibrationAlerts) — la
// MISMA que se lee/edita desde Perfil y desde Buscar ruta.
export function useVibrationAlerts(enabled: boolean) {
  const isSupported = typeof navigator !== "undefined" && "vibrate" in navigator;

  const vibrate = useCallback(() => {
    if (!enabled || !isSupported) return;
    try {
      navigator.vibrate(SIGNAL_VIBRATION_PATTERN);
    } catch {
      // noop: algún navegador puede lanzar en contextos no permitidos (ej.
      // sin interacción reciente del usuario); nunca debe romper la app.
    }
  }, [enabled, isSupported]);

  return { vibrate, isSupported };
}
