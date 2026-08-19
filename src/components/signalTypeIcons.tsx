import type { ComponentType } from "react";
import {
  AudibleTrafficLightIcon,
  BarrierIcon,
  ConeIcon,
  CrackedGroundIcon,
  FlagIcon,
  NarrowPathIcon,
  PedestrianCrossingIcon,
  PotholeIcon,
  RampAccessIcon,
  SlopeIcon,
  StairsIcon,
  TrafficLightCrossedIcon,
  TrafficLightIcon,
} from "@/components/icons";
import type { SignalType } from "@/lib/reports";

// Mismos íconos que usa /perfil para la preferencia de ruta equivalente
// (ver RoutePreferencesSection): una señalización y una preferencia de
// Perfil que describen la misma condición comparten también el ícono, no
// solo el nombre de clave.
//
// `Record<SignalType, ...>` obliga a TypeScript a exigir una entrada para
// cada uno de los 12 SignalType válidos: si se agrega un type nuevo acá
// arriba y no se agrega su ícono, el build falla en vez de romper en
// runtime como pasaba antes.
export const SIGNAL_TYPE_ICONS: Record<SignalType, ComponentType<{ className?: string }>> = {
  rampsRequired: RampAccessIcon,
  prioritizeSafeCrossings: PedestrianCrossingIcon,
  trafficLightCrossings: TrafficLightIcon,
  audibleTrafficLights: AudibleTrafficLightIcon,
  avoidBadSidewalks: CrackedGroundIcon,
  avoidStairs: StairsIcon,
  avoidNarrowPaths: NarrowPathIcon,
  avoidSteepSlopes: SlopeIcon,
  potholes: PotholeIcon,
  obstructedSidewalks: BarrierIcon,
  constructionZones: ConeIcon,
  crossingsWithoutTrafficLights: TrafficLightCrossedIcon,
};

// Ícono neutro para una señalización cuyo `type` no es válido (dato de una
// versión anterior del modelo, o corrupto). Mismo ícono que se usaba antes
// de esta migración como placeholder de reporte (bandera). Se resuelve con
// SIGNAL_TYPE_ICONS[signal.type] a partir de resolveSignal() (lib/reports.ts)
// en el lugar donde se usa como JSX, en vez de una función wrapper: así el
// linter (react-hooks/static-components) puede seguir viendo que el
// componente elegido es siempre uno de los estables definidos acá arriba.
export const UNKNOWN_SIGNAL_TYPE_ICON = FlagIcon;
