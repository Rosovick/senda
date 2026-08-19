"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SignalDetailSheet from "@/components/reports/SignalDetailSheet";
import { CloseIcon, InfoIcon, SendIcon } from "@/components/icons";
import { useAccessibleRoute } from "@/hooks/useAccessibleRoute";
import { useGeolocation, type GeoCoordinates } from "@/hooks/useGeolocation";
import { useProfilePreferences } from "@/hooks/useProfilePreferences";
import type { PlaceResult } from "@/hooks/usePlaceSearch";
import { useRouteNavigation } from "@/hooks/useRouteNavigation";
import { useSavedRoutes, type SavedRoute } from "@/hooks/useSavedRoutes";
import { useSignals } from "@/hooks/useSignals";
import { generateLocalId } from "@/lib/localId";
import type { IncorrectReason, VerificationValue } from "@/lib/signalVerifications";
import {
  filterSignalsNearPoint,
  getMapVisibleSignals,
  getRelevantSignalsForProfile,
  getSignalsNearRoute,
} from "@/lib/routeSignals";
import type { SignalWithTrust } from "@/hooks/useSignals";
import AccessibleMap from "./AccessibleMap";
import GuidanceQuickSettings from "./GuidanceQuickSettings";
import NavigationPanel from "./NavigationPanel";
import RouteSearch from "./RouteSearch";
import RouteSummary from "./RouteSummary";
import SavedRoutesSheet from "./SavedRoutesSheet";
import SaveRouteDialog from "./SaveRouteDialog";

// Texto fijo mostrado como "Desde" en RouteSearch (el origen siempre es la
// ubicación actual del dispositivo — no hay búsqueda manual de origen todavía):
// mismo texto usado acá para nombrar el origen al guardar un trayecto.
const CURRENT_LOCATION_LABEL = "Mi ubicación actual";

type RouteMapSectionProps = {
  mapClassName?: string;
};

// Cuando todavía no hay ruta calculada, mostrar señalizaciones cerca del
// usuario (o del destino elegido) en vez de todo el dataset local (sección
// 26/28). Con ruta calculada, priorizar lo que está sobre/cerca del
// recorrido (sección 27/49).
const NEARBY_WITHOUT_ROUTE_RADIUS_METERS = 1200;
const ROUTE_CORRIDOR_METERS = 80;

// Coordina el estado compartido de /ruta:
// - "Desde" (RouteSearch): fija el ORIGEN de la ruta vía geolocalización.
// - "Hasta" (RouteSearch): fija el DESTINO vía búsqueda real de lugares.
// - Botón flotante "Mi ubicación" (AccessibleMap): recentra el mapa (y,
//   durante navegación activa, vuelve a seguir al usuario tras un arrastre
//   manual).
// - Cuando origin y destination existen a la vez, useRoute calcula la ruta
//   real automáticamente (y la recalcula si cualquiera de los dos cambia:
//   también durante navegación, cuando useRouteNavigation detecta un
//   desvío real y actualiza `origin`).
// - useSignals + useProfilePreferences + lib/routeSignals deciden qué
//   señalizaciones son relevantes y cuáles mostrar (sección 3-10).
// - useRouteNavigation orquesta el modo "Iniciar navegación" (GPS
//   continuo, progreso, voz, vibración, avisos) reutilizando esta misma
//   ruta — nunca un segundo cálculo ni una pantalla paralela.
export default function RouteMapSection({ mapClassName }: RouteMapSectionProps) {
  const { location: userLocation, status, errorMessage, requestLocation } = useGeolocation();
  const [origin, setOrigin] = useState<GeoCoordinates | null>(null);
  const [destination, setDestination] = useState<PlaceResult | null>(null);
  const [recenterToken, setRecenterToken] = useState(0);
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [detailSignalId, setDetailSignalId] = useState<string | null>(null);
  const [isSavedRoutesOpen, setSavedRoutesOpen] = useState(false);
  const [isSaveDialogOpen, setSaveDialogOpen] = useState(false);

  // Única fuente de datos de trayectos guardados (sección 7 del pedido):
  // la misma colección que usa Perfil → "Lugares guardados"
  // (SavedPlacesCard) — guardar/renombrar/eliminar acá se ve reflejado ahí
  // también, porque es literalmente el mismo estado (useLocalStorageState).
  const { savedRoutes, addSavedRoute, renameSavedRoute, deleteSavedRoute, isLoaded: savedRoutesLoaded } =
    useSavedRoutes();

  // Sección 3-6: Perfil manda. Misma fuente que usa /perfil
  // (useProfilePreferences) y la misma colección centralizada de
  // señalizaciones que usa /reportes (useSignals) — nada paralelo.
  const { routeNeedPreferences, routeAvoidPreferences, navigationPreferences, toggleNavigationPreference } =
    useProfilePreferences();
  const { signals, currentUserId, verify, deleteSignal } = useSignals();

  // Sección "MISMA FUENTE DE DATOS": TODAS las señalizaciones válidas
  // (activas, en estado visible, tipo reconocido) — la misma colección que
  // /reportes muestra, sin el filtro de Perfil. Es la base del MAPA (punto
  // 3/4 de la tarea); relevantSignals (abajo) sigue siendo, aparte, la base
  // del CÁLCULO de ruta (bonus/penalización), que sí depende del Perfil.
  const mapVisibleSignalsBase = useMemo(() => getMapVisibleSignals(signals), [signals]);

  const relevantSignals = useMemo(
    () => getRelevantSignalsForProfile(signals, routeNeedPreferences, routeAvoidPreferences),
    [signals, routeNeedPreferences, routeAvoidPreferences]
  );

  if (process.env.NODE_ENV !== "production") {
    console.debug(
      `[RouteMapSection] señalizaciones leídas=${signals.length} ` +
        `válidas/visibles=${mapVisibleSignalsBase.length} ` +
        `con coordenadas válidas=${
          mapVisibleSignalsBase.filter(
            (s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude)
          ).length
        } ` +
        `relevantes al perfil=${relevantSignals.length}`
    );
  }

  // Algoritmo de ruteo accesible completo (radar 200m → snap → waypoints
  // verdes obligatorios encadenados en el pedido real al motor → zonas de
  // exclusión rojas → validación matemática — ver
  // hooks/useAccessibleRoute.ts y lib/accessibleRouting.ts). `route` (usado
  // por el mapa, el resumen y la navegación de acá en más) es siempre la
  // geometría REAL devuelta por el motor, nunca un trazado inventado.
  const destinationPoint = destination ? { lat: destination.lat, lng: destination.lng } : null;
  const {
    route,
    status: routeStatus,
    errorMessage: routeError,
    hasUnavoidableRed,
    knownGreenSignalIds,
    knownRedSignalIds,
  } = useAccessibleRoute(origin, destinationPoint, relevantSignals);
  // Solo obstáculos ("Quiero evitar") sin evadir cuentan como problema: una
  // ayuda ("Necesito") sobre la ruta es lo buscado, nunca dispara este aviso.
  const hasUnavoidableSignal = hasUnavoidableRed;

  // Mismo recorte por corredor (sección 7: distancia geográfica real contra
  // los segmentos de la ruta, no exigir coincidencia exacta) reutilizado
  // para dos bases distintas — nunca dos implementaciones del corredor.
  // Esto es lo que usan las ALERTAS de navegación (más abajo): ahí sí tiene
  // sentido acotar estrictamente a lo que está sobre el trazado real, para
  // no avisar/recalcular por algo lejos del camino.
  const filterByCorridor = useCallback(
    (base: SignalWithTrust[]) => {
      if (route) {
        return getSignalsNearRoute(base, route.coordinates, ROUTE_CORRIDOR_METERS);
      }
      const referencePoint =
        userLocation ?? (destination ? { lat: destination.lat, lng: destination.lng } : null);
      if (!referencePoint) return base;
      return filterSignalsNearPoint(base, referencePoint, NEARBY_WITHOUT_ROUTE_RADIUS_METERS);
    },
    [route, userLocation, destination]
  );

  // Punto "OBJETIVO"/TEST A-D: la visibilidad en el MAPA nunca debe
  // RETROCEDER al calcular una ruta. Antes de tener ruta, se mostraba todo
  // lo cerca del usuario/destino (1200m); si al calcularse la ruta se
  // pasara a mostrar SOLO el corredor estricto de 80m alrededor de la
  // polyline real, cualquier señalización a más de 80m del trazado exacto
  // (algo común: un pin puesto a mano no cae siempre sobre la calle que
  // termina eligiendo el motor) desaparecería de golpe — eso es
  // exactamente el bug reportado. La solución es una UNIÓN, nunca un
  // reemplazo: todo lo que ya era visible por estar cerca del
  // usuario/origen/destino SIGUE visible, y además se suma lo que está
  // cerca del corredor real de la ruta.
  const mapSignals = useMemo(() => {
    const referencePoint =
      userLocation ?? (destination ? { lat: destination.lat, lng: destination.lng } : null);
    const nearReferencePoint = referencePoint
      ? filterSignalsNearPoint(mapVisibleSignalsBase, referencePoint, NEARBY_WITHOUT_ROUTE_RADIUS_METERS)
      : mapVisibleSignalsBase;

    if (!route) return nearReferencePoint;

    const nearRoute = getSignalsNearRoute(mapVisibleSignalsBase, route.coordinates, ROUTE_CORRIDOR_METERS);
    const byId = new Map(nearReferencePoint.map((signal) => [signal.id, signal]));
    for (const signal of nearRoute) byId.set(signal.id, signal);
    return [...byId.values()];
  }, [mapVisibleSignalsBase, route, userLocation, destination]);

  // Punto 6: en cambio, los AVISOS por voz/vibración y el recálculo durante
  // navegación (useRouteNavigation) siguen acotados ESTRICTAMENTE al
  // corredor real + relevantes para el Perfil — mostrar todo en el mapa no
  // implica alertar/recalcular por algo lejos del camino que el usuario no
  // pidió evitar ni necesita.
  const navigationNearbySignals = useMemo(
    () => filterByCorridor(relevantSignals),
    [filterByCorridor, relevantSignals]
  );

  if (process.env.NODE_ENV !== "production") {
    console.debug(
      `[RouteMapSection] señalizaciones en el mapa=${mapSignals.length} ` +
        `(unión: ${NEARBY_WITHOUT_ROUTE_RADIUS_METERS}m del usuario/destino` +
        `${route ? ` + ${ROUTE_CORRIDOR_METERS}m del corredor real` : ""}) ` +
        `estrictas al corredor+perfil (alertas/recálculo en navegación)=${navigationNearbySignals.length}`
    );
  }

  // Rojos y verdes que `route` ya tuvo en cuenta al calcularse
  // (useAccessibleRoute ya hizo lo posible por evitar/alcanzarlos):
  // recalcular por uno de estos no cambiaría nada. Ver
  // knownObstacleSignalIds/knownHelpSignalIds en useRouteNavigation.
  const knownObstacleSignalIds = knownRedSignalIds;
  const knownHelpSignalIds = knownGreenSignalIds;

  const navigation = useRouteNavigation({
    destination: destinationPoint,
    route,
    nearbySignals: navigationNearbySignals,
    knownObstacleSignalIds,
    knownHelpSignalIds,
    voiceEnabled: navigationPreferences.voiceGuidance,
    vibrationEnabled: navigationPreferences.vibrationAlerts,
    onRecalculate: setOrigin,
  });

  const handleUseCurrentLocationAsOrigin = useCallback(async () => {
    const result = await requestLocation();
    if (result) {
      setOrigin(result);
      setRecenterToken((token) => token + 1);
    }
  }, [requestLocation]);

  const handleCenterOnMyLocation = useCallback(async () => {
    if (userLocation || navigation.isActive) {
      // Ya conocemos la ubicación (o el GPS de navegación ya está activo):
      // solo recentrar/volver a seguir, sin volver a pedir permiso.
      setRecenterToken((token) => token + 1);
      return;
    }
    const result = await requestLocation();
    if (result) {
      setRecenterToken((token) => token + 1);
    }
  }, [userLocation, navigation.isActive, requestLocation]);

  const handleSelectDestination = useCallback((place: PlaceResult) => {
    setDestination(place);
  }, []);

  // Cargar origen/destino de un trayecto guardado — NUNCA restaura una
  // geometría vieja: solo fija origen/destino, exactamente igual que si el
  // usuario los hubiera elegido a mano. `useAccessibleRoute` (arriba) hace
  // el resto: vuelve a leer preferencias, señalizaciones, radar y snap
  // ACTUALES y recalcula desde cero (sección 4/6 del pedido).
  const handleUseSavedRoute = useCallback((savedRoute: SavedRoute) => {
    setOrigin({ lat: savedRoute.origin.lat, lng: savedRoute.origin.lng });
    setDestination({
      id: generateLocalId(),
      name: savedRoute.destination.label,
      address: savedRoute.destination.label,
      lat: savedRoute.destination.lat,
      lng: savedRoute.destination.lng,
    });
    setSavedRoutesOpen(false);
  }, []);

  // Sección 8: seleccionar un trayecto desde Perfil → "Lugares guardados"
  // navega acá con `?savedRouteId=<id>` — se lee UNA sola vez, con la URL
  // del browser directamente (sin useSearchParams/Suspense: no hace falta
  // más que esto), y se limpia enseguida para que un refresh no lo vuelva a
  // aplicar ni quede en el historial.
  useEffect(() => {
    if (!savedRoutesLoaded) return;
    const params = new URLSearchParams(window.location.search);
    const savedRouteId = params.get("savedRouteId");
    if (!savedRouteId) return;

    const savedRoute = savedRoutes.find((route) => route.id === savedRouteId);
    window.history.replaceState(null, "", window.location.pathname);
    if (savedRoute) {
      // Sincroniza con la URL real que trajo a esta página (sistema
      // externo, mismo patrón que useGeolocation/useLocalStorageState): no
      // es derivable en render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleUseSavedRoute(savedRoute);
    }
  }, [savedRoutesLoaded, savedRoutes, handleUseSavedRoute]);

  const defaultSavedRouteName = destination
    ? `${CURRENT_LOCATION_LABEL} → ${destination.name}`
    : "";

  const handleSaveRoute = useCallback(
    (name: string) => {
      if (!origin || !destination) return;
      addSavedRoute({
        name,
        origin: { label: CURRENT_LOCATION_LABEL, lat: origin.lat, lng: origin.lng },
        destination: { label: destination.name, lat: destination.lat, lng: destination.lng },
        routeNeedPreferencesSnapshot: routeNeedPreferences,
        routeAvoidPreferencesSnapshot: routeAvoidPreferences,
      });
      setSaveDialogOpen(false);
    },
    [origin, destination, addSavedRoute, routeNeedPreferences, routeAvoidPreferences]
  );

  const handleVerify = useCallback(
    (
      signalId: string,
      value: VerificationValue,
      reason?: IncorrectReason | null,
      reasonNote?: string | null
    ) => {
      verify(signalId, value, reason ?? null, reasonNote ?? null);
    },
    [verify]
  );

  const handleDeleteSignal = useCallback(
    (signalId: string) => {
      deleteSignal(signalId);
      if (selectedSignalId === signalId) setSelectedSignalId(null);
      if (detailSignalId === signalId) setDetailSignalId(null);
    },
    [deleteSignal, selectedSignalId, detailSignalId]
  );

  const canStartNavigation = routeStatus === "success" && route !== null;
  const detailSignal = detailSignalId
    ? (signals.find((signal) => signal.id === detailSignalId && signal.isActive) ?? null)
    : null;

  function handleToggleNavigation() {
    if (navigation.isActive) {
      navigation.finish();
    } else {
      navigation.start();
    }
  }

  return (
    <>
      <RouteSearch
        origin={origin}
        locationStatus={status}
        locationError={errorMessage}
        onUseCurrentLocation={handleUseCurrentLocationAsOrigin}
        destination={destination}
        onSelectDestination={handleSelectDestination}
        onOpenSaved={() => setSavedRoutesOpen(true)}
      />
      <GuidanceQuickSettings preferences={navigationPreferences} onToggle={toggleNavigationPreference} />
      <AccessibleMap
        className={mapClassName}
        userLocation={userLocation}
        recenterToken={recenterToken}
        onCenterOnMyLocation={handleCenterOnMyLocation}
        origin={origin}
        destination={destination}
        route={route}
        relevantSignals={mapSignals}
        selectedSignalId={selectedSignalId}
        onSelectSignal={setSelectedSignalId}
        onViewSignalDetail={setDetailSignalId}
        isNavigating={navigation.isActive}
        navigationPosition={navigation.userPosition}
      />

      {navigation.isActive ? (
        <NavigationPanel navigation={navigation} />
      ) : (
        <RouteSummary
          status={routeStatus}
          route={route}
          errorMessage={routeError}
          onSaveRoute={origin && destination ? () => setSaveDialogOpen(true) : undefined}
        />
      )}

      {/* Sección 12: si ninguna alternativa real evita la señalización
          relevante, no se oculta el problema ni se inventa un trazado —
          se muestra la mejor ruta disponible con este aviso. */}
      {routeStatus === "success" && hasUnavoidableSignal ? (
        <p className="flex items-start gap-2 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-800">
          <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          Esta ruta incluye una señalización relevante que no pudimos evitar.
        </p>
      ) : null}

      {/* "Iniciar navegación" solo se habilita con origen+destino+ruta
          válidos (sección 38). Una vez activa, el mismo botón pasa a
          "Finalizar navegación" — nunca dos navegaciones simultáneas. */}
      <button
        type="button"
        onClick={handleToggleNavigation}
        disabled={!canStartNavigation && !navigation.isActive}
        aria-pressed={navigation.isActive}
        className={`group flex w-full flex-col items-center gap-0.5 rounded-full px-6 py-4 shadow-control transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
          navigation.isActive
            ? "bg-rose-600 text-white hover:bg-rose-700 hover:shadow-card focus-visible:outline-rose-600"
            : "bg-lime-400 text-slate-950 hover:bg-lime-300 hover:shadow-card focus-visible:outline-lime-400"
        }`}
      >
        <span className="flex items-center gap-2 text-base font-semibold">
          {navigation.isActive ? (
            <CloseIcon className="h-5 w-5" />
          ) : (
            <SendIcon className="h-5 w-5" />
          )}
          {navigation.isActive ? "Finalizar navegación" : "Iniciar navegación"}
        </span>
        <span
          className={`text-xs font-normal group-disabled:text-slate-400 ${
            navigation.isActive ? "text-rose-50" : "text-slate-950/70"
          }`}
        >
          {navigation.isActive
            ? "Vas a dejar de recibir indicaciones en vivo."
            : "Te guiamos paso a paso según tus preferencias."}
        </span>
      </button>

      <SignalDetailSheet
        signal={detailSignal}
        currentUserId={currentUserId}
        onClose={() => setDetailSignalId(null)}
        onVerify={handleVerify}
        onDelete={handleDeleteSignal}
      />

      <SavedRoutesSheet
        open={isSavedRoutesOpen}
        savedRoutes={savedRoutes}
        onClose={() => setSavedRoutesOpen(false)}
        onUse={handleUseSavedRoute}
        onRename={renameSavedRoute}
        onDelete={deleteSavedRoute}
      />

      <SaveRouteDialog
        open={isSaveDialogOpen}
        defaultName={defaultSavedRouteName}
        onClose={() => setSaveDialogOpen(false)}
        onSave={handleSaveRoute}
      />
    </>
  );
}
