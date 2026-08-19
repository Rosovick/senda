// Lógica de routing separada de la interfaz: obtiene un recorrido real entre
// dos puntos y expone helpers de formato. No depende de React ni del mapa.

export type RoutePoint = {
  lat: number;
  lng: number;
};

// Un paso giro a giro, construido a partir de maneuver/name/distance reales
// que devuelve OSRM (steps=true) — nunca inventado. `instruction` es el
// texto en español ya armado (ver buildInstruction); `location` es el punto
// [lat, lng] donde ocurre la maniobra, para poder calcular en vivo "a
// cuántos metros está" durante la navegación.
export type RouteStep = {
  distanceMeters: number;
  durationSeconds: number;
  streetName: string;
  maneuverType: string;
  maneuverModifier: string | null;
  location: [number, number];
  instruction: string;
};

export type RouteData = {
  // Pares [lat, lng] listos para dibujar en Leaflet.
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
  // [] si el motor no devolvió steps utilizables (nunca se rellena a mano).
  steps: RouteStep[];
};

export type RoutingErrorReason =
  | "network"
  | "unavailable"
  | "no-route"
  | "invalid-response";

export class RoutingError extends Error {
  reason: RoutingErrorReason;

  constructor(reason: RoutingErrorReason, message: string) {
    super(message);
    this.name = "RoutingError";
    this.reason = reason;
  }
}

// Motor de rutas: OSRM (perfil "foot", peatonal) sobre la instancia pública
// de FOSSGIS, construida con datos de OpenStreetMap. No requiere API key,
// apropiada para este MVP. Se llama desde el servidor (route handler) para
// identificar la app con un User-Agent propio y centralizar los errores.
const OSRM_FOOT_ENDPOINT =
  "https://routing.openstreetmap.de/routed-foot/route/v1/foot";

type OsrmManeuver = {
  type: string;
  modifier?: string;
  location: [number, number]; // [lng, lat]
};

type OsrmStep = {
  distance: number;
  duration: number;
  name?: string;
  maneuver: OsrmManeuver;
};

type OsrmRouteResponse = {
  code: string;
  routes?: Array<{
    distance: number;
    duration: number;
    geometry?: { coordinates: [number, number][] };
    legs?: Array<{ steps?: OsrmStep[] }>;
  }>;
};

// Texto en español a partir de maneuver.type/modifier/name reales del
// motor: nunca se inventa una maniobra que OSRM no informó. Cobertura de
// los tipos más comunes del perfil peatonal; lo que no está mapeado cae en
// "Continuá" (nunca se deja el paso sin instrucción).
const MANEUVER_VERB: Record<string, string> = {
  turn: "Girá",
  "new name": "Continuá",
  continue: "Continuá",
  merge: "Incorporate",
  fork: "Mantenete",
  "end of road": "Girá",
  roundabout: "Tomá la rotonda",
  rotary: "Tomá la rotonda",
  "roundabout turn": "En la rotonda, girá",
  "exit roundabout": "Salí de la rotonda",
  "exit rotary": "Salí de la rotonda",
  notification: "Continuá",
};

const MODIFIER_TEXT: Record<string, string> = {
  left: "a la izquierda",
  right: "a la derecha",
  "slight left": "levemente a la izquierda",
  "slight right": "levemente a la derecha",
  "sharp left": "bruscamente a la izquierda",
  "sharp right": "bruscamente a la derecha",
  straight: "derecho",
  uturn: "y volvé en sentido contrario",
};

function buildInstruction(step: OsrmStep): string {
  const streetPart = step.name ? ` en ${step.name}` : "";

  if (step.maneuver.type === "arrive") return "Llegaste a tu destino.";
  if (step.maneuver.type === "depart") {
    return step.name ? `Salí por ${step.name}.` : "Comenzá tu recorrido.";
  }

  const verb = MANEUVER_VERB[step.maneuver.type] ?? "Continuá";
  const modifierText = step.maneuver.modifier ? MODIFIER_TEXT[step.maneuver.modifier] : null;

  if (modifierText) return `${verb} ${modifierText}${streetPart}.`;
  return `${verb}${streetPart}.`;
}

function toRouteSteps(legs: Array<{ steps?: OsrmStep[] }> | undefined): RouteStep[] {
  if (!legs) return [];
  const steps: RouteStep[] = [];
  for (const leg of legs) {
    for (const step of leg.steps ?? []) {
      if (!step.maneuver || !Array.isArray(step.maneuver.location)) continue;
      const [lng, lat] = step.maneuver.location;
      steps.push({
        distanceMeters: step.distance,
        durationSeconds: step.duration,
        streetName: step.name ?? "",
        maneuverType: step.maneuver.type,
        maneuverModifier: step.maneuver.modifier ?? null,
        location: [lat, lng],
        instruction: buildInstruction(step),
      });
    }
  }
  return steps;
}

function parseOsrmRoute(route: NonNullable<OsrmRouteResponse["routes"]>[number]): RouteData | null {
  const geometryCoordinates = route.geometry?.coordinates;
  if (!Array.isArray(geometryCoordinates) || geometryCoordinates.length === 0) return null;

  return {
    coordinates: geometryCoordinates.map(([lng, lat]) => [lat, lng]),
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    steps: toRouteSteps(route.legs),
  };
}

// Núcleo compartido: arma la URL con N coordenadas (origen [+ vía] +
// destino) y traduce la respuesta real de OSRM. `fetchRouteAlternatives` y
// `fetchRouteViaPoint` son las dos formas de pedirle rutas REALES al motor
// — ninguna dibuja ni ajusta geometría a mano.
async function fetchOsrmRoutes(
  points: RoutePoint[],
  alternatives: boolean
): Promise<RouteData[]> {
  const coordinates = points.map((p) => `${p.lng},${p.lat}`).join(";");
  const url = `${OSRM_FOOT_ENDPOINT}/${coordinates}?overview=full&geometries=geojson&steps=true&alternatives=${alternatives}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": "SENDA-MVP/0.1 (accesibilidad urbana - proyecto en desarrollo)",
      },
    });
  } catch {
    throw new RoutingError(
      "network",
      "No se pudo conectar con el servicio de rutas."
    );
  }

  if (!response.ok) {
    throw new RoutingError(
      "unavailable",
      "El servicio de rutas no está disponible en este momento."
    );
  }

  let data: OsrmRouteResponse;
  try {
    data = await response.json();
  } catch {
    throw new RoutingError(
      "invalid-response",
      "Respuesta inválida del servicio de rutas."
    );
  }

  if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
    throw new RoutingError(
      "no-route",
      "No se encontró una ruta entre estos puntos."
    );
  }

  const routes = data.routes.map(parseOsrmRoute).filter((route): route is RouteData => route !== null);

  if (routes.length === 0) {
    throw new RoutingError(
      "invalid-response",
      "La ruta obtenida no tiene una geometría válida."
    );
  }

  return routes;
}

// Pide alternativas reales al motor (alternatives=true: confirmado en vivo
// contra el endpoint público — devuelve rutas efectivamente distintas
// calculadas por OSRM, no una sola forzada). Cuántas devuelve depende del
// motor/la red de calles (típicamente 1 a 3, y en trayectos cortos suele
// devolver una sola — confirmado en vivo: por eso existe
// fetchRouteViaPoint, más abajo). Elegir CUÁL de estas alternativas usar es
// responsabilidad de quien llama (ver chooseBestRoute en
// lib/routeSignals.ts) — esta función solo habla con OSRM y traduce su
// respuesta, sin saber nada de Perfil/señalizaciones.
export async function fetchRouteAlternatives(
  origin: RoutePoint,
  destination: RoutePoint
): Promise<RouteData[]> {
  return fetchOsrmRoutes([origin, destination], true);
}

// Fuerza al motor a pasar por `vias` (una o más coordenadas intermedias
// reales, p.ej. señalizaciones de accesibilidad ya snappeadas a la red
// peatonal — ver fetchNearestWalkablePoint) antes de llegar a destino, EN
// ESE ORDEN: OSRM sigue calculando un recorrido peatonal 100% real sobre la
// red vial, solo que con paradas obligatorias en el medio. Acepta más de un
// punto para poder pedir, en un solo trayecto real, una ruta que encadene
// TODAS las señalizaciones obligatorias que caen dentro del corredor (ver
// computeAccessibleRouteOrder/useAccessibleRoute) — no solo una por vez.
// Devuelve UNA ruta (alternatives=false: forzar los vias ya define el
// recorrido deseado, no hace falta pedirle además variantes de esa misma
// ruta forzada).
export async function fetchRouteViaPoints(
  origin: RoutePoint,
  vias: RoutePoint[],
  destination: RoutePoint
): Promise<RouteData> {
  const routes = await fetchOsrmRoutes([origin, ...vias, destination], false);
  return routes[0];
}

// Servicio `nearest` de OSRM: dado cualquier punto (p.ej. el lat/lng crudo
// de un marcador de señalización, que puede estar unos metros al costado de
// la calle real), devuelve el nodo TRANSITABLE peatonal más cercano de la
// red vial real — nunca inventado. Existe para poder hacer el snap
// EXPLÍCITO antes de rutear (ver useAccessibleRoute): el propio servicio de
// ruteo ya hace un snap interno al recibir cualquier coordenada, pero acá lo
// hacemos explícito para (a) loguear la coordenada realmente usada y (b)
// detectar de entrada si un punto es razonablemente alcanzable a pie
// (snapDistanceMeters muy grande = dato corrupto, p.ej. un marcador en
// medio de una plaza sin sendas mapeadas) en vez de descubrirlo recién
// cuando el ruteo falla. Devuelve null si el servicio no responde — quien
// llama debe degradar a la coordenada cruda (el motor la va a snappear
// igual al pedir la ruta), nunca fallar en cadena por esto.
export type SnapResult = {
  lat: number;
  lng: number;
  snapDistanceMeters: number;
};

export async function fetchNearestWalkablePoint(point: RoutePoint): Promise<SnapResult | null> {
  const nearestEndpoint = OSRM_FOOT_ENDPOINT.replace("/route/v1/foot", "/nearest/v1/foot");
  const url = `${nearestEndpoint}/${point.lng},${point.lat}?number=1`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": "SENDA-MVP/0.1 (accesibilidad urbana - proyecto en desarrollo)",
      },
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;

  let data: {
    code: string;
    waypoints?: Array<{ location: [number, number]; distance: number }>;
  };
  try {
    data = await response.json();
  } catch {
    return null;
  }

  const waypoint = data.code === "Ok" ? data.waypoints?.[0] : undefined;
  if (!waypoint || !Array.isArray(waypoint.location)) return null;

  const [lng, lat] = waypoint.location;
  return { lat, lng, snapDistanceMeters: waypoint.distance };
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
  }
  return `${Math.round(meters)} m`;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
}
