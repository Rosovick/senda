"use client";

import { useCallback } from "react";
import { useLocalStorageState } from "./useLocalStorageState";

// Qué necesita la persona para que SENDA recomiende rutas apropiadas.
// /ruta podrá leer esto más adelante al calcular/comparar rutas.
// Mismas claves que src/lib/reports.ts (SignalType) usa para "qué se
// señalizó" — así una preferencia del Perfil podrá compararse más adelante
// con una señalización del mapa sin traducir nombres.
export type RouteNeedPreferences = {
  rampsRequired: boolean;
  prioritizeSafeCrossings: boolean;
  trafficLightCrossings: boolean;
  audibleTrafficLights: boolean;
};

export const DEFAULT_ROUTE_NEED_PREFERENCES: RouteNeedPreferences = {
  rampsRequired: false,
  prioritizeSafeCrossings: false,
  trafficLightCrossings: false,
  audibleTrafficLights: false,
};

// Qué quiere evitar la persona durante sus recorridos. Mismo criterio que
// arriba: avoidBadSidewalks, avoidStairs, avoidNarrowPaths y
// avoidSteepSlopes son las claves que ya existían (y que reports.ts sigue
// usando); el resto son necesidades nuevas de esta pantalla.
export type RouteAvoidPreferences = {
  avoidBadSidewalks: boolean;
  avoidStairs: boolean;
  avoidNarrowPaths: boolean;
  avoidSteepSlopes: boolean;
  potholes: boolean;
  obstructedSidewalks: boolean;
  constructionZones: boolean;
  crossingsWithoutTrafficLights: boolean;
};

export const DEFAULT_ROUTE_AVOID_PREFERENCES: RouteAvoidPreferences = {
  avoidBadSidewalks: false,
  avoidStairs: false,
  avoidNarrowPaths: false,
  avoidSteepSlopes: false,
  potholes: false,
  obstructedSidewalks: false,
  constructionZones: false,
  crossingsWithoutTrafficLights: false,
};

// Cómo quiere la persona que SENDA la asista durante la navegación.
// Conceptualmente separado de las preferencias de ruta: una cosa es qué
// ruta elegir, otra es cómo comunicar las indicaciones.
export type NavigationPreferences = {
  voiceGuidance: boolean;
  vibrationAlerts: boolean;
};

export const DEFAULT_NAVIGATION_PREFERENCES: NavigationPreferences = {
  voiceGuidance: false,
  vibrationAlerts: false,
};

// Claves separadas a propósito: el día que esto venga de la cuenta del
// usuario (Supabase), cada preferencia se puede migrar de forma
// independiente sin tocar las otras.
const ROUTE_NEED_PREFERENCES_KEY = "senda:route-need-preferences";
const ROUTE_AVOID_PREFERENCES_KEY = "senda:route-avoid-preferences";
const NAVIGATION_PREFERENCES_KEY = "senda:navigation-preferences";

// Persistencia temporal en localStorage, detrás de una interfaz de hook. Los
// componentes que lo consumen no saben (ni les importa) de dónde vienen los
// datos, así que reemplazar esto por la cuenta real del usuario más adelante
// no debería requerir tocar la pantalla de perfil.
export function useProfilePreferences() {
  const [routeNeedPreferences, setRouteNeedPreferences, needLoaded] =
    useLocalStorageState<RouteNeedPreferences>(
      ROUTE_NEED_PREFERENCES_KEY,
      DEFAULT_ROUTE_NEED_PREFERENCES
    );
  const [routeAvoidPreferences, setRouteAvoidPreferences, avoidLoaded] =
    useLocalStorageState<RouteAvoidPreferences>(
      ROUTE_AVOID_PREFERENCES_KEY,
      DEFAULT_ROUTE_AVOID_PREFERENCES
    );
  const [navigationPreferences, setNavigationPreferences, navigationLoaded] =
    useLocalStorageState<NavigationPreferences>(
      NAVIGATION_PREFERENCES_KEY,
      DEFAULT_NAVIGATION_PREFERENCES
    );

  const toggleRouteNeedPreference = useCallback(
    (key: keyof RouteNeedPreferences) => {
      setRouteNeedPreferences((current) => ({ ...current, [key]: !current[key] }));
    },
    [setRouteNeedPreferences]
  );

  const toggleRouteAvoidPreference = useCallback(
    (key: keyof RouteAvoidPreferences) => {
      setRouteAvoidPreferences((current) => ({ ...current, [key]: !current[key] }));
    },
    [setRouteAvoidPreferences]
  );

  const toggleNavigationPreference = useCallback(
    (key: keyof NavigationPreferences) => {
      setNavigationPreferences((current) => ({
        ...current,
        [key]: !current[key],
      }));
    },
    [setNavigationPreferences]
  );

  return {
    routeNeedPreferences,
    toggleRouteNeedPreference,
    routeAvoidPreferences,
    toggleRouteAvoidPreference,
    navigationPreferences,
    toggleNavigationPreference,
    isLoaded: needLoaded && avoidLoaded && navigationLoaded,
  };
}
