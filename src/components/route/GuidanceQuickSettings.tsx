import type { ComponentType } from "react";
import PreferenceSwitch from "@/components/profile/PreferenceSwitch";
import { SpeakerIcon, VibrationIcon } from "@/components/icons";
import type { NavigationPreferences } from "@/hooks/useProfilePreferences";

type GuidanceQuickSettingsProps = {
  preferences: NavigationPreferences;
  onToggle: (key: keyof NavigationPreferences) => void;
};

type Item = {
  key: keyof NavigationPreferences;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const ITEMS: Item[] = [
  { key: "voiceGuidance", label: "Indicaciones por voz", icon: SpeakerIcon },
  { key: "vibrationAlerts", label: "Avisos por vibración", icon: VibrationIcon },
];

// Sección "Cómo querés que te guiemos" en Buscar ruta (sección 3 del
// pedido): misma configuración compartida que Perfil → "Cómo quiero que
// SENDA me guíe" (useProfilePreferences → navigationPreferences) — nunca un
// estado paralelo. Deliberadamente chica: reutiliza PreferenceSwitch (el
// mismo componente de Perfil) para no inventar un segundo control visual,
// y no lleva descripción larga ni ilustración — es configuración
// secundaria, no protagonista de la pantalla.
export default function GuidanceQuickSettings({ preferences, onToggle }: GuidanceQuickSettingsProps) {
  return (
    <section className="rounded-3xl border border-slate-200/70 bg-white px-5 py-4 shadow-card sm:px-7">
      <p className="text-label text-slate-400">Cómo querés que te guiemos</p>
      <div className="mt-2 flex flex-col divide-y divide-slate-100">
        {ITEMS.map(({ key, label, icon: Icon }) => {
          const labelId = `route-guidance-${key}`;
          const checked = preferences[key];
          return (
            <div key={key} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                <Icon className="h-4 w-4" />
              </span>
              <span id={labelId} className="min-w-0 flex-1 text-sm font-medium text-slate-800">
                {label}
              </span>
              <PreferenceSwitch checked={checked} onChange={() => onToggle(key)} labelId={labelId} color="violet" />
            </div>
          );
        })}
      </div>
    </section>
  );
}
