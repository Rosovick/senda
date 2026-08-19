"use client";

import { useEffect, useRef, useState } from "react";
import {
  buildRedExclusionZones,
  detectSignalsInCorridor,
  GREEN_DETECTION_RADIUS_METERS,
  mergeRouteSegments,
  nearestSegmentBearing,
  offsetPoint,
  orderWaypointsAlongRoute,
  RED_DETECTION_RADIUS_METERS,
  routeProgress,
  SNAP_MAX_DISTANCE_METERS,
  validateGreenWaypoints,
  validateRedZones,
  type GreenValidation,
  type MandatoryWaypoint,
  type RedExclusionZone,
  type RedValidation,
} from "@/lib/accessibleRouting";
import { resolveSignal } from "@/lib/reports";
import type { RouteData } from "@/lib/routing";
import type { SignalWithTrust } from "./useSignals";

type RoutePoint = { lat: number; lng: number };
export type AccessibleRouteStatus = "idle" | "loading" | "success" | "error";

const ERROR_MESSAGES: Record<string, string> = {
  network: "No pudimos conectarnos para calcular la ruta. Revisá tu conexión.",
  unavailable:
    "El servicio de rutas no está disponible en este momento. Probá de nuevo en unos segundos.",
  "no-route": "No pudimos encontrar una ruta entre estos puntos. Probá con otro destino.",
  "invalid-response": "No pudimos calcular la ruta. Probá de nuevo.",
};

function messageForReason(reason: unknown): string {
  if (typeof reason === "string" && reason in ERROR_MESSAGES) return ERROR_MESSAGES[reason];
  return ERROR_MESSAGES["invalid-response"];
}

class RouteFetchError extends Error {
  reason: unknown;
  constructor(reason: unknown) {
    super("SENDA route fetch failed");
    this.reason = reason;
  }
}

// Alternativas reales entre dos puntos, vía /api/route (mismo endpoint que
// useRoute.ts) — se reutiliza tanto para la ruta base (corredor de
// búsqueda) como para cada tramo cuando hace falta calcular por segmentos.
async function fetchAlternatives(
  origin: RoutePoint,
  destination: RoutePoint,
  signal: AbortSignal
): Promise<RouteData[]> {
  const url =
    `/api/route?originLat=${origin.lat}&originLng=${origin.lng}` +
    `&destLat=${destination.lat}&destLng=${destination.lng}`;
  const response = await fetch(url, { signal });
  const payload = await response.json();
  if (!response.ok) throw new RouteFetchError(payload?.reason);
  return payload as RouteData[];
}

function fastestOf(routes: RouteData[]): RouteData {
  return routes.reduce((best, r) => (r.durationSeconds < best.durationSeconds ? r : best));
}

// Pedido real con TODOS los waypoints obligatorios encadenados en un solo
// trayecto (ver fetchRouteViaPoints en lib/routing.ts, expuesto acá vía
// /api/route con `via=lat,lng` repetible). Loguea la URL/coordenadas REALES
// enviadas — no alcanza con que `mandatoryWaypoints` exista como array: acá
// es donde se comprueba que ese array efectivamente viaja en la petición.
async function fetchViaChain(
  origin: RoutePoint,
  vias: RoutePoint[],
  destination: RoutePoint,
  signal: AbortSignal,
  debug: boolean
): Promise<RouteData> {
  const viaParams = vias.map((via) => `&via=${via.lat},${via.lng}`).join("");
  const url =
    `/api/route?originLat=${origin.lat}&originLng=${origin.lng}` +
    `&destLat=${destination.lat}&destLng=${destination.lng}${viaParams}`;

  if (debug) {
    console.debug("ROUTING ENGINE: OSRM (perfil foot, peatonal) — /api/route → lib/routing.ts fetchRouteViaPoints");
    console.debug("ORIGIN:", origin);
    console.debug("DESTINATION:", destination);
    console.debug(
      "FINAL ROUTING COORDINATES SENT:",
      [origin, ...vias, destination].map((p) => `${p.lat},${p.lng}`)
    );
    console.debug("REQUEST URL:", url);
  }

  const response = await fetch(url, { signal });
  const payload = await response.json();
  if (!response.ok) throw new RouteFetchError(payload?.reason);
  const routes = payload as RouteData[];
  if (!routes[0]) throw new RouteFetchError("no-route");
  return routes[0];
}

async function fetchNearest(
  point: RoutePoint,
  signal: AbortSignal
): Promise<{ lat: number; lng: number; snapDistanceMeters: number } | null> {
  try {
    const url = `/api/route/nearest?lat=${point.lat}&lng=${point.lng}`;
    const response = await fetch(url, { signal });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error;
    return null;
  }
}

// Calcula el trayecto real que pasa por TODOS los `vias`, en el orden dado.
// Intenta un único pedido con múltiples `via` primero (lo que soporta el
// motor actual, OSRM); si ese pedido falla, calcula cada tramo por
// separado y los une en una sola polyline continua (sección 6 del pedido:
// "si el motor no soporta waypoints, NO abandones la funcionalidad").
async function computeRouteThroughWaypoints(
  origin: RoutePoint,
  destination: RoutePoint,
  vias: RoutePoint[],
  fallbackRoute: RouteData,
  signal: AbortSignal,
  debug: boolean
): Promise<RouteData> {
  if (vias.length === 0) return fallbackRoute;

  if (debug) {
    const chain = ["ORIGIN", ...vias.map((_, i) => `GREEN ${i + 1}`), "DESTINATION"];
    console.debug("Calculando:");
    for (let i = 0; i < chain.length - 1; i++) console.debug(`${chain[i]} → ${chain[i + 1]}`);
  }

  try {
    return await fetchViaChain(origin, vias, destination, signal, debug);
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error;
    if (debug) {
      console.debug(
        "[SENDA ROUTING] el motor no aceptó el pedido con múltiples via — calculando por tramos y uniendo",
        error
      );
    }
    const points = [origin, ...vias, destination];
    if (debug) {
      console.debug("ROUTING ENGINE: OSRM (perfil foot, peatonal) — cálculo por tramos (fallback)");
      console.debug("FINAL ROUTING COORDINATES SENT (por tramos):", points.map((p) => `${p.lat},${p.lng}`));
    }
    const segments: RouteData[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      if (debug) console.debug(`tramo: ${points[i].lat},${points[i].lng} → ${points[i + 1].lat},${points[i + 1].lng}`);
      const segmentAlternatives = await fetchAlternatives(points[i], points[i + 1], signal);
      segments.push(fastestOf(segmentAlternatives));
    }
    return mergeRouteSegments(segments);
  }
}

// Un solo intento de escape por vez (el rojo más urgente): si logra
// evitarlo, el próximo cálculo puede intentar el siguiente que siga
// fallando — evita pedidos combinatorios (2^n direcciones × n rojos).
async function tryEscapeRedZone(
  origin: RoutePoint,
  destination: RoutePoint,
  orderedGreenWaypoints: RoutePoint[],
  failingRed: RedValidation,
  currentRoute: RouteData,
  signal: AbortSignal,
  debug: boolean
): Promise<RouteData | null> {
  const point = failingRed.zone.center;
  const bearing = nearestSegmentBearing(point, currentRoute.coordinates);
  if (bearing === null) return null;

  for (const offsetBearing of [bearing + 90, bearing - 90]) {
    const escapePoint = offsetPoint(point, offsetBearing, failingRed.zone.radiusMeters + 30);
    const combinedVias = [...orderedGreenWaypoints, escapePoint].sort(
      (a, b) => routeProgress(a, currentRoute.coordinates) - routeProgress(b, currentRoute.coordinates)
    );

    try {
      const candidate = await fetchViaChain(origin, combinedVias, destination, signal, debug);
      const stillFails = validateRedZones([failingRed.zone], candidate).some((v) => !v.pass);
      if (!stillFails) {
        if (debug) {
          console.debug(
            `[SENDA ROUTING] escape de rojo (${failingRed.zone.signal.id}) logrado, rumbo ${Math.round(offsetBearing)}°`
          );
        }
        return candidate;
      }
    } catch (error) {
      if ((error as Error)?.name === "AbortError") throw error;
      // Intento fallido (calle no transitable, etc.): probar el otro rumbo.
    }
  }

  if (debug) {
    console.debug(
      `[SENDA ROUTING] no se encontró alternativa peatonal real para evitar el rojo ${failingRed.zone.signal.id}`
    );
  }
  return null;
}

export type AccessibleRouteResult = {
  route: RouteData | null;
  status: AccessibleRouteStatus;
  errorMessage: string | null;
  mandatoryWaypoints: MandatoryWaypoint[];
  greenValidation: GreenValidation[];
  redZones: RedExclusionZone[];
  redValidation: RedValidation[];
  // false si algún verde obligatorio o algún rojo obligatorio no pasó la
  // validación matemática real sobre la geometría final (secciones 8/9).
  isValid: boolean;
  // Subconjunto de `redValidation` que sigue sin evitarse: es lo único que
  // debe disparar el aviso "no pudimos evitar esta señalización" en la UI.
  hasUnavoidableRed: boolean;
  // Ids ya considerados por ESTE cálculo (radar + validación) — para que
  // useRouteNavigation no dispare un recálculo redundante por algo que ya
  // se tuvo en cuenta.
  knownGreenSignalIds: string[];
  knownRedSignalIds: string[];
};

const EMPTY_RESULT: AccessibleRouteResult = {
  route: null,
  status: "idle",
  errorMessage: null,
  mandatoryWaypoints: [],
  greenValidation: [],
  redZones: [],
  redValidation: [],
  isValid: true,
  hasUnavoidableRed: false,
  knownGreenSignalIds: [],
  knownRedSignalIds: [],
};

// Orquesta el algoritmo de ruteo accesible completo (ver lib/accessibleRouting.ts
// para la geometría/validación pura):
//
//   origin + destination
//     → ruta peatonal base (corredor de búsqueda, sección 1)
//     → radar de 200m: detectar verdes/rojos relevantes para el Perfil (2/3/7)
//     → snap de cada verde a la red peatonal (4)
//     → ordenar los verdes de origen a destino (5)
//     → pedir al motor: origin → green1 → green2 → ... → destination,
//       en un solo trayecto real si el motor lo soporta, por tramos +
//       unión si no (6)
//     → validar matemáticamente que la geometría final pasó por cada verde
//       y no entró en la zona de exclusión de ningún rojo (8/9); si un
//       rojo falla, reintentar con un punto de escape real
//
// Reemplaza a useRoute + useRouteCandidates + chooseBestRoute: acá un verde
// obligatorio se inserta literalmente como parada intermedia del cálculo,
// no compite por un puntaje.
export function useAccessibleRoute(
  origin: RoutePoint | null,
  destination: RoutePoint | null,
  relevantSignals: SignalWithTrust[]
): AccessibleRouteResult {
  const [result, setResult] = useState<AccessibleRouteResult>(EMPTY_RESULT);
  const requestIdRef = useRef(0);

  const originLat = origin?.lat ?? null;
  const originLng = origin?.lng ?? null;
  const destLat = destination?.lat ?? null;
  const destLng = destination?.lng ?? null;

  useEffect(() => {
    if (originLat === null || originLng === null || destLat === null || destLng === null) {
      // Sincroniza con el cambio de origen/destino (sistema externo): no es
      // derivable en render, mismo patrón que useRoute.ts.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResult(EMPTY_RESULT);
      return;
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    const originPoint = { lat: originLat, lng: originLng };
    const destinationPoint = { lat: destLat, lng: destLng };
    const debug = process.env.NODE_ENV !== "production";

    setResult((current) => ({ ...current, status: "loading", errorMessage: null }));

    (async () => {
      try {
        // 1) Ruta base: define el corredor de búsqueda, NO necesariamente la final.
        const baseRoutes = await fetchAlternatives(originPoint, destinationPoint, controller.signal);
        if (requestIdRef.current !== requestId) return;
        const baseRoute = fastestOf(baseRoutes);

        if (debug) {
          console.debug("[SENDA ROUTING]");
          console.debug("Ruta base calculada:", {
            distance: `${Math.round(baseRoute.distanceMeters)}m`,
            duration: `${Math.round(baseRoute.durationSeconds)}s`,
          });

          const greenLabels = [
            ...new Set(
              relevantSignals
                .filter((s) => resolveSignal(s.type).category === "help")
                .map((s) => resolveSignal(s.type).label)
            ),
          ];
          const redLabels = [
            ...new Set(
              relevantSignals
                .filter((s) => resolveSignal(s.type).category === "obstacle")
                .map((s) => resolveSignal(s.type).label)
            ),
          ];
          console.debug("Preferencias verdes activas:", greenLabels);
          console.debug("Preferencias rojas activas:", redLabels);
        }

        // 2/3/7) Radar de 200m — SOLO detección, nunca "pasar cerca cuenta
        // como haber pasado por ahí".
        const { greens: detectedGreens, reds: detectedReds } = detectSignalsInCorridor(
          relevantSignals,
          baseRoute
        );
        if (debug) {
          console.debug(
            `Verdes detectados dentro de ${GREEN_DETECTION_RADIUS_METERS}m:`,
            detectedGreens.map((s) => ({ id: s.id, type: s.type }))
          );
          console.debug(
            `Rojos detectados dentro de ${RED_DETECTION_RADIUS_METERS}m:`,
            detectedReds.map((s) => ({ id: s.id, type: s.type }))
          );
        }

        // 4) Snap de cada verde a la red peatonal.
        if (debug) console.debug("GREEN WAYPOINTS DETECTED:", detectedGreens.map((s) => s.id));
        const mandatoryWaypoints: MandatoryWaypoint[] = [];
        for (const signal of detectedGreens) {
          const markerCoordinate = { lat: signal.latitude, lng: signal.longitude };
          const snapped = await fetchNearest(markerCoordinate, controller.signal);
          if (requestIdRef.current !== requestId) return;

          if (snapped && snapped.snapDistanceMeters > SNAP_MAX_DISTANCE_METERS) {
            if (debug) {
              console.debug(
                `[SENDA ROUTING] verde ${signal.id} descartado: punto transitable más cercano a ` +
                  `${Math.round(snapped.snapDistanceMeters)}m (> ${SNAP_MAX_DISTANCE_METERS}m)`
              );
            }
            continue;
          }

          const routingWaypoint = snapped ? { lat: snapped.lat, lng: snapped.lng } : markerCoordinate;
          if (debug) {
            console.debug(`GREEN ORIGINAL (${signal.id}): lat=${markerCoordinate.lat} lng=${markerCoordinate.lng}`);
            console.debug(`GREEN SNAPPED (${signal.id}): lat=${routingWaypoint.lat} lng=${routingWaypoint.lng}`);
            console.debug(
              `DISTANCE ORIGINAL → SNAPPED (${signal.id}): ${
                snapped ? `${Math.round(snapped.snapDistanceMeters)} metros` : "sin snap disponible, se usa la coordenada cruda"
              }`
            );
          }

          mandatoryWaypoints.push({
            signal,
            markerCoordinate,
            routingWaypoint,
            snapDistanceMeters: snapped?.snapDistanceMeters ?? null,
          });
        }

        // 5) Orden origen → destino.
        const orderedWaypoints = orderWaypointsAlongRoute(mandatoryWaypoints, baseRoute);
        if (debug) {
          console.debug(
            "GREEN WAYPOINTS SNAPPED (orden origen → destino):",
            orderedWaypoints.map((w) => ({ id: w.signal.id, routingWaypoint: w.routingWaypoint }))
          );
          console.debug(
            "Mandatory waypoints:",
            orderedWaypoints.map((w) => ({ id: w.signal.id, type: w.signal.type }))
          );
        }

        const redZones = buildRedExclusionZones(detectedReds);

        // 6) Un solo trayecto real que pasa por TODOS los verdes obligatorios.
        let finalRoute = await computeRouteThroughWaypoints(
          originPoint,
          destinationPoint,
          orderedWaypoints.map((w) => w.routingWaypoint),
          baseRoute,
          controller.signal,
          debug
        );
        if (requestIdRef.current !== requestId) return;

        // 8/9) Validación real + reintento de escape para rojos que la
        // geometría final todavía atraviesa.
        let greenValidation = validateGreenWaypoints(orderedWaypoints, finalRoute);
        let redValidation = validateRedZones(redZones, finalRoute);

        const firstFailingRed = redValidation.find((v) => !v.pass);
        if (firstFailingRed) {
          const escaped = await tryEscapeRedZone(
            originPoint,
            destinationPoint,
            orderedWaypoints.map((w) => w.routingWaypoint),
            firstFailingRed,
            finalRoute,
            controller.signal,
            debug
          );
          if (requestIdRef.current !== requestId) return;
          if (escaped) {
            finalRoute = escaped;
            greenValidation = validateGreenWaypoints(orderedWaypoints, finalRoute);
            redValidation = validateRedZones(redZones, finalRoute);
          }
        }

        if (debug) {
          for (const v of greenValidation) {
            const id = v.waypoint.signal.id;
            console.debug(`Validación ${resolveSignal(v.waypoint.signal.type).label} (${id}):`);
            console.debug(`distancia a ruta (vs. marcador crudo) = ${Math.round(v.distanceToRouteMeters)} metros`);
            console.debug(v.pass ? "PASS" : "FAIL");
            console.debug(
              `DISTANCE FINAL ROUTE → GREEN SNAPPED (${id}): ${Math.round(v.distanceToSnappedMeters)} metros ` +
                `(esperado ~0-10m si el motor honró el via) — ${v.snappedPass ? "PASS" : "FAIL"}`
            );
          }
          for (const v of redValidation) {
            console.debug(`Validación RED ${resolveSignal(v.zone.signal.type).label} (${v.zone.signal.id}):`);
            console.debug(`distancia mínima = ${Math.round(v.minDistanceToRouteMeters)} metros`);
            console.debug(v.pass ? "PASS" : "FAIL");
          }

          // Checklist final pedido explícitamente, por cada verde detectado
          // en el radar (incluyendo los descartados en el snap, para que
          // quede claro en qué paso se cayó cada uno si algo falla).
          for (const signal of detectedGreens) {
            const wasAddedAsWaypoint = mandatoryWaypoints.some((w) => w.signal.id === signal.id);
            const wasSentToEngine = orderedWaypoints.some((w) => w.signal.id === signal.id);
            const validation = greenValidation.find((v) => v.waypoint.signal.id === signal.id);
            console.debug(`--- checklist verde ${signal.id} (${resolveSignal(signal.type).label}) ---`);
            console.debug("GREEN DETECTED =", true);
            console.debug("GREEN ACTIVE IN PROFILE =", true); // detectedGreens ya sale de relevantSignals (Perfil).
            console.debug("GREEN ADDED AS WAYPOINT =", wasAddedAsWaypoint);
            console.debug("GREEN SENT TO ROUTING ENGINE =", wasSentToEngine);
            console.debug(
              "DISTANCE ROUTE TO GREEN SNAPPED =",
              validation ? `${Math.round(validation.distanceToSnappedMeters)} meters` : "n/a"
            );
            console.debug("WAYPOINT PASSED =", validation ? validation.pass : false);
          }
        }

        const isValid = greenValidation.every((v) => v.pass) && redValidation.every((v) => v.pass);
        if (debug) console.debug("FINAL ROUTE VALID =", isValid);

        setResult({
          route: finalRoute,
          status: "success",
          errorMessage: null,
          mandatoryWaypoints: orderedWaypoints,
          greenValidation,
          redZones,
          redValidation,
          isValid,
          hasUnavoidableRed: redValidation.some((v) => !v.pass),
          knownGreenSignalIds: orderedWaypoints.map((w) => w.signal.id),
          knownRedSignalIds: redZones.map((z) => z.signal.id),
        });
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return;
        if (requestIdRef.current !== requestId) return;
        const reason = error instanceof RouteFetchError ? error.reason : undefined;
        setResult({ ...EMPTY_RESULT, status: "error", errorMessage: messageForReason(reason) });
      }
    })();

    return () => controller.abort();
  }, [originLat, originLng, destLat, destLng, relevantSignals]);

  return result;
}
