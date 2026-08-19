"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { distanceMeters, distanceToRouteMeters, SIGNAL_ROUTE_RADIUS_METERS } from "@/lib/routeSignals";
import type { RouteData, RouteStep } from "@/lib/routing";
import { REPORT_STATUS_LABELS, resolveSignal } from "@/lib/reports";
import { useGeolocation, type GeoCoordinates } from "./useGeolocation";
import { useSpeechGuidance } from "./useSpeechGuidance";
import { useVibrationAlerts } from "./useVibrationAlerts";
import type { SignalWithTrust } from "./useSignals";

// Tolerancias centralizadas (secciones 30/47/50/52): nada de números
// mágicos sueltos en el componente. Documentado qué representa cada uno.
export const NAVIGATION_CONFIG = {
  // A partir de qué distancia a la geometría de la ruta se considera
  // "desvío" (no cada metro de ruido GPS).
  OFF_ROUTE_THRESHOLD_METERS: 40,
  // El desvío tiene que sostenerse este tiempo antes de recalcular — así un
  // salto puntual de GPS no dispara un recálculo.
  OFF_ROUTE_CONFIRM_MS: 8000,
  // Qué tan cerca del destino se considera "llegada".
  ARRIVAL_THRESHOLD_METERS: 25,
  // Qué tan cerca del punto de una maniobra se considera "ya la hice",
  // para avanzar al siguiente paso giro a giro.
  STEP_ADVANCE_METERS: 15,
  // A qué distancia del próximo giro se anuncia por voz ("En 50 metros,
  // girá a la derecha") — aproximadamente 30-50m antes de la maniobra, no
  // en el momento exacto de hacerla.
  TURN_ANNOUNCE_LEAD_METERS: 50,
  // Distancia a partir de la cual se avisa por VOZ una señalización
  // relevante (más amplio que el radio de vibración: da tiempo de
  // reacción). La vibración usa su propio radio, mucho más chico — ver
  // VIBRATION_ALERT_RADIUS_METERS.
  SIGNAL_ALERT_RADIUS_METERS: 100,
  // No repetir el AVISO POR VOZ de la misma señalización antes de este
  // tiempo (si la persona vuelve a pasar cerca más tarde, tiene sentido
  // recordárselo). La vibración es distinta: nunca se repite dos veces
  // para la misma señalización en todo el recorrido — ver
  // vibratedSignalIdsRef, más abajo.
  SIGNAL_ALERT_COOLDOWN_MS: 5 * 60 * 1000,
  // Sección "VIBRACIÓN": única distancia a la que vibra — mucho más chica
  // que el aviso por voz porque significa "estás pasando ahora mismo al
  // lado de la señalización", no "tené en cuenta que se viene".
  VIBRATION_ALERT_RADIUS_METERS: 30,
  // Sección "RECALCULAR DURANTE NAVEGACIÓN": qué tan cerca (a lo largo del
  // trayecto que falta) tiene que estar un obstáculo relevante recién
  // aparecido para justificar un recálculo, en vez de solo el aviso
  // discreto. Más chico que el radio de generación de vías-escape
  // (lib/routeCandidates.ts) para no recalcular por algo que todavía está
  // lejos.
  OBSTACLE_AHEAD_RECALC_RADIUS_METERS: 350,
  // Análogo para una ayuda ("Necesito") obligatoria que apareció/se hizo
  // relevante y que la ruta activa todavía no cubre: accesibilidad-primero
  // (lib/routeSignals.ts) también aplica en vivo, no solo al calcular la
  // ruta inicial — nunca se ignora una señalización nueva solo porque la
  // navegación ya arrancó.
  HELP_AHEAD_RECALC_RADIUS_METERS: 350,
  // Cuánto esperar con un error de GPS transitorio antes de escalar el
  // mensaje ("Buscando tu ubicación…" → "No podemos actualizar...").
  GPS_ERROR_ESCALATION_MS: 15000,
} as const;

type UseRouteNavigationOptions = {
  destination: GeoCoordinates | null;
  route: RouteData | null;
  // Señalizaciones YA filtradas por relevancia de Perfil + cercanía a la
  // ruta (ver lib/routeSignals.ts). Este hook no vuelve a filtrar por
  // Perfil: solo decide cuándo avisar de las que ya le pasaron.
  nearbySignals: SignalWithTrust[];
  // Ids de obstáculos que `route` YA tuvo en cuenta al elegirse (ver
  // routeChoice.obstacleSignals en RouteMapSection): recalcular por uno de
  // estos no cambiaría nada, chooseBestRoute ya hizo lo posible por
  // evitarlo. Solo un obstáculo relevante que NO esté en esta lista (o sea,
  // que apareció/cambió después de calcular la ruta activa) justifica un
  // recálculo durante la navegación.
  knownObstacleSignalIds: string[];
  // Mismo criterio que arriba pero para ayudas ("Necesito"): ids que
  // `route` YA alcanza. Una ayuda obligatoria relevante que NO esté en esta
  // lista es una que la ruta activa no cubre — si apareció/se hizo
  // relevante después de calcular la ruta, justifica un recálculo para
  // intentar alcanzarla.
  knownHelpSignalIds: string[];
  voiceEnabled: boolean;
  vibrationEnabled: boolean;
  // El hook no recalcula la ruta por sí mismo (eso sigue siendo
  // responsabilidad de useRoute, en el componente dueño del estado de
  // origen/destino): solo avisa "acá está el nuevo origen" cuando detecta
  // un desvío real. Quien llama decide cómo aplicarlo (setOrigin).
  onRecalculate: (origin: GeoCoordinates) => void;
};

export type SignalAlert = {
  signal: SignalWithTrust;
  distanceMeters: number;
};

// Orquestador de "Iniciar navegación" (sección 37: BUSCAR/CALCULAR RUTA es
// otra cosa, ya resuelta por useRoute). Combina seguimiento GPS continuo,
// progreso de pasos giro a giro, detección de desvío + recálculo, avisos de
// señalizaciones próximas (con voz/vibración si `voiceEnabled`/
// `vibrationEnabled` vienen activadas — misma preferencia compartida sea
// que se haya tocado el switch en Perfil o en Buscar ruta, ver
// useProfilePreferences) y detección de llegada — todo en un único lugar,
// sin distribuir esta lógica por componentes de UI.
export function useRouteNavigation({
  destination,
  route,
  nearbySignals,
  knownObstacleSignalIds,
  knownHelpSignalIds,
  voiceEnabled,
  vibrationEnabled,
  onRecalculate,
}: UseRouteNavigationOptions) {
  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [hasArrived, setHasArrived] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [activeSignalAlert, setActiveSignalAlert] = useState<SignalAlert | null>(null);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);

  const offRouteSinceRef = useRef<number | null>(null);
  const lastRecalcOriginRef = useRef<GeoCoordinates | null>(null);
  // Aviso por VOZ: Map con cooldown (SIGNAL_ALERT_COOLDOWN_MS) — puede
  // volver a anunciar la misma señalización si la persona pasa cerca de
  // nuevo bastante después.
  const alertedSignalsRef = useRef<Map<string, number>>(new Map());
  // Vibración: Set sin cooldown — sección 11 del pedido, "UNA SOLA
  // VIBRACIÓN POR SEÑALIZACIÓN" en TODO el recorrido, nunca se vuelve a
  // vibrar por la misma id aunque pasen horas.
  const vibratedSignalIdsRef = useRef<Set<string>>(new Set());
  // Obstáculos por los que ya se disparó un recálculo en ESTA navegación:
  // nunca dos veces por la misma señalización (sección "evitar loops de
  // recálculo"), sin importar si la ruta nueva logró evitarla o no.
  const recalculatedForObstacleRef = useRef<Set<string>>(new Set());
  // Mismo criterio, para ayudas obligatorias que aparecieron/se hicieron
  // relevantes durante la navegación.
  const recalculatedForHelpRef = useRef<Set<string>>(new Set());
  const announcedStepRef = useRef(-1);
  const routeRef = useRef(route);

  const { watchedLocation, watchStatus, watchErrorMessage, startWatching, stopWatching } =
    useGeolocation();
  const { speak, cancel: cancelSpeech } = useSpeechGuidance(voiceEnabled);
  const { vibrate } = useVibrationAlerts(vibrationEnabled);

  const userPosition = isActive ? watchedLocation : null;

  const start = useCallback(() => {
    if (isActive || !route || !destination) return;
    setIsActive(true);
    setStepIndex(0);
    setHasArrived(false);
    setIsRecalculating(false);
    offRouteSinceRef.current = null;
    lastRecalcOriginRef.current = null;
    alertedSignalsRef.current = new Map();
    vibratedSignalIdsRef.current = new Set();
    recalculatedForObstacleRef.current = new Set();
    recalculatedForHelpRef.current = new Set();
    announcedStepRef.current = -1;
    startWatching();
  }, [isActive, route, destination, startWatching]);

  const finish = useCallback(() => {
    setIsActive(false);
    setHasArrived(false);
    setIsRecalculating(false);
    setActiveSignalAlert(null);
    setGpsMessage(null);
    offRouteSinceRef.current = null;
    stopWatching();
    cancelSpeech();
  }, [stopWatching, cancelSpeech]);

  // Cleanup si se sale de /ruta (o se desmonta el componente) durante
  // navegación activa: nunca dejar el GPS watcher corriendo (sección 63).
  useEffect(() => {
    return () => {
      stopWatching();
      cancelSpeech();
    };
  }, [stopWatching, cancelSpeech]);

  const steps = route?.steps ?? [];
  const currentStep: RouteStep | null = steps[stepIndex] ?? null;

  // Distancia/duración restantes: suma real de los steps que faltan (datos
  // reales del motor, sección 45 — nunca un valor inventado). Aproximado
  // (no descuenta lo ya recorrido dentro del step actual), pero derivado
  // enteramente de la respuesta real de OSRM.
  const remainingSteps = steps.slice(stepIndex);
  const remainingDistanceMeters = remainingSteps.length
    ? remainingSteps.reduce((sum, step) => sum + step.distanceMeters, 0)
    : (route?.distanceMeters ?? null);
  const remainingDurationSeconds = remainingSteps.length
    ? remainingSteps.reduce((sum, step) => sum + step.durationSeconds, 0)
    : (route?.durationSeconds ?? null);

  // Avanza de paso cuando el usuario está lo bastante cerca del punto de
  // la maniobra actual.
  useEffect(() => {
    if (!isActive || !userPosition || !currentStep || hasArrived) return;
    const distanceToManeuver = distanceMeters(userPosition, {
      lat: currentStep.location[0],
      lng: currentStep.location[1],
    });
    if (
      distanceToManeuver <= NAVIGATION_CONFIG.STEP_ADVANCE_METERS &&
      stepIndex < steps.length - 1
    ) {
      // Sincroniza el paso actual con la posición GPS real (sistema
      // externo): no hay forma pura de derivar esto durante el render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStepIndex((index) => index + 1);
    }
  }, [isActive, userPosition, currentStep, stepIndex, steps.length, hasArrived]);

  // Anuncia por voz la maniobra del paso actual ANTES de llegar a ella
  // (sección 7 del pedido: "aproximadamente entre 30 y 50 metros del
  // próximo giro", nunca recién al estar parado en la esquina) — never
  // inventa el texto: siempre es `currentStep.instruction`, ya armado a
  // partir de maneuver/name reales de OSRM (ver buildInstruction en
  // lib/routing.ts). Una sola vez por paso (announcedStepRef): moverse no
  // dispara un aviso repetido en cada tick de GPS. La llegada ("arrive") la
  // anuncia el efecto de Llegada, más abajo, con su propio umbral — acá se
  // salta a propósito para no anunciarla dos veces con textos distintos.
  // Nunca vibra (sección 8: la vibración es solo para señalizaciones).
  useEffect(() => {
    if (!isActive || !userPosition || !currentStep || hasArrived) return;
    if (announcedStepRef.current === stepIndex) return;
    if (currentStep.maneuverType === "arrive") return;

    const distanceToManeuver = distanceMeters(userPosition, {
      lat: currentStep.location[0],
      lng: currentStep.location[1],
    });

    const isDepart = currentStep.maneuverType === "depart";
    // El inicio del recorrido se anuncia de inmediato (no tiene sentido
    // esperar a estar "a 50m" del propio punto de partida); cualquier otro
    // giro espera a estar dentro del radio de aviso.
    if (!isDepart && distanceToManeuver > NAVIGATION_CONFIG.TURN_ANNOUNCE_LEAD_METERS) return;

    announcedStepRef.current = stepIndex;

    if (isDepart) {
      speak(currentStep.instruction);
      return;
    }

    const roundedDistance = Math.max(10, Math.round(distanceToManeuver / 10) * 10);
    const instruction = currentStep.instruction;
    const loweredInstruction = instruction.charAt(0).toLowerCase() + instruction.slice(1);
    speak(`En ${roundedDistance} metros, ${loweredInstruction}`);
  }, [isActive, userPosition, currentStep, stepIndex, hasArrived, speak]);

  // Desvío: distancia sostenida a la ruta por encima del umbral -> avisar
  // y pedirle al padre que recalcule desde la posición actual.
  useEffect(() => {
    if (!isActive || !userPosition || !route || hasArrived) return;

    const distance = distanceToRouteMeters(userPosition, route.coordinates);
    const now = Date.now();

    if (distance <= NAVIGATION_CONFIG.OFF_ROUTE_THRESHOLD_METERS) {
      offRouteSinceRef.current = null;
      return;
    }

    if (offRouteSinceRef.current === null) {
      offRouteSinceRef.current = now;
      return;
    }

    const sustainedFor = now - offRouteSinceRef.current;
    if (sustainedFor < NAVIGATION_CONFIG.OFF_ROUTE_CONFIRM_MS) return;

    const last = lastRecalcOriginRef.current;
    if (last && distanceMeters(last, userPosition) <= NAVIGATION_CONFIG.OFF_ROUTE_THRESHOLD_METERS) {
      // Ya recalculamos desde un punto muy cercano a este: no insistir en
      // bucle mientras la app espera la respuesta.
      return;
    }

    lastRecalcOriginRef.current = userPosition;
    offRouteSinceRef.current = null;
    setIsRecalculating(true);
    // Nunca vibra: el recalculado no es una señalización relevante
    // (sección 8 del pedido).
    speak("Recalculando ruta.", { interrupt: true });
    onRecalculate(userPosition);
  }, [isActive, userPosition, route, hasArrived, onRecalculate, speak]);

  // Sección "RECALCULAR DURANTE NAVEGACIÓN": el usuario sigue sobre la
  // ruta calculada (si se hubiera desviado, ya lo cubre el efecto de
  // arriba), pero apareció/se hizo relevante un obstáculo que SÍ está
  // sobre el tramo que falta recorrer y que la ruta actual no tuvo en
  // cuenta al calcularse. Se evalúa recalcular UNA sola vez por
  // señalización (recalculatedForObstacleRef): si la ruta nueva tampoco
  // logra evitarlo, no se vuelve a insistir con la misma.
  useEffect(() => {
    if (!isActive || !userPosition || !route || hasArrived || isRecalculating) return;

    for (const signal of nearbySignals) {
      if (resolveSignal(signal.type).category !== "obstacle") continue;
      if (recalculatedForObstacleRef.current.has(signal.id)) continue;
      if (knownObstacleSignalIds.includes(signal.id)) continue; // ya considerado al calcular `route`: recalcular no cambiaría nada.

      const distanceToRoute = distanceToRouteMeters(
        { lat: signal.latitude, lng: signal.longitude },
        route.coordinates
      );
      if (distanceToRoute > SIGNAL_ROUTE_RADIUS_METERS) continue; // no está realmente sobre el tramo, no justifica recalcular.

      const distanceToUser = distanceMeters(userPosition, {
        lat: signal.latitude,
        lng: signal.longitude,
      });
      if (distanceToUser > NAVIGATION_CONFIG.OBSTACLE_AHEAD_RECALC_RADIUS_METERS) continue;

      recalculatedForObstacleRef.current.add(signal.id);
      // Sincroniza con la posición GPS real cruzada contra señalizaciones
      // reales (sistema externo): no es derivable en render, mismo patrón
      // que el recálculo por desvío de arriba.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsRecalculating(true);
      // Nunca vibra: recalcular no es en sí una señalización relevante
      // próxima (sección 8 del pedido) — si la ruta nueva efectivamente
      // pasa cerca de una, el efecto de vibración de más abajo se encarga.
      speak("Encontramos un obstáculo en el camino. Buscando una alternativa.", { interrupt: true });
      onRecalculate(userPosition);
      break; // uno por vez: la ruta que llegue se vuelve a evaluar contra el resto en el próximo tick.
    }
  }, [
    isActive,
    userPosition,
    route,
    hasArrived,
    isRecalculating,
    nearbySignals,
    knownObstacleSignalIds,
    onRecalculate,
    speak,
  ]);

  // Accesibilidad-primero también en vivo (lib/routeSignals.ts): apareció/se
  // hizo relevante una ayuda ("Necesito") obligatoria que la ruta activa
  // TODAVÍA no alcanza (opuesto al efecto de arriba: acá lo que importa es
  // que NO esté sobre el tramo, no que sí lo esté). Si está lo bastante
  // cerca del resto del trayecto como para valer la pena, se recalcula para
  // darle a chooseBestRoute + buildAllHelpsChainViaCandidate la chance real
  // de incluirla. Una sola vez por señalización (recalculatedForHelpRef).
  useEffect(() => {
    if (!isActive || !userPosition || !route || hasArrived || isRecalculating) return;

    for (const signal of nearbySignals) {
      if (resolveSignal(signal.type).category !== "help") continue;
      if (recalculatedForHelpRef.current.has(signal.id)) continue;
      if (knownHelpSignalIds.includes(signal.id)) continue; // la ruta activa ya la alcanza: recalcular no cambiaría nada.

      const distanceToRoute = distanceToRouteMeters(
        { lat: signal.latitude, lng: signal.longitude },
        route.coordinates
      );
      if (distanceToRoute <= SIGNAL_ROUTE_RADIUS_METERS) continue; // ya está sobre el tramo (¿por qué no está en knownHelpSignalIds? no importa: nada que recalcular).

      const distanceToUser = distanceMeters(userPosition, {
        lat: signal.latitude,
        lng: signal.longitude,
      });
      if (distanceToUser > NAVIGATION_CONFIG.HELP_AHEAD_RECALC_RADIUS_METERS) continue;

      recalculatedForHelpRef.current.add(signal.id);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsRecalculating(true);
      // Nunca vibra, mismo criterio que el efecto de arriba.
      speak("Encontramos una señalización que te puede ayudar. Buscando una mejor ruta.", {
        interrupt: true,
      });
      onRecalculate(userPosition);
      break; // uno por vez: la ruta que llegue se vuelve a evaluar contra el resto en el próximo tick.
    }
  }, [
    isActive,
    userPosition,
    route,
    hasArrived,
    isRecalculating,
    nearbySignals,
    knownHelpSignalIds,
    onRecalculate,
    speak,
  ]);

  // Cuando el padre entrega una ruta nueva (tras recalcular), reiniciar el
  // progreso de pasos: la geometría/instrucciones cambiaron.
  useEffect(() => {
    if (route !== routeRef.current) {
      routeRef.current = route;
      if (isRecalculating) {
        // Sincroniza con la ruta nueva que llegó del padre (sistema
        // externo: la respuesta de /api/route): no es derivable en render.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsRecalculating(false);
        setStepIndex(0);
        announcedStepRef.current = -1;
      }
    }
  }, [route, isRecalculating]);

  // Llegada. Nunca vibra (sección 8 del pedido): solo voz.
  useEffect(() => {
    if (!isActive || !userPosition || !destination || hasArrived) return;
    if (distanceMeters(userPosition, destination) <= NAVIGATION_CONFIG.ARRIVAL_THRESHOLD_METERS) {
      // Sincroniza con la posición GPS real: mismo caso que arriba.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasArrived(true);
      speak("Llegaste a tu destino.", { interrupt: true });
    }
  }, [isActive, userPosition, destination, hasArrived, speak]);

  // Señalizaciones próximas — AVISO POR VOZ: banner + anuncio, sin repetir
  // la misma dentro del período de cooldown (puede volver a avisar si la
  // persona pasa cerca de nuevo bastante después). No presenta
  // incertidumbre como certeza: el texto siempre incluye el estado real.
  // Radio amplio (SIGNAL_ALERT_RADIUS_METERS) a propósito: da tiempo de
  // reacción. Nunca vibra acá — la vibración es un efecto aparte, más
  // abajo, con su propio radio (mucho más chico) y sin cooldown.
  useEffect(() => {
    if (!isActive || !userPosition || hasArrived) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveSignalAlert(null);
      return;
    }

    const now = Date.now();
    let closest: SignalAlert | null = null;

    for (const signal of nearbySignals) {
      const distance = distanceMeters(userPosition, {
        lat: signal.latitude,
        lng: signal.longitude,
      });
      if (distance > NAVIGATION_CONFIG.SIGNAL_ALERT_RADIUS_METERS) continue;

      const lastAlertedAt = alertedSignalsRef.current.get(signal.id);
      if (lastAlertedAt && now - lastAlertedAt < NAVIGATION_CONFIG.SIGNAL_ALERT_COOLDOWN_MS) continue;

      if (!closest || distance < closest.distanceMeters) {
        closest = { signal, distanceMeters: distance };
      }
    }

    if (!closest) return;

    alertedSignalsRef.current.set(closest.signal.id, now);
    setActiveSignalAlert(closest);

    const resolved = resolveSignal(closest.signal.type);
    const roundedDistance = Math.max(10, Math.round(closest.distanceMeters / 10) * 10);
    const stateText =
      closest.signal.status === "confirmed"
        ? "confirmado por la comunidad"
        : REPORT_STATUS_LABELS[closest.signal.status].toLowerCase();

    speak(`Atención: ${resolved.label} a ${roundedDistance} metros, ${stateText}.`);
  }, [isActive, userPosition, hasArrived, nearbySignals, speak]);

  // Señalizaciones próximas — VIBRACIÓN: sección 8/9/10/11 del pedido. Única
  // función de la vibración en toda la navegación. Radio mucho más chico
  // que el aviso por voz (VIBRATION_ALERT_RADIUS_METERS, "estás pasando
  // ahora al lado") y SIN cooldown: una vez que vibró para una
  // señalización, nunca vuelve a vibrar por esa misma id en todo el
  // recorrido (vibratedSignalIdsRef), la haya pasado hace 10 segundos o
  // hace 10 minutos. `nearbySignals` ya viene filtrada por categorías
  // activas en Perfil (getRelevantSignalsForProfile, en el padre) — nunca
  // vibra por una señalización de una categoría desactivada.
  useEffect(() => {
    if (!isActive || !userPosition || hasArrived) return;

    for (const signal of nearbySignals) {
      if (vibratedSignalIdsRef.current.has(signal.id)) continue;

      const distance = distanceMeters(userPosition, {
        lat: signal.latitude,
        lng: signal.longitude,
      });
      if (distance > NAVIGATION_CONFIG.VIBRATION_ALERT_RADIUS_METERS) continue;

      vibratedSignalIdsRef.current.add(signal.id);
      vibrate();
      break; // una por tick: si hay varias a la vez, la próxima vibra en el próximo tick de GPS.
    }
  }, [isActive, userPosition, hasArrived, nearbySignals, vibrate]);

  // GPS a dos niveles (sección 64): un error transitorio muestra "Buscando
  // tu ubicación…" primero; si se sostiene, escala a un mensaje más claro
  // de que no se puede actualizar. No borra la ruta ni la navegación.
  // Sincroniza el mensaje visible con el estado real del GPS (sistema
  // externo): no es derivable en render.
  useEffect(() => {
    if (!isActive) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGpsMessage(null);
      return;
    }
    if (watchStatus === "watching") {
      setGpsMessage(null);
      return;
    }
    if (watchStatus === "denied" || watchStatus === "unsupported") {
      setGpsMessage(watchErrorMessage);
      return;
    }

    setGpsMessage("Buscando tu ubicación…");
    const timer = setTimeout(() => {
      setGpsMessage("No podemos actualizar tu ubicación en este momento.");
    }, NAVIGATION_CONFIG.GPS_ERROR_ESCALATION_MS);
    return () => clearTimeout(timer);
  }, [isActive, watchStatus, watchErrorMessage]);

  return {
    isActive,
    userPosition,
    gpsStatus: watchStatus,
    gpsMessage,
    currentStep,
    stepIndex,
    totalSteps: steps.length,
    remainingDistanceMeters,
    remainingDurationSeconds,
    isRecalculating,
    hasArrived,
    activeSignalAlert,
    start,
    finish,
  };
}
