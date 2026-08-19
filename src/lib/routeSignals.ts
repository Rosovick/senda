// Capa de integración Perfil ↔ Señalizaciones ↔ Mapa/Ruta. Lógica pura (sin
// React, sin Leaflet): /ruta la consume, pero no depende de ella.
import type {
  RouteAvoidPreferences,
  RouteNeedPreferences,
} from "@/hooks/useProfilePreferences";
import type { SignalWithTrust } from "@/hooks/useSignals";
import {
  isSignalType,
  resolveSignal,
  SIGNAL_TYPE_SEVERITY,
  type ReportStatus,
  type SignalCategory,
  type SignalType,
} from "./reports";
import type { RouteData } from "./routing";

// Estados que pueden aparecer como señalización activa en el mapa de /ruta
// (sección 9 de la tarea): NEW y CONFIRMED con prioridad normal,
// UNDER_REVIEW/POSSIBLY_RESOLVED existen pero se atenúan visualmente en el
// marcador (ver routeSignalMarkers.ts). RESOLVED y WITHDRAWN nunca
// aparecen como activas: siguen existiendo (no se borran), simplemente no
// participan del mapa de navegación.
export const MAP_VISIBLE_STATUSES: ReadonlySet<ReportStatus> = new Set([
  "new",
  "confirmed",
  "under_review",
  "possibly_resolved",
]);

// Sección 5: el mapeo Perfil ↔ SignalType ya existe de forma implícita en
// la arquitectura actual — RouteNeedPreferences/RouteAvoidPreferences
// (useProfilePreferences.ts) usan exactamente las mismas 12 claves que
// SignalType (lib/reports.ts). Nunca se compara texto visible: se compara
// la misma clave interna en ambos lados.
export function isSignalRelevantToProfile(
  type: SignalType,
  needs: RouteNeedPreferences,
  avoids: RouteAvoidPreferences
): boolean {
  if (type in needs) return needs[type as keyof RouteNeedPreferences];
  if (type in avoids) return avoids[type as keyof RouteAvoidPreferences];
  return false;
}

// Única función central de "esto es una señalización válida y visible" —
// activa (nunca withdrawn), en un estado que corresponde mostrar (nunca
// resolved) y con un `type` reconocido (nunca datos corruptos/de un modelo
// anterior). Es la MISMA colección que ya usa /reportes (activeSignals =
// signals.filter(s => s.isActive) en ReportsScreen) más el único filtro
// extra que el mapa de /ruta necesita (MAP_VISIBLE_STATUSES + type válido)
// — nunca una fuente de datos distinta, nunca un segundo localStorage.
// Tanto el mapa de /ruta (mostrar TODAS las válidas) como
// getRelevantSignalsForProfile (además filtrar por Perfil, para el
// cálculo de la ruta) parten de acá: una sola implementación de "qué es
// válido", nunca dos.
export function getMapVisibleSignals(signals: SignalWithTrust[]): SignalWithTrust[] {
  return signals.filter((signal) => {
    if (!signal.isActive) return false;
    if (!MAP_VISIBLE_STATUSES.has(signal.status)) return false;
    if (!isSignalType(signal.type)) return false;
    return true;
  });
}

// Sección 6: única función central de relevancia PARA EL CÁLCULO DE RUTA
// (bonus/penalización) — ningún componente vuelve a filtrar
// `signal.type`/`profile.xxx` por su cuenta. Importante: esto decide qué
// señalizaciones participan del SCORE de la ruta, no qué se MUESTRA en el
// mapa (para eso ver getMapVisibleSignals, arriba) — con el Perfil por
// defecto (todo en false) esto da una lista vacía, y antes el mapa de
// /ruta usaba esta misma lista para decidir qué dibujar, por lo que
// quedaba vacío también. Confundir "relevante para el cálculo" con
// "visible en el mapa" fue exactamente el bug: una señalización recién
// creada es siempre válida y visible, sea o no relevante para el Perfil
// actual del usuario.
export function getRelevantSignalsForProfile(
  signals: SignalWithTrust[],
  needs: RouteNeedPreferences,
  avoids: RouteAvoidPreferences
): SignalWithTrust[] {
  return getMapVisibleSignals(signals).filter((signal) => {
    if (!isSignalType(signal.type)) return false; // getMapVisibleSignals ya lo garantiza; angosta el tipo para TS.
    return isSignalRelevantToProfile(signal.type, needs, avoids);
  });
}

const EARTH_RADIUS_METERS = 6371000;

// Haversine: distancia real entre dos coordenadas, en metros.
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Sección 26: filtrado geográfico proporcional al almacenamiento actual
// (localStorage, dataset local/chico — no un backend con consultas por
// bounding box). Filtra por proximidad real a un punto (usuario o
// destino). Queda preparado para reemplazarse por un filtrado geográfico
// real (viewport/bounding box server-side) el día que exista un backend,
// sin cambiar la firma que consumen los componentes.
export function filterSignalsNearPoint<T extends { latitude: number; longitude: number }>(
  signals: T[],
  point: { lat: number; lng: number },
  radiusMeters: number
): T[] {
  return signals.filter(
    (signal) =>
      distanceMeters(point, { lat: signal.latitude, lng: signal.longitude }) <= radiusMeters
  );
}

// Distancia de un punto a un segmento (proyección en un plano local: a la
// escala de una calle/cuadra no hace falta geodesia exacta para esta
// tolerancia).
function distanceToSegmentMeters(
  point: { lat: number; lng: number },
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toXY = (p: { lat: number; lng: number }) => ({
    x: p.lng * Math.cos((point.lat * Math.PI) / 180),
    y: p.lat,
  });
  const pXY = toXY(point);
  const aXY = toXY(a);
  const bXY = toXY(b);
  const dx = bXY.x - aXY.x;
  const dy = bXY.y - aXY.y;
  const lengthSq = dx * dx + dy * dy;
  let t = lengthSq === 0 ? 0 : ((pXY.x - aXY.x) * dx + (pXY.y - aXY.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const closest = { lat: a.lat + t * (b.lat - a.lat), lng: a.lng + t * (b.lng - a.lng) };
  return distanceMeters(point, closest);
}

// Distancia mínima de un punto a la geometría COMPLETA de la ruta (todos
// los segmentos, no solo sus vértices/extremos). Usada tanto para "qué
// señalizaciones están sobre/cerca de la ruta" como para "detección de
// desvío" durante la navegación (ver useRouteNavigation).
export function distanceToRouteMeters(
  point: { lat: number; lng: number },
  routeCoordinates: [number, number][]
): number {
  if (routeCoordinates.length === 0) return Infinity;
  if (routeCoordinates.length === 1) {
    const [lat, lng] = routeCoordinates[0];
    return distanceMeters(point, { lat, lng });
  }
  let min = Infinity;
  for (let i = 0; i < routeCoordinates.length - 1; i++) {
    const [lat1, lng1] = routeCoordinates[i];
    const [lat2, lng2] = routeCoordinates[i + 1];
    const d = distanceToSegmentMeters(point, { lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 });
    if (d < min) min = d;
  }
  return min;
}

// Sección 27/49: señalizaciones relevantes ubicadas sobre o cerca del
// recorrido calculado (no en cualquier parte del mapa).
export function getSignalsNearRoute<T extends { latitude: number; longitude: number }>(
  signals: T[],
  routeCoordinates: [number, number][],
  corridorMeters: number
): T[] {
  return signals.filter(
    (signal) =>
      distanceToRouteMeters({ lat: signal.latitude, lng: signal.longitude }, routeCoordinates) <=
      corridorMeters
  );
}

// Sección 3/29: pesos de confianza centralizados — CUÁNTO pesa una
// señalización, nunca SI pesa (eso ya lo decide únicamente Perfil, en
// getRelevantSignalsForProfile). Con 0 confirmaciones sigue siendo != 0:
// una señalización recién creada ya cuenta, solo que menos que una con más
// evidencia — nunca "todo o nada" al llegar a CONFIRMED (sección 27/29).
export const CONFIDENCE_WEIGHT = {
  NEW_0_CONFIRMATIONS: 0.45,
  NEW_1_CONFIRMATION: 0.6,
  NEW_2_CONFIRMATIONS: 0.8,
  CONFIRMED: 1,
  UNDER_REVIEW: 0.25,
  POSSIBLY_RESOLVED: 0.1,
  INACTIVE: 0, // resolved / withdrawn
} as const;

// SIGNAL_TRUST_THRESHOLDS.MIN_CONFIRMATIONS (lib/signalTrust.ts) es 3: una
// señalización "new" nunca tiene confirmedCount >= 3 (con 3 ya pasó a
// "confirmed"), así que acá alcanza con distinguir 0/1/2 explícitamente.
function confidenceWeightFor(signal: SignalWithTrust): number {
  switch (signal.status) {
    case "confirmed":
      return CONFIDENCE_WEIGHT.CONFIRMED;
    case "new":
      if (signal.confirmedCount <= 0) return CONFIDENCE_WEIGHT.NEW_0_CONFIRMATIONS;
      if (signal.confirmedCount === 1) return CONFIDENCE_WEIGHT.NEW_1_CONFIRMATION;
      return CONFIDENCE_WEIGHT.NEW_2_CONFIRMATIONS;
    case "under_review":
      return CONFIDENCE_WEIGHT.UNDER_REVIEW;
    case "possibly_resolved":
      return CONFIDENCE_WEIGHT.POSSIBLY_RESOLVED;
    case "resolved":
    case "withdrawn":
      return CONFIDENCE_WEIGHT.INACTIVE;
  }
}

// Política de accesibilidad-primero (reemplaza al corte anterior por
// "confirmed" — ver chooseBestRoute): TODA señalización relevante para el
// Perfil (getRelevantSignalsForProfile ya filtró por categoría activada)
// es una restricción FUERTE de ruteo — de paso obligatorio si es "help"
// (verde), de evasión obligatoria si es "obstacle" (roja) —
// independientemente de su estado de confirmación. Deliberado: para esta
// persona una rampa rota reportada hace una hora es tan real como una
// confirmada por diez vecinos, y esperar a que la comunidad la confirme
// antes de evitarla no es aceptable. La política de confianza
// (confidenceWeightFor, evaluateSignalTrust en lib/signalTrust.ts) sigue
// existiendo y sigue pesando, pero solo para el score blando que desempata
// DENTRO de rutas que ya cumplen por igual las restricciones fuertes
// (chooseBestRoute, nivel 3) — nunca para decidir SI algo es obligatorio.
// Por eso ya no hace falta una función `isMandatorySignal`: todo efecto
// relevante (ver getSignalRouteEffects) participa directamente de los
// niveles 1/2 de chooseBestRoute.

// Sección 10/36/49: radio de tolerancia para decidir si una señalización
// realmente "está sobre" la ruta y por lo tanto debe pesar en la elección
// de alternativa. Deliberadamente más estricto que el corredor usado para
// decidir qué marcadores se muestran en el mapa (ROUTE_CORRIDOR_METERS en
// RouteMapSection, 80m): ahí el objetivo es "avisar de lo que hay cerca",
// acá el objetivo es "esto interfiere con caminar por esta vereda/cruce" —
// 15-30m es razonable para precisión peatonal (ancho de calle + vereda).
//
// Precisión real disponible (sección 11): esto es distancia perpendicular
// mínima punto→polyline (haversine + proyección en plano local), NO
// snapping a la red vial. Ni la señalización (lat/lng de un pin manual) ni
// la respuesta de OSRM traen street/way id utilizable para cruzar contra
// nuestros datos, así que dos calles paralelas separadas por menos de este
// radio SÍ pueden producir un falso positivo — limitación real, no
// corregida acá con datos que no existen (ver informe final).
export const SIGNAL_ROUTE_RADIUS_METERS = 20;

// Sección 74: cuántos segundos de "costo" representa un obstáculo/ayuda con
// confidenceWeight 1 (máximo) exactamente sobre la ruta.
export const ROUTE_SIGNAL_PENALTY_SECONDS = 240;

// Tope de SANIDAD, no de preferencia: nunca se usa para decidir si vale la
// pena cumplir una preferencia activada del Perfil (eso lo deciden los
// niveles 1/2 de chooseBestRoute, sin límite de desvío — accesibilidad
// manda sobre distancia). Sirve solo para, DENTRO de un conjunto de rutas
// que ya cumplen por igual esos niveles, descartar un desvío sin sentido
// peatonal real (p.ej. una candidata que da 6x la vuelta a la manzana por
// un artefacto de generación) antes de mirar el score final. Por diseño
// nunca puede vaciar un nivel: siempre se compara contra la MÁS RÁPIDA
// DENTRO de ese mismo nivel, que trivialmente cumple el ratio consigo
// misma.
export const SANITY_MAX_DETOUR_RATIO = 3;

// Sección 36: señalizaciones relevantes (ya filtradas por Perfil+activas)
// que efectivamente intersectan la geometría de una ruta candidata, dentro
// del radio estricto de intervención (no el corredor visual del mapa).
export function getSignalsAffectingRoute<T extends { latitude: number; longitude: number }>(
  routeCoordinates: [number, number][],
  relevantSignals: T[],
  radiusMeters: number = SIGNAL_ROUTE_RADIUS_METERS
): T[] {
  return getSignalsNearRoute(relevantSignals, routeCoordinates, radiusMeters);
}

// Sección 25: efecto de UNA señalización sobre UNA alternativa puntual —
// unidad mínima de depuración/logging, y también la unidad que se agrega
// para el score total. `contributionSeconds` positivo = penalización
// (obstacle), negativo = bonus (help); el signo sale de `category`
// (signal.category real, sección 30 — nunca inferido de color/CSS).
export type SignalRouteEffect = {
  signal: SignalWithTrust;
  distanceMeters: number;
  category: SignalCategory;
  confidenceWeight: number;
  severity: number;
  contributionSeconds: number;
};

export function getSignalRouteEffects(
  route: RouteData,
  relevantSignals: SignalWithTrust[],
  radiusMeters: number = SIGNAL_ROUTE_RADIUS_METERS
): SignalRouteEffect[] {
  const effects: SignalRouteEffect[] = [];
  for (const signal of relevantSignals) {
    const distanceMeters = distanceToRouteMeters(
      { lat: signal.latitude, lng: signal.longitude },
      route.coordinates
    );
    if (distanceMeters > radiusMeters) continue;

    const resolved = resolveSignal(signal.type);
    const category = resolved.category;
    if (!category || !resolved.type) continue; // type inválido: ya debería estar excluido aguas arriba, nunca se asume una categoría.

    const confidenceWeight = confidenceWeightFor(signal);
    // Sección 5 (Perfil): CUÁNTO pesa este tipo puntual (rampa/escalera/
    // bache/...), no solo si pesa — ver SIGNAL_TYPE_SEVERITY en reports.ts.
    const severity = SIGNAL_TYPE_SEVERITY[resolved.type];
    const contributionSeconds =
      (category === "obstacle" ? 1 : -1) * confidenceWeight * severity * ROUTE_SIGNAL_PENALTY_SECONDS;

    effects.push({ signal, distanceMeters, category, confidenceWeight, severity, contributionSeconds });
  }
  return effects;
}

// Sección 1/15/16: penalización TOTAL (en segundos, positiva = cuesta,
// negativa = favorece) de una ruta candidata, agregando el efecto de cada
// señalización relevante que la afecta. `affectingSignals` trae AMBAS
// categorías (útil para mapa/depuración); `obstacleSignals` es el
// subconjunto que realmente representa un problema no evitado — es la
// única lista que debe usarse para decidir si mostrar el aviso de
// "señalización que no pudimos evitar". Una ayuda (rampa, cruce seguro,
// etc.) sobre la ruta NUNCA debe generar ese aviso: es lo que se buscaba,
// no un problema.
export function calculateRouteSignalPenalty(
  route: RouteData,
  relevantSignals: SignalWithTrust[]
): {
  penaltySeconds: number;
  affectingSignals: SignalWithTrust[];
  obstacleSignals: SignalWithTrust[];
  effects: SignalRouteEffect[];
} {
  const effects = getSignalRouteEffects(route, relevantSignals);
  const penaltySeconds = effects.reduce((sum, effect) => sum + effect.contributionSeconds, 0);
  const affectingSignals = effects.map((effect) => effect.signal);
  const obstacleSignals = effects
    .filter((effect) => effect.category === "obstacle")
    .map((effect) => effect.signal);
  return { penaltySeconds, affectingSignals, obstacleSignals, effects };
}

export type RouteChoice = {
  route: RouteData;
  affectingSignals: SignalWithTrust[];
  obstacleSignals: SignalWithTrust[];
  penaltySeconds: number;
  scoreSeconds: number;
  // True cuando NINGUNA alternativa real (de las que el motor pudo
  // devolver, incluyendo las candidatas vía-forzadas) logró evitar un
  // obstáculo relevante y activo en Perfil — la ruta elegida sigue siendo
  // la mejor real disponible entre las que existen, pero el conflicto
  // queda identificado acá en vez de fallar en silencio o inventar una
  // ruta que no existe.
  mandatoryObstacleConflict: boolean;
};

// DENTRO de un mismo nivel de prioridad, descarta un desvío sin sentido
// peatonal real (SANITY_MAX_DETOUR_RATIO frente a la MÁS RÁPIDA de ese
// mismo nivel) — nunca decide si cumplir la preferencia que definió el
// nivel. Por diseño no puede vaciar `tier`: la más rápida del nivel
// siempre cumple el ratio consigo misma (>= 1), así que el fallback de
// abajo es solo defensivo.
function sanityFilter<T extends { route: RouteData }>(tier: T[]): T[] {
  if (tier.length === 0) return tier;
  const fastestInTier = Math.min(...tier.map((e) => e.route.durationSeconds));
  const capped = tier.filter((e) => e.route.durationSeconds <= fastestInTier * SANITY_MAX_DETOUR_RATIO);
  return capped.length > 0 ? capped : tier;
}

// Acá es donde las señalizaciones intervienen ANTES de que se elija la
// ruta final, no después.
//
// 1) Evalúa CADA alternativa real que devolvió el motor (nativa o
//    vía-forzada por lib/routeCandidates.ts): baseCost (duración real) +
//    penalización/bonus por señalizaciones relevantes.
// 2) Accesibilidad-primero: TODA señalización relevante para el Perfil
//    (getRelevantSignalsForProfile ya solo dejó pasar categorías
//    activadas) es una restricción FUERTE — de evasión obligatoria si es
//    "obstacle" (roja), de paso obligatorio si es "help" (verde), sin
//    importar su estado de confirmación (ver comentario de
//    getRelevantSignalsForProfile, más arriba). Tres niveles, EN ESTE
//    ORDEN (la distancia decide último, nunca primero, y NUNCA hace que
//    gane una ruta que viola un nivel anterior):
//      Nivel 1 — evitar TODO obstáculo obligatorio: preferir las
//        alternativas que NO tocan ningún obstáculo relevante y activo en
//        Perfil, sin importar cuánto más larga sea la que lo logra (solo
//        se recorta un desvío sin sentido peatonal DENTRO de las que ya lo
//        logran — sanityFilter). Si NINGUNA alternativa real lo logra
//        (conflicto real, sin alternativa peatonal válida), no se puede
//        aplicar este nivel — se sigue con todas y el conflicto queda
//        marcado en mandatoryObstacleConflict.
//      Nivel 2 — maximizar ayudas obligatorias alcanzadas: entre las que ya
//        pasaron el nivel 1, preferir las que efectivamente pasan por la
//        mayor cantidad de ayudas relevantes y activas en Perfil que sea
//        POSIBLE alcanzar entre las alternativas reales que existen (nunca
//        exige una ayuda que ninguna alternativa real puede alcanzar —
//        esto es sobre las alternativas REALES que ya existen, nunca
//        fuerza una geometría inventada; buildAllHelpsChainViaCandidate en
//        lib/routeCandidates.ts es lo que intenta, en un pedido real al
//        motor, que "la mayor cantidad posible" sea efectivamente TODAS).
//      Nivel 3 — menor score (distancia + señalizaciones no obligatorias
//        que siguen sumando/restando de forma blanda vía confidenceWeight)
//        entre las que ya cumplen los niveles 1 y 2 por igual.
export function chooseBestRoute(
  routes: RouteData[],
  relevantSignals: SignalWithTrust[]
): RouteChoice | null {
  if (routes.length === 0) return null;

  const evaluated = routes.map((route, index) => {
    const { penaltySeconds, affectingSignals, obstacleSignals, effects } = calculateRouteSignalPenalty(
      route,
      relevantSignals
    );
    const mandatoryObstacleHits = effects.filter((effect) => effect.category === "obstacle");
    const mandatoryHelpSignalIds = new Set(
      effects.filter((effect) => effect.category === "help").map((effect) => effect.signal.id)
    );
    return {
      route,
      affectingSignals,
      obstacleSignals,
      effects,
      penaltySeconds,
      scoreSeconds: route.durationSeconds + penaltySeconds,
      mandatoryObstacleHits,
      mandatoryHelpSignalIds,
      index,
    };
  });

  // Nivel 1.
  const withoutMandatoryObstacles = evaluated.filter((e) => e.mandatoryObstacleHits.length === 0);
  const mandatoryObstacleConflict = withoutMandatoryObstacles.length === 0;
  const obstacleTier = sanityFilter(mandatoryObstacleConflict ? evaluated : withoutMandatoryObstacles);

  // Nivel 2.
  const achievableMandatoryHelpIds = new Set<string>();
  for (const e of obstacleTier) {
    for (const id of e.mandatoryHelpSignalIds) achievableMandatoryHelpIds.add(id);
  }
  function mandatoryHelpsReached(e: (typeof obstacleTier)[number]): number {
    let count = 0;
    for (const id of achievableMandatoryHelpIds) {
      if (e.mandatoryHelpSignalIds.has(id)) count++;
    }
    return count;
  }
  const maxMandatoryHelpsReached =
    achievableMandatoryHelpIds.size === 0 ? 0 : Math.max(...obstacleTier.map(mandatoryHelpsReached));
  const helpTier = sanityFilter(
    obstacleTier.filter((e) => mandatoryHelpsReached(e) === maxMandatoryHelpsReached)
  );

  // Nivel 3.
  helpTier.sort((a, b) => a.scoreSeconds - b.scoreSeconds);
  const chosen = helpTier[0];

  if (process.env.NODE_ENV !== "production") {
    const enabledPositivePreferences = [
      ...new Set(
        relevantSignals
          .filter((signal) => resolveSignal(signal.type).category === "help")
          .map((signal) => resolveSignal(signal.type).label)
      ),
    ];
    const enabledNegativePreferences = [
      ...new Set(
        relevantSignals
          .filter((signal) => resolveSignal(signal.type).category === "obstacle")
          .map((signal) => resolveSignal(signal.type).label)
      ),
    ];
    console.debug("[SENDA PROFILE RULES]");
    console.debug("enabledPositivePreferences:", enabledPositivePreferences);
    console.debug("enabledNegativePreferences:", enabledNegativePreferences);
    for (const signal of relevantSignals) {
      const resolved = resolveSignal(signal.type);
      if (!resolved.category) continue;
      console.debug(`signal: ${resolved.label}`);
      console.debug("profileMatch:", true);
      // Toda señalización relevante es obligatoria (paso si es "help",
      // evasión si es "obstacle"), sin importar el estado — ver la
      // política de accesibilidad-primero documentada más arriba.
      console.debug(resolved.category === "help" ? "mandatory:" : "avoid:", true);
    }
    console.debug(
      "selectedRoute:",
      `alternativa ${chosen.index} — ${Math.round(chosen.route.distanceMeters)}m, ` +
        `score=${Math.round(chosen.scoreSeconds)}s` +
        (mandatoryObstacleConflict
          ? " — CONFLICTO: ninguna alternativa real evita un obstáculo obligatorio"
          : "")
    );

    console.debug(
      `[routeSignals] ACTIVE PROFILE SIGNALS (${relevantSignals.length}):`,
      relevantSignals.map((signal) => ({
        id: signal.id,
        type: signal.type,
        category: resolveSignal(signal.type).category,
        status: signal.status,
        confirmedCount: signal.confirmedCount,
        confidenceWeight: confidenceWeightFor(signal),
        lat: signal.latitude,
        lng: signal.longitude,
      }))
    );
    // Formato pedido explícitamente para poder comprobar en consola que las
    // señalizaciones REALMENTE entran al cálculo: positiveSignals/
    // negativeSignals separados, accessibilityScore aislado (el aporte de
    // señalizaciones, sin la duración base) y finalScore (lo que realmente
    // decide qué alternativa gana).
    const obstacleTierIndexes = new Set(obstacleTier.map((e) => e.index));
    const helpTierIndexes = new Set(helpTier.map((e) => e.index));
    evaluated.forEach((e) => {
      const positiveSignals = e.effects
        .filter((effect) => effect.category === "help")
        .map((effect) => ({
          type: effect.signal.type,
          distanceToRoute: Math.round(effect.distanceMeters),
          confidenceWeight: effect.confidenceWeight,
          severity: effect.severity,
          bonusSeconds: Math.round(-effect.contributionSeconds),
        }));
      const negativeSignals = e.effects
        .filter((effect) => effect.category === "obstacle")
        .map((effect) => ({
          type: effect.signal.type,
          distanceToRoute: Math.round(effect.distanceMeters),
          confidenceWeight: effect.confidenceWeight,
          severity: effect.severity,
          penaltySeconds: Math.round(effect.contributionSeconds),
        }));
      // accessibilityScore: positivo = las señalizaciones EMPEORAN el score
      // de esta alternativa (más obstáculo que ayuda), negativo = lo
      // MEJORAN — mismo signo/unidad que penaltySeconds, aislado de la
      // duración real para poder leerlo de un vistazo.
      console.debug(
        `[routeSignals] Route ${e.index}:`,
        {
          distance: `${Math.round(e.route.distanceMeters)}m`,
          duration: `${Math.round(e.route.durationSeconds)}s`,
          pasaNivel1_evitaObstaculosObligatorios: obstacleTierIndexes.has(e.index),
          pasaNivel2_maximizaAyudasObligatorias: helpTierIndexes.has(e.index),
          positiveSignals,
          negativeSignals,
          accessibilityScore: Math.round(e.penaltySeconds),
          finalScore: Math.round(e.scoreSeconds),
        }
      );
    });
    console.debug(
      `[routeSignals] SELECTED ROUTE: alternativa ${chosen.index} — ` +
        (chosen.obstacleSignals.length > 0
          ? "mejor score entre las que cumplen los niveles 1/2, con obstáculo(s) sin evitar"
          : "mejor score entre las que cumplen los niveles 1/2, sin obstáculos sin evitar")
    );
  }

  return {
    route: chosen.route,
    affectingSignals: chosen.affectingSignals,
    obstacleSignals: chosen.obstacleSignals,
    penaltySeconds: chosen.penaltySeconds,
    scoreSeconds: chosen.scoreSeconds,
    mandatoryObstacleConflict,
  };
}
