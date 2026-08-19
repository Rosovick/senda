"use client";

import { useEffect, useRef, useState } from "react";
import {
  buildAllHelpsChainViaCandidate,
  buildHelpViaCandidates,
  buildObstacleEscapeViaCandidates,
} from "@/lib/routeCandidates";
import { resolveSignal } from "@/lib/reports";
import { chooseBestRoute, distanceToRouteMeters } from "@/lib/routeSignals";
import type { RouteData } from "@/lib/routing";
import type { SignalWithTrust } from "./useSignals";

type RoutePoint = { lat: number; lng: number };

async function fetchViaRoute(
  origin: RoutePoint,
  destination: RoutePoint,
  vias: RoutePoint[],
  signal: AbortSignal,
  debugLabel: string
): Promise<RouteData | null> {
  try {
    const viaParams = vias.map((via) => `&via=${via.lat},${via.lng}`).join("");
    const url =
      `/api/route?originLat=${origin.lat}&originLng=${origin.lng}` +
      `&destLat=${destination.lat}&destLng=${destination.lng}${viaParams}`;
    const response = await fetch(url, { signal });
    if (!response.ok) {
      if (process.env.NODE_ENV !== "production") {
        console.debug(`[useRouteCandidates] ${debugLabel}: falló (HTTP ${response.status})`);
      }
      return null;
    }
    const payload = (await response.json()) as RouteData[];
    return payload[0] ?? null;
  } catch (error) {
    // AbortError es esperado (origen/destino cambió mientras pedíamos):
    // no es una falla real, no vale la pena loguearlo como tal.
    if (process.env.NODE_ENV !== "production" && (error as Error)?.name !== "AbortError") {
      console.debug(`[useRouteCandidates] ${debugLabel}: falló`, error);
    }
    return null;
  }
}

// Complementa a useRoute con candidatas de ruta ADICIONALES, reales, más
// allá de las que ofreció alternatives=true — ver lib/routeCandidates.ts
// para el motivo (en trayectos urbanos cortos el motor frecuentemente
// devuelve una sola ruta, y sin una segunda geometría real entre las que
// elegir ninguna señalización puede influir en la elección final).
//
// No reemplaza a chooseBestRoute ni decide nada por su cuenta: junta
// candidatas reales adicionales y las devuelve para que RouteMapSection
// las sume a `routes` antes de aplicar chooseBestRoute exactamente igual
// que a las alternativas nativas — una candidata vía-forzada que resulta
// en un desvío sin sentido se descarta ahí mismo (SANITY_MAX_DETOUR_RATIO),
// nunca acá.
//
// Dos fases, cada una solo pide lo que hace falta:
// 1) Vías forzados por ayudas relevantes cercanas que ninguna alternativa
//    nativa ya cubre — individuales, más UN pedido que intenta
//    encadenarlas TODAS en un solo trayecto real (ver
//    buildAllHelpsChainViaCandidate).
// 2) Solo si, ya con la fase 1 sumada, la mejor alternativa sigue sin
//    evitar un obstáculo relevante: vías desplazados cerca de ese
//    obstáculo, buscando una calle paralela real.
export function useRouteCandidates(
  origin: RoutePoint | null,
  destination: RoutePoint | null,
  baseRoutes: RouteData[],
  relevantSignals: SignalWithTrust[]
): RouteData[] {
  const [extraRoutes, setExtraRoutes] = useState<RouteData[]>([]);
  const requestIdRef = useRef(0);

  const originLat = origin?.lat ?? null;
  const originLng = origin?.lng ?? null;
  const destLat = destination?.lat ?? null;
  const destLng = destination?.lng ?? null;

  useEffect(() => {
    if (originLat === null || originLng === null || destLat === null || destLng === null) {
      // Sincroniza con el cambio de origen/destino (sistema externo, mismo
      // patrón que useRoute.ts): no es derivable en render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExtraRoutes([]);
      return;
    }
    if (baseRoutes.length === 0) {
      setExtraRoutes([]);
      return;
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    const originPoint = { lat: originLat, lng: originLng };
    const destinationPoint = { lat: destLat, lng: destLng };

    (async () => {
      const fastestBaseRoute = baseRoutes.reduce((best, candidate) =>
        candidate.durationSeconds < best.durationSeconds ? candidate : best
      );

      if (process.env.NODE_ENV !== "production") {
        const helpSignalsInProfile = relevantSignals.filter(
          (s) => resolveSignal(s.type).category === "help"
        );
        console.debug(
          `[useRouteCandidates] señalizaciones de ayuda relevantes al perfil=${helpSignalsInProfile.length} ` +
            `(de ${relevantSignals.length} relevantes en total) — si esto da 0, revisá que el tipo esté ` +
            `marcado como necesidad en Perfil › Preferencias de ruta`
        );
      }

      const helpCandidates = buildHelpViaCandidates(relevantSignals, fastestBaseRoute);
      // Además de las candidatas individuales, UN pedido que intenta
      // encadenar TODAS las ayudas obligatorias del corredor en un solo
      // trayecto real (ver buildAllHelpsChainViaCandidate) — es lo que le
      // da a chooseBestRoute la chance real de cumplir "pasar por todas",
      // no solo "por la que coincida de casualidad".
      const helpChainCandidate = buildAllHelpsChainViaCandidate(relevantSignals, fastestBaseRoute);
      const allHelpCandidates = helpChainCandidate
        ? [...helpCandidates, helpChainCandidate]
        : helpCandidates;
      if (process.env.NODE_ENV !== "production") {
        console.debug(
          `[useRouteCandidates] fase 1 (ayudas): ${allHelpCandidates.length} candidata(s) a pedir`,
          allHelpCandidates.map((c) => c.key)
        );
      }
      const helpResults = await Promise.all(
        allHelpCandidates.map((candidate) =>
          fetchViaRoute(originPoint, destinationPoint, candidate.vias, controller.signal, candidate.key)
        )
      );
      if (requestIdRef.current !== requestId) return;

      const phase1Routes = helpResults.filter((route): route is RouteData => route !== null);
      const bestAfterPhase1 = chooseBestRoute([...baseRoutes, ...phase1Routes], relevantSignals);

      let phase2Routes: RouteData[] = [];
      if (bestAfterPhase1 && bestAfterPhase1.obstacleSignals.length > 0) {
        // Más cerca primero: con el tope MAX_OBSTACLE_SIGNALS_FOR_ESCAPE,
        // priorizar el obstáculo que realmente está sobre el tramo elegido
        // antes que uno apenas dentro del radio de intervención.
        const obstaclesToEscape = [...bestAfterPhase1.obstacleSignals].sort(
          (a, b) =>
            distanceToRouteMeters(
              { lat: a.latitude, lng: a.longitude },
              bestAfterPhase1.route.coordinates
            ) -
            distanceToRouteMeters(
              { lat: b.latitude, lng: b.longitude },
              bestAfterPhase1.route.coordinates
            )
        );
        const obstacleCandidates = buildObstacleEscapeViaCandidates(
          bestAfterPhase1.route,
          obstaclesToEscape
        );
        if (process.env.NODE_ENV !== "production") {
          console.debug(
            `[useRouteCandidates] fase 2 (escape de obstáculo): ${obstacleCandidates.length} candidata(s) a pedir`,
            obstacleCandidates.map((c) => c.key)
          );
        }
        const obstacleResults = await Promise.all(
          obstacleCandidates.map((candidate) =>
            fetchViaRoute(originPoint, destinationPoint, candidate.vias, controller.signal, candidate.key)
          )
        );
        if (requestIdRef.current !== requestId) return;
        phase2Routes = obstacleResults.filter((route): route is RouteData => route !== null);
      }

      if (process.env.NODE_ENV !== "production") {
        console.debug(
          `[useRouteCandidates] candidatas reales obtenidas: fase1=${phase1Routes.length}/${allHelpCandidates.length} ` +
            `fase2=${phase2Routes.length}`
        );
      }

      setExtraRoutes([...phase1Routes, ...phase2Routes]);
    })();

    return () => controller.abort();
  }, [originLat, originLng, destLat, destLng, baseRoutes, relevantSignals]);

  return extraRoutes;
}
