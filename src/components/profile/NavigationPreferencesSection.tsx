"use client";

import type { ComponentType } from "react";
import { SpeakerIcon, VibrationIcon } from "@/components/icons";
import { useSpeechGuidance } from "@/hooks/useSpeechGuidance";
import type { NavigationPreferences } from "@/hooks/useProfilePreferences";
import { useVibrationAlerts } from "@/hooks/useVibrationAlerts";
import PreferenceSwitch from "./PreferenceSwitch";

type GuidanceItem = {
  key: keyof NavigationPreferences;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

const ITEMS: GuidanceItem[] = [
  {
    key: "voiceGuidance",
    label: "Indicaciones por voz",
    description: "Escuchar las instrucciones del recorrido.",
    icon: SpeakerIcon,
  },
  {
    key: "vibrationAlerts",
    label: "Avisos por vibración",
    description: "Recibir una vibración cuando estés por pasar una señalización relevante.",
    icon: VibrationIcon,
  },
];

type NavigationPreferencesSectionProps = {
  preferences: NavigationPreferences;
  onToggle: (key: keyof NavigationPreferences) => void;
};

// "Cómo quiere ser asistida": conceptualmente separado de las preferencias
// de ruta. Esto define la forma de las indicaciones (voz, vibración), no el
// trazado del recorrido. `preferences` es la MISMA fuente que lee/escribe
// Buscar ruta (useProfilePreferences → navigationPreferences): no hay un
// estado paralelo acá.
export default function NavigationPreferencesSection({
  preferences,
  onToggle,
}: NavigationPreferencesSectionProps) {
  // Sección 16 (opcional): "Probar voz"/"Probar vibración" funcionan
  // independientemente de que haya una navegación activa — usan los mismos
  // hooks que useRouteNavigation, con la preferencia real como `enabled`,
  // así que si la preferencia está apagada tampoco hacen nada (mismo
  // camino, ninguna lógica duplicada).
  const { speak, isSupported: speechSupported } = useSpeechGuidance(preferences.voiceGuidance);
  const { vibrate, isSupported: vibrationSupported } = useVibrationAlerts(preferences.vibrationAlerts);

  return (
    <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-card sm:p-7">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600 shadow-control">
          <SpeakerIcon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-h2 text-slate-950">Cómo quiero que SENDA me guíe</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Elegí cómo querés recibir las indicaciones durante el recorrido.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {ITEMS.map(({ key, label, description, icon: Icon }) => {
          const labelId = `nav-pref-${key}`;
          const checked = preferences[key];
          return (
            <div
              key={key}
              className="flex items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-4 shadow-control"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-violet-600 shadow-control ring-1 ring-black/5">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <span id={labelId} className="block text-sm font-semibold text-slate-800">
                  {label}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                  {description}
                </span>

                {key === "voiceGuidance" && checked && speechSupported && (
                  <button
                    type="button"
                    onClick={() => speak("Las indicaciones por voz están activadas.", { interrupt: true })}
                    className="mt-2 text-xs font-semibold text-violet-700 underline-offset-2 transition hover:text-violet-800 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                  >
                    Probar voz
                  </button>
                )}
                {key === "vibrationAlerts" && checked && vibrationSupported && (
                  <button
                    type="button"
                    onClick={() => vibrate()}
                    className="mt-2 text-xs font-semibold text-violet-700 underline-offset-2 transition hover:text-violet-800 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                  >
                    Probar vibración
                  </button>
                )}
              </div>
              <PreferenceSwitch
                checked={checked}
                onChange={() => onToggle(key)}
                labelId={labelId}
                color="violet"
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
