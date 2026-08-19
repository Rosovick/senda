// Genera puntos "vía" reales para pedirle al motor rutas adicionales
// cuando `alternatives=true` (fetchRouteAlternatives, lib/routing.ts) no
// alcanza — confirmado en vivo contra el endpoint público: en trayectos
// urbanos cortos, típicos de una prueba de señalización puntual, OSRM
// frecuentemente devuelve UNA sola ruta. Sin una segunda geometría real
// entre las que elegir, chooseBestRoute (lib/routeSignals.ts) no tiene
// nada que favorecer, por más que el bonus/penalización esté bien
// calculado.
//
// Cada punto que arma este archivo se usa con fetchRouteViaPoints: el motor
// sigue calculando un recorrido peatonal 100% real sobre la red vial, solo
// que forzado a pasar por ahí — nunca se dibuja ni ajusta una geometría a
// mano (ver useRouteCandidates, que hace el fetch real y le pasa el
// resultado a chooseBestRoute exactamente igual que a cualquier
// alternativa nativa).
import { resolveSignal } from "./reports";
import {
  distanceToRouteMeters,
  getSignalsNearRoute,
  SIGNAL_ROUTE_RADIUS_METERS,
} from "./routeSignals";
import type { RouteData } from "./routing";
import type { SignalWithTrust } from "@/hooks/useSignals";

const EARTH_RADIUS_METERS = 6371000;

// Punto ubicado a `distanceMeters` de `point`, en dirección
// `bearingDegrees` (0 = norte, 90 = este) — fórmula esférica estándar de
// "destino dado rumbo y distancia". Misma precisión que el resto del
// módulo de señalizaciones (haversine): suficiente a escala de
// calle/cuadra, no pretende exactitud geodésica.
export function destinationPoint(
  point: { lat: number; lng: number },
  bearingDegrees: number,
  distanceMeters: number
): { lat: number; lng: number } {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const angularDistance = distanceMeters / EARTH_RADIUS_METERS;
  const bearing = toRad(bearingDegrees);
  const lat1 = toRad(point.lat);
  const lng1 = toRad(point.lng);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );

  return { lat: toDeg(lat2), lng: toDeg(lng2) };
}

// "Avance" a lo largo de la ruta del punto más cercano a `point`: índice del
// segmento + fracción dentro de ese segmento (0-1), así "más adelante en la
// ruta" siempre da un número mayor. Sirve para ordenar varias señalizaciones
// obligatorias en el orden real en que se las va a encontrar caminando —
// necesario para armar un vía-encadenado (buildAllHelpsChainViaCandidate)
// sin pedirle al peatón zigzaguear. Misma proyección local en plano (a
// escala de cuadra no hace falta más) que ya usa distanceToRouteMeters en
// lib/routeSignals.ts.
function routeProgress(
  point: { lat: number; lng: number },
  routeCoordinates: [number, number][]
): number {
  if (routeCoordinates.length < 2) return 0;

  const toXY = (p: { lat: number; lng: number }) => ({
    x: p.lng * Math.cos((point.lat * Math.PI) / 180),
    y: p.lat,
  });
  const pXY = toXY(point);

  let minDistSq = Infinity;
  let bestProgress = 0;

  for (let i = 0; i < routeCoordinates.length - 1; i++) {
    const [lat1, lng1] = routeCoordinates[i];
    const [lat2, lng2] = routeCoordinates[i + 1];
    const aXY = toXY({ lat: lat1, lng: lng1 });
    const bXY = toXY({ lat: lat2, lng: lng2 });
    const dx = bXY.x - aXY.x;
    const dy = bXY.y - aXY.y;
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq === 0) continue;

    let t = ((pXY.x - aXY.x) * dx + (pXY.y - aXY.y) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));
    const closestX = aXY.x + t * dx;
    const closestY = aXY.y + t * dy;
    const distSq = (pXY.x - closestX) ** 2 + (pXY.y - closestY) ** 2;

    if (distSq < minDistSq) {
      minDistSq = distSq;
      bestProgress = i + t;
    }
  }

  return bestProgress;
}

// Rumbo (grados, 0-360) del segmento de la ruta más cercano a `point` —
// misma proyección local en plano (a escala de cuadra no hace falta más)
// que ya usa distanceToRouteMeters en lib/routeSignals.ts, reimplementada
// acá porque además necesitamos el rumbo del segmento, no solo la
// distancia mínima.
function nearestSegmentBearing(
  point: { lat: number; lng: number },
  routeCoordinates: [number, number][]
): number | null {
  if (routeCoordinates.length < 2) return null;

  const toXY = (p: { lat: number; lng: number }) => ({
    x: p.lng * Math.cos((point.lat * Math.PI) / 180),
    y: p.lat,
  });
  const pXY = toXY(point);

  let minDistSq = Infinity;
  let bestBearing: number | null = null;

  for (let i = 0; i < routeCoordinates.length - 1; i++) {
    const [lat1, lng1] = routeCoordinates[i];
    const [lat2, lng2] = routeCoordinates[i + 1];
    const a = { lat: lat1, lng: lng1 };
    const b = { lat: lat2, lng: lng2 };
    const aXY = toXY(a);
    const bXY = toXY(b);
    const dx = bXY.x - aXY.x;
    const dy = bXY.y - aXY.y;
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq === 0) continue;

    let t = ((pXY.x - aXY.x) * dx + (pXY.y - aXY.y) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));
    const closestX = aXY.x + t * dx;
    const closestY = aXY.y + t * dy;
    const distSq = (pXY.x - closestX) ** 2 + (pXY.y - closestY) ** 2;

    if (distSq < minDistSq) {
      minDistSq = distSq;
      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const toDeg = (rad: number) => (rad * 180) / Math.PI;
      const y = Math.sin(toRad(lng2 - lng1)) * Math.cos(toRad(lat2));
      const x =
        Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
        Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lng2 - lng1));
      bestBearing = (toDeg(Math.atan2(y, x)) + 360) % 360;
    }
  }

  return bestBearing;
}

export type ViaCandidateRequest = {
  key: string;
  // Uno o más puntos, visitados EN ESTE ORDEN — más de uno solo lo produce
  // buildAllHelpsChainViaCandidate, para pedirle al motor un único trayecto
  // real que encadene varias señalizaciones obligatorias.
  vias: { lat: number; lng: number }[];
  reason: "help" | "avoid";
  signalIds: string[];
};

// Política de accesibilidad-primero: TODA señalización de ayuda relevante
// para el Perfil (categoría "verde" activada) dentro del corredor natural
// entre origen y destino es un punto de paso obligatorio, sin importar su
// estado de confirmación (ver chooseBestRoute en lib/routeSignals.ts). Este
// radio de generación ES ese corredor natural: más allá de acá ya no tiene
// sentido peatonal desviarse.
//
// 450m: la SANIDAD del desvío (nunca si corresponde intentarlo) la decide
// SANITY_MAX_DETOUR_RATIO en chooseBestRoute (lib/routeSignals.ts),
// comparando la DURACIÓN real de la candidata generada — un radio de
// generación más chico acá no evita desvíos absurdos (para eso ya está el
// ratio de sanidad), solo arriesga con no intentar siquiera una alternativa
// que hubiera sido perfectamente razonable.
const HELP_VIA_GENERATION_RADIUS_METERS = 450;
// Tope de candidatas INDIVIDUALES (una por señalización) para no perforar
// de pedidos al servicio público de rutas — buildAllHelpsChainViaCandidate,
// abajo, complementa esto con UN pedido que intenta encadenarlas TODAS.
const MAX_HELP_VIA_CANDIDATES = 3;

// Ayudas obligatorias (ya filtradas por Perfil) que ninguna alternativa
// nativa cubre todavía, cada una como candidata individual — ordenadas por
// cercanía real a la ruta de referencia (la más rápida entre las que
// devolvió el motor) y limitadas a un radio razonable de generación. Ver
// buildAllHelpsChainViaCandidate para el intento de cubrirlas TODAS en un
// solo trayecto real.
export function buildHelpViaCandidates(
  relevantSignals: SignalWithTrust[],
  referenceRoute: RouteData
): ViaCandidateRequest[] {
  const helpSignals = relevantSignals.filter(
    (signal) => resolveSignal(signal.type).category === "help"
  );
  const alreadyCovered = new Set(
    getSignalsNearRoute(helpSignals, referenceRoute.coordinates, SIGNAL_ROUTE_RADIUS_METERS).map(
      (signal) => signal.id
    )
  );

  return helpSignals
    .filter((signal) => !alreadyCovered.has(signal.id))
    .map((signal) => ({
      signal,
      distance: distanceToRouteMeters(
        { lat: signal.latitude, lng: signal.longitude },
        referenceRoute.coordinates
      ),
    }))
    .filter(({ distance }) => distance <= HELP_VIA_GENERATION_RADIUS_METERS)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, MAX_HELP_VIA_CANDIDATES)
    .map(({ signal }) => ({
      key: `help:${signal.id}`,
      vias: [{ lat: signal.latitude, lng: signal.longitude }],
      reason: "help" as const,
      signalIds: [signal.id],
    }));
}

// Único pedido que encadena, EN UN SOLO trayecto real, TODAS las ayudas
// obligatorias dentro del corredor natural (no solo las hasta
// MAX_HELP_VIA_CANDIDATES más cercanas) — la forma más directa de cumplir
// "la ruta debe pasar obligatoriamente por las señalizaciones verdes
// activadas dentro del corredor", en vez de depender de que coincidan por
// casualidad en una de las candidatas individuales. Se ordenan por
// `routeProgress` sobre la ruta de referencia para visitarlas en el orden
// real en que aparecen caminando, no en el orden en que están guardadas —
// encadenarlas fuera de orden le pediría al motor un camino con
// retrocesos que ninguna persona caminaría así. Devuelve null si no hay
// ninguna ayuda relevante en el corredor (nada que encadenar).
export function buildAllHelpsChainViaCandidate(
  relevantSignals: SignalWithTrust[],
  referenceRoute: RouteData
): ViaCandidateRequest | null {
  const helpSignals = relevantSignals.filter(
    (signal) => resolveSignal(signal.type).category === "help"
  );

  const withinCorridor = helpSignals
    .map((signal) => ({
      signal,
      distance: distanceToRouteMeters(
        { lat: signal.latitude, lng: signal.longitude },
        referenceRoute.coordinates
      ),
      progress: routeProgress(
        { lat: signal.latitude, lng: signal.longitude },
        referenceRoute.coordinates
      ),
    }))
    .filter(({ distance }) => distance <= HELP_VIA_GENERATION_RADIUS_METERS)
    .sort((a, b) => a.progress - b.progress);

  if (withinCorridor.length === 0) return null;

  return {
    key: `help-chain:${withinCorridor.map(({ signal }) => signal.id).join(",")}`,
    vias: withinCorridor.map(({ signal }) => ({ lat: signal.latitude, lng: signal.longitude })),
    reason: "help",
    signalIds: withinCorridor.map(({ signal }) => signal.id),
  };
}

// Solo se llama cuando, tras sumar las candidatas de ayuda, la mejor
// alternativa TODAVÍA no logra evitar un obstáculo relevante (categoría
// "quiero evitar" activada en Perfil — obligatoria sin importar su estado
// de confirmación, ver chooseBestRoute en lib/routeSignals.ts). Un
// desplazamiento perpendicular al rumbo real de la ruta en ese punto busca
// si existe una calle paralela real cerca — el motor decide si ese punto
// cae sobre una vía transitable o vuelve a snappear a la misma calle (en
// cuyo caso la ruta resultante no cambia nada, y chooseBestRoute
// simplemente no la prefiere).
const OBSTACLE_OFFSET_METERS = 55;
// Ya no solo "confirmed" es obligatorio: cualquier obstáculo relevante
// puede serlo, así que conviene intentar escapar de más de uno por vez
// (antes alcanzaba con 1 porque solo los confirmados forzaban la ruta).
const MAX_OBSTACLE_SIGNALS_FOR_ESCAPE = 3;

export function buildObstacleEscapeViaCandidates(
  bestRoute: RouteData,
  obstacleSignals: SignalWithTrust[]
): ViaCandidateRequest[] {
  const requests: ViaCandidateRequest[] = [];

  for (const signal of obstacleSignals.slice(0, MAX_OBSTACLE_SIGNALS_FOR_ESCAPE)) {
    const point = { lat: signal.latitude, lng: signal.longitude };
    const bearing = nearestSegmentBearing(point, bestRoute.coordinates);
    if (bearing === null) continue;

    [bearing + 90, bearing - 90].forEach((offsetBearing, index) => {
      requests.push({
        key: `avoid:${signal.id}:${index}`,
        vias: [destinationPoint(point, offsetBearing, OBSTACLE_OFFSET_METERS)],
        reason: "avoid",
        signalIds: [signal.id],
      });
    });
  }

  return requests;
}
