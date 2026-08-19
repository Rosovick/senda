"use client";

import { useCallback } from "react";
import { generateLocalId } from "@/lib/localId";
import type { RouteAvoidPreferences, RouteNeedPreferences } from "./useProfilePreferences";
import { useLocalStorageState } from "./useLocalStorageState";

export type SavedRoutePoint = {
  label: string;
  lat: number;
  lng: number;
};

export type SavedRoute = {
  id: string;
  name: string;
  origin: SavedRoutePoint;
  destination: SavedRoutePoint;
  createdAt: string; // ISO
  // Solo de referencia/histórico (para mostrar "con qué preferencias se
  // guardó", si hiciera falta más adelante) — NUNCA se usan para volver a
  // calcular: "Usar trayecto" siempre recalcula con las preferencias y
  // señalizaciones ACTUALES del Perfil (ver RouteMapSection), nunca con una
  // geometría o preferencia vieja congelada.
  routeNeedPreferencesSnapshot: RouteNeedPreferences | null;
  routeAvoidPreferencesSnapshot: RouteAvoidPreferences | null;
};

const SAVED_ROUTES_KEY = "senda:saved-routes";

// Única fuente de datos para trayectos guardados de toda la app: Mapa →
// "Guardados"/"Guardar trayecto" y Perfil → "Lugares guardados" leen y
// escriben esta misma colección (localStorage, mismo patrón que
// useReports/useProfilePreferences) — nunca dos sistemas paralelos. Guardar
// desde Mapa lo hace aparecer en Perfil y viceversa porque ambos son,
// literalmente, el mismo estado.
export function useSavedRoutes() {
  const [savedRoutes, setSavedRoutes, isLoaded] = useLocalStorageState<SavedRoute[]>(
    SAVED_ROUTES_KEY,
    []
  );

  const addSavedRoute = useCallback(
    (input: {
      name: string;
      origin: SavedRoutePoint;
      destination: SavedRoutePoint;
      routeNeedPreferencesSnapshot?: RouteNeedPreferences | null;
      routeAvoidPreferencesSnapshot?: RouteAvoidPreferences | null;
    }) => {
      const route: SavedRoute = {
        id: generateLocalId(),
        name: input.name.trim(),
        origin: input.origin,
        destination: input.destination,
        createdAt: new Date().toISOString(),
        routeNeedPreferencesSnapshot: input.routeNeedPreferencesSnapshot ?? null,
        routeAvoidPreferencesSnapshot: input.routeAvoidPreferencesSnapshot ?? null,
      };
      setSavedRoutes((current) => [route, ...current]);
      return route;
    },
    [setSavedRoutes]
  );

  const renameSavedRoute = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setSavedRoutes((current) =>
        current.map((route) => (route.id === id ? { ...route, name: trimmed } : route))
      );
    },
    [setSavedRoutes]
  );

  const deleteSavedRoute = useCallback(
    (id: string) => {
      setSavedRoutes((current) => current.filter((route) => route.id !== id));
    },
    [setSavedRoutes]
  );

  return { savedRoutes, addSavedRoute, renameSavedRoute, deleteSavedRoute, isLoaded };
}
