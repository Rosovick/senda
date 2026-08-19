// Algoritmo de ruteo accesible: geometría y validación PURAS (sin React, sin
// fetch) — la orquestación real (pedirle rutas al motor, snap, reintentos)
// vive en hooks/useAccessibleRoute.ts, que es quien de verdad habla con
// /api/route y /api/route/nearest. Separar esto en dos capas permite probar
// la lógica (radar, orden, validación) con datos sintéticos, sin red.
//
// Reemplaza al enfoque anterior de "candidatas + score" (chooseBestRoute):
// acá un verde obligatorio no compite por ganar un puntaje — se inserta
// literalmente como parada intermedia en el pedido real al motor
// (fetchRouteViaPoints, lib/routing.ts). La ruta resultante ES la que pasa
// por ahí, por construcción, no "la que más probablemente pase cerca".
import { resolveSignal } from "./reports";
import { distanceMeters, distanceToRouteMeters, SIGNAL_ROUTE_RADIUS_METERS } from "./routeSignals";
import type { RouteData, RoutePoint, RouteStep } from "./routing";
import type { SignalWithTrust } from "@/hooks/useSignals";

// "Radar" de 200 m (aprox. dos cuadras): SOLO sirve para DETECTAR qué
// señalizaciones son relevantes para este trayecto — nunca significa "pasar
// a 200 m ya cuenta como haber pasado por ahí" (para eso existe
// GREEN_VALIDATION_RADIUS_METERS/RED_EXCLUSION_RADIUS_METERS, mucho más
// estrictos, más abajo).
export const GREEN_DETECTION_RADIUS_METERS = 200;
export const RED_DETECTION_RADIUS_METERS = 200;

// Validación matemática real de "la geometría final pasó por acá" — mismo
// radio que ya usaba el resto del sistema para tolerancia peatonal
// (ancho de calle + vereda, ver SIGNAL_ROUTE_RADIUS_METERS en
// lib/routeSignals.ts): una sola fuente de verdad para "esto está sobre la
// ruta", reutilizada acá con el nombre que usa esta política.
export const GREEN_VALIDATION_RADIUS_METERS = SIGNAL_ROUTE_RADIUS_METERS;

// Chequeo de diagnóstico, más estricto: distancia entre la geometría final
// y el punto SNAPPEADO (no el marcador crudo) que efectivamente se envió al
// motor como `via`. Si el motor realmente honró ese via, esto tiene que dar
// ~0 m casi siempre (la polyline pasa literalmente por ese nodo de la red).
// Si da mucho más que esto, es la señal más directa de que el via NO llegó
// a formar parte del pedido real — distinto de GREEN_VALIDATION_RADIUS_METERS
// (que mide contra el marcador crudo, para la UX real).
export const WAYPOINT_VALIDATION_RADIUS_METERS = 10;

// Zona de exclusión REAL alrededor de un obstáculo activo — más chica que
// el radar de detección a propósito: el radar decide SI el obstáculo es
// relevante para el trayecto, esto decide si la geometría final
// efectivamente lo atraviesa.
export const RED_EXCLUSION_RADIUS_METERS = 25;

// Si el punto transitable más cercano (fetchNearestWalkablePoint) está más
// lejos que esto, el marcador se considera un dato corrupto/inalcanzable a
// pie (p.ej. un pin en medio de una plaza sin sendas mapeadas) y NO se
// fuerza como waypoint — forzar un via inalcanzable haría fallar el pedido
// de ruta completo. Deliberadamente generoso (una plaza grande, un pin al
// costado de una vía rápida sin vereda mapeada) para que esto nunca
// descarte una señalización real por ser un poco imprecisa.
export const SNAP_MAX_DISTANCE_METERS = 120;

export type MandatoryWaypoint = {
  signal: SignalWithTrust;
  markerCoordinate: RoutePoint;
  // Coordenada realmente enviada al motor de ruteo — tras snap a la red
  // peatonal (fetchNearestWalkablePoint) o, si el snap no estuvo
  // disponible, la coordenada cruda (el motor la snappea igual al rutear).
  routingWaypoint: RoutePoint;
  snapDistanceMeters: number | null;
};

export type RedExclusionZone = {
  signal: SignalWithTrust;
  center: RoutePoint;
  radiusMeters: number;
};

export type GreenValidation = {
  waypoint: MandatoryWaypoint;
  distanceToRouteMeters: number;
  pass: boolean;
  // Diagnóstico: distancia de la geometría final al punto SNAPPEADO
  // específicamente (ver WAYPOINT_VALIDATION_RADIUS_METERS) — prueba
  // directa de que el motor realmente recibió y honró este `via`.
  distanceToSnappedMeters: number;
  snappedPass: boolean;
};

export type RedValidation = {
  zone: RedExclusionZone;
  minDistanceToRouteMeters: number;
  pass: boolean;
};

// Señalizaciones relevantes (ya filtradas por Perfil: solo categorías
// ACTIVADAS — ver getRelevantSignalsForProfile en lib/routeSignals.ts, que
// sigue siendo la única fuente de "esto le importa a este Perfil") que
// caen dentro del radar de detección alrededor del corredor base. Separado
// por categoría porque verdes y rojos se tratan completamente distinto de
// acá en adelante.
export function detectSignalsInCorridor(
  relevantSignals: SignalWithTrust[],
  baseRoute: RouteData
): { greens: SignalWithTrust[]; reds: SignalWithTrust[] } {
  const greens: SignalWithTrust[] = [];
  const reds: SignalWithTrust[] = [];

  for (const signal of relevantSignals) {
    const category = resolveSignal(signal.type).category;
    if (!category) continue;

    const point = { lat: signal.latitude, lng: signal.longitude };
    if (category === "help") {
      if (distanceToRouteMeters(point, baseRoute.coordinates) <= GREEN_DETECTION_RADIUS_METERS) {
        greens.push(signal);
      }
    } else {
      if (distanceToRouteMeters(point, baseRoute.coordinates) <= RED_DETECTION_RADIUS_METERS) {
        reds.push(signal);
      }
    }
  }

  return { greens, reds };
}

// "Avance" a lo largo de una ruta de referencia del punto más cercano a
// `point`: índice del segmento + fracción dentro de ese segmento (0-1), así
// "más adelante en la ruta" siempre da un número mayor. Sirve para ordenar
// varios waypoints obligatorios en el orden real en que se los va a
// encontrar caminando (sección 5 del pedido: nunca en el orden en que
// vienen guardados) — encadenarlos fuera de orden le pediría al motor un
// camino con retrocesos que ninguna persona caminaría así.
export function routeProgress(
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
// misma proyección local en plano que routeProgress. Usado solo para
// construir un punto de escape perpendicular cuando un rojo obligatorio
// termina sobre la ruta (ver buildRedEscapeCandidate).
export function nearestSegmentBearing(
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

const EARTH_RADIUS_METERS = 6371000;

// Punto ubicado a `distanceMetersAway` de `point`, en dirección
// `bearingDegrees` (0 = norte, 90 = este) — fórmula esférica estándar de
// "destino dado rumbo y distancia".
export function offsetPoint(
  point: { lat: number; lng: number },
  bearingDegrees: number,
  distanceMetersAway: number
): { lat: number; lng: number } {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const angularDistance = distanceMetersAway / EARTH_RADIUS_METERS;
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

// Ordena los waypoints obligatorios por avance real a lo largo de la ruta
// de referencia (origin → ... → destination en el orden en que se los va a
// encontrar caminando).
export function orderWaypointsAlongRoute(
  waypoints: MandatoryWaypoint[],
  referenceRoute: RouteData
): MandatoryWaypoint[] {
  return [...waypoints].sort(
    (a, b) =>
      routeProgress(a.routingWaypoint, referenceRoute.coordinates) -
      routeProgress(b.routingWaypoint, referenceRoute.coordinates)
  );
}

export function buildRedExclusionZones(
  detectedReds: SignalWithTrust[],
  radiusMeters: number = RED_EXCLUSION_RADIUS_METERS
): RedExclusionZone[] {
  return detectedReds.map((signal) => ({
    signal,
    center: { lat: signal.latitude, lng: signal.longitude },
    radiusMeters,
  }));
}

// Verificación REAL (sección 8 del pedido): para cada verde obligatorio,
// distancia mínima entre su coordenada de MARCADOR (la ubicación real de la
// rampa/cruce, no la snappeada — lo que importa es si el peatón realmente
// pasa al lado de la condición física) y la geometría final. Estar dentro
// del radar de 200 m NUNCA cuenta como "pasó por acá": solo esto lo hace.
export function validateGreenWaypoints(
  waypoints: MandatoryWaypoint[],
  finalRoute: RouteData
): GreenValidation[] {
  return waypoints.map((waypoint) => {
    const distance = distanceToRouteMeters(waypoint.markerCoordinate, finalRoute.coordinates);
    const distanceToSnapped = distanceToRouteMeters(waypoint.routingWaypoint, finalRoute.coordinates);
    return {
      waypoint,
      distanceToRouteMeters: distance,
      pass: distance <= GREEN_VALIDATION_RADIUS_METERS,
      distanceToSnappedMeters: distanceToSnapped,
      snappedPass: distanceToSnapped <= WAYPOINT_VALIDATION_RADIUS_METERS,
    };
  });
}

// Verificación REAL (sección 9 del pedido): la geometría final NO debe
// entrar en la zona de exclusión de ningún rojo obligatorio.
export function validateRedZones(zones: RedExclusionZone[], finalRoute: RouteData): RedValidation[] {
  return zones.map((zone) => {
    const distance = distanceToRouteMeters(zone.center, finalRoute.coordinates);
    return { zone, minDistanceToRouteMeters: distance, pass: distance > zone.radiusMeters };
  });
}

// Une N tramos reales (cada uno ya un RouteData real devuelto por el motor)
// en UNA sola polyline continua, con distancia/duración = suma de TODOS los
// tramos (sección 6 del pedido) — usado solo cuando el motor no admite (o
// falla) un pedido con múltiples `via` en una sola llamada. El punto final
// de un tramo y el inicial del siguiente son el mismo punto real (el
// waypoint compartido): se descarta el duplicado para no repetir el punto
// en la polyline.
export function mergeRouteSegments(segments: RouteData[]): RouteData {
  if (segments.length === 0) {
    throw new Error("mergeRouteSegments: no hay tramos para unir");
  }
  if (segments.length === 1) return segments[0];

  const coordinates: [number, number][] = [];
  let distanceMetersTotal = 0;
  let durationSecondsTotal = 0;
  const steps: RouteStep[] = [];

  segments.forEach((segment, index) => {
    const segmentCoordinates =
      index === 0 ? segment.coordinates : segment.coordinates.slice(1); // el primer punto repite el último del tramo anterior.
    coordinates.push(...segmentCoordinates);
    distanceMetersTotal += segment.distanceMeters;
    durationSecondsTotal += segment.durationSeconds;
    steps.push(...segment.steps);
  });

  return {
    coordinates,
    distanceMeters: distanceMetersTotal,
    durationSeconds: durationSecondsTotal,
    steps,
  };
}

// Distancia real entre dos coordenadas — re-exportado acá por conveniencia
// para quien orquesta (useAccessibleRoute) sin tener que importar de dos
// módulos distintos para lo mismo.
export { distanceMeters };
