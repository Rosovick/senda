"use client";

import { SpeakerIcon, VibrationIcon } from "@/components/icons";
import { useProfilePreferences } from "@/hooks/useProfilePreferences";

// Antes era un mock hardcodeado (voiceGuidance/vibration siempre `true`).
// Ahora lee las preferencias reales de Perfil ("Indicaciones por voz" /
// "Avisos por vibración", ver useProfilePreferences) — la misma fuente que
// usa /perfil y que useRouteNavigation consulta para decidir si habla o
// vibra durante la navegación.
export default function AccessibilityStatus() {
  const { navigationPreferences } = useProfilePreferences();

  if (!navigationPreferences.voiceGuidance && !navigationPreferences.vibrationAlerts) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 border-t border-white/10 px-4 py-2 text-[11px] text-slate-300">
      {navigationPreferences.voiceGuidance && (
        <span className="flex items-center gap-1.5">
          <SpeakerIcon className="h-3.5 w-3.5 text-teal-400" />
          Las indicaciones se adaptan a tus preferencias
        </span>
      )}
      {navigationPreferences.vibrationAlerts && (
        <span className="flex items-center gap-1.5">
          <VibrationIcon className="h-3.5 w-3.5 text-teal-400" />
          Vibración activada
        </span>
      )}
    </div>
  );
}
