import type { ComponentType } from "react";
import {
  AudibleTrafficLightIcon,
  BarrierIcon,
  ConeIcon,
  CrackedGroundIcon,
  NarrowPathIcon,
  PedestrianCrossingIcon,
  PotholeIcon,
  RampAccessIcon,
  SlopeIcon,
  StairsIcon,
  TrafficLightCrossedIcon,
  TrafficLightIcon,
  WheelchairIcon,
} from "@/components/icons";
import type {
  RouteAvoidPreferences,
  RouteNeedPreferences,
} from "@/hooks/useProfilePreferences";
import PreferenceSwitch from "./PreferenceSwitch";

type NeedItem = {
  key: keyof RouteNeedPreferences;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const NEED_ITEMS: NeedItem[] = [
  { key: "rampsRequired", label: "Rampas o accesos sin escalones", icon: RampAccessIcon },
  { key: "prioritizeSafeCrossings", label: "Cruces seguros", icon: PedestrianCrossingIcon },
  { key: "trafficLightCrossings", label: "Cruces con semáforo", icon: TrafficLightIcon },
  {
    key: "audibleTrafficLights",
    label: "Semáforos con señal sonora",
    icon: AudibleTrafficLightIcon,
  },
];

type AvoidItem = {
  key: keyof RouteAvoidPreferences;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const AVOID_ITEMS: AvoidItem[] = [
  { key: "avoidBadSidewalks", label: "Veredas en mal estado", icon: CrackedGroundIcon },
  { key: "avoidStairs", label: "Escaleras", icon: StairsIcon },
  { key: "avoidNarrowPaths", label: "Pasos o veredas angostas", icon: NarrowPathIcon },
  { key: "avoidSteepSlopes", label: "Pendientes pronunciadas", icon: SlopeIcon },
  { key: "potholes", label: "Baches o pozos", icon: PotholeIcon },
  { key: "obstructedSidewalks", label: "Veredas obstaculizadas", icon: BarrierIcon },
  { key: "constructionZones", label: "Obras en construcción", icon: ConeIcon },
  {
    key: "crossingsWithoutTrafficLights",
    label: "Cruces sin semáforo",
    icon: TrafficLightCrossedIcon,
  },
];

type RoutePreferencesSectionProps = {
  needPreferences: RouteNeedPreferences;
  onToggleNeed: (key: keyof RouteNeedPreferences) => void;
  avoidPreferences: RouteAvoidPreferences;
  onToggleAvoid: (key: keyof RouteAvoidPreferences) => void;
};

// "Mis preferencias de ruta": qué necesita la persona (NECESITO) y qué
// prefiere evitar (QUIERO EVITAR) durante sus recorridos. /ruta podrá leer
// esto más adelante para evaluar rutas, y cada clave podrá cruzarse con una
// señalización del mapa (ver comentarios en useProfilePreferences.ts).
export default function RoutePreferencesSection({
  needPreferences,
  onToggleNeed,
  avoidPreferences,
  onToggleAvoid,
}: RoutePreferencesSectionProps) {
  return (
    <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-card sm:p-7">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-600 shadow-control">
          <WheelchairIcon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-h2 text-slate-950">Mis preferencias de ruta</h2>
          <p className="mt-0.5 max-w-md text-sm text-slate-500">
            Elegí qué necesitás y qué preferís evitar durante tus recorridos.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4">
          <h3 className="text-label text-teal-700">Necesito</h3>
          <div className="mt-3 flex flex-col gap-3">
            {NEED_ITEMS.map(({ key, label, icon: Icon }) => {
              const labelId = `route-need-${key}`;
              const checked = needPreferences[key];
              return (
                <div
                  key={key}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white px-4 py-3.5 shadow-control"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span id={labelId} className="flex-1 text-sm font-medium text-slate-800">
                    {label}
                  </span>
                  <PreferenceSwitch
                    checked={checked}
                    onChange={() => onToggleNeed(key)}
                    labelId={labelId}
                    color="teal"
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4">
          <h3 className="text-label text-orange-700">
            Quiero evitar
          </h3>
          <div className="mt-3 flex flex-col gap-3">
            {AVOID_ITEMS.map(({ key, label, icon: Icon }) => {
              const labelId = `route-avoid-${key}`;
              const checked = avoidPreferences[key];
              return (
                <div
                  key={key}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white px-4 py-3.5 shadow-control"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span id={labelId} className="flex-1 text-sm font-medium text-slate-800">
                    {label}
                  </span>
                  <PreferenceSwitch
                    checked={checked}
                    onChange={() => onToggleAvoid(key)}
                    labelId={labelId}
                    color="orange"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
