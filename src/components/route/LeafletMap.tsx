"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import type { GeoCoordinates } from "@/hooks/useGeolocation";
import type { SignalWithTrust } from "@/hooks/useSignals";
import type { PlaceResult } from "@/hooks/usePlaceSearch";
import type { RouteData } from "@/lib/routing";
import { CARTO_MAX_ZOOM, CARTO_TILE_ATTRIBUTION, CARTO_TILE_SUBDOMAINS, CARTO_TILE_URL } from "@/lib/mapTiles";
import RouteSignalPopup from "./RouteSignalPopup";
import { buildRouteSignalMarkerIcon } from "./routeSignalMarkerIcon";

// Posición inicial de referencia (Plaza San Martín, Buenos Aires). Funciona
// únicamente como fallback visual hasta que se obtenga la ubicación real del
// usuario: nunca se muestra ni se etiqueta como si fuera su posición real.
const FALLBACK_LOCATION: GeoCoordinates = { lat: -34.5951, lng: -58.3736 };

function buildLocationIcon(color: string, size = 34) {
  const haloSize = size * 2.4;
  return L.divIcon({
    className: "",
    html: `
      <span style="position:relative;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;">
        <span style="position:absolute;width:${haloSize}px;height:${haloSize}px;border-radius:9999px;background:radial-gradient(circle, ${color}40 0%, ${color}00 70%);"></span>
        <span style="
          position:relative;display:flex;align-items:center;justify-content:center;
          width:${size}px;height:${size}px;border-radius:9999px;
          background:${color};border:3px solid white;
          box-shadow:0 2px 8px rgba(15,23,42,0.35);
        ">
          <span style="width:10px;height:10px;border-radius:9999px;background:white;"></span>
        </span>
      </span>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// Sección "ORDEN VISUAL": pane explícito para la polyline de la ruta, con
// un z-index por debajo del markerPane por defecto de Leaflet (600) — así
// la ruta NUNCA puede terminar tapando un marker de señalización, sin
// depender únicamente del orden implícito entre overlayPane (400, donde
// cae un <Polyline> sin pane propio) y markerPane. No cambia el diseño de
// los íconos ni de la línea, solo garantiza el orden de apilado.
const ROUTE_PANE_NAME = "senda-route-pane";
const ROUTE_PANE_Z_INDEX = "450"; // overlayPane(400) < acá < markerPane(600)

function RoutePaneController() {
  const map = useMap();

  useEffect(() => {
    if (map.getPane(ROUTE_PANE_NAME)) return;
    const pane = map.createPane(ROUTE_PANE_NAME);
    pane.style.zIndex = ROUTE_PANE_Z_INDEX;
  }, [map]);

  return null;
}

const referenceIcon = buildLocationIcon("#8a8a82");
const userLocationIcon = buildLocationIcon("#a0d400");
const destinationIcon = buildLocationIcon("#7c3aed");
const navigatingUserIcon = buildLocationIcon("#a0d400", 30);

// Recentra el mapa de forma imperativa cuando corresponde (botón "Mi
// ubicación" u obtención del origen), sin interferir con el arrastre manual
// del usuario el resto del tiempo.
function MapRecenterController({
  location,
  recenterToken,
}: {
  location: GeoCoordinates | null;
  recenterToken: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (recenterToken === 0 || !location) return;
    map.setView([location.lat, location.lng], map.getZoom());
  }, [recenterToken, location, map]);

  return null;
}

// Ajusta la vista cuando se selecciona un destino: si ya hay origen, muestra
// ambos puntos; si no, centra sobre el destino solo.
function MapDestinationController({
  origin,
  destination,
}: {
  origin: GeoCoordinates | null;
  destination: PlaceResult | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!destination) return;

    if (origin) {
      const bounds = L.latLngBounds(
        [origin.lat, origin.lng],
        [destination.lat, destination.lng]
      );
      map.fitBounds(bounds, { padding: [56, 56], maxZoom: 17 });
    } else {
      map.setView([destination.lat, destination.lng], 16);
    }
  }, [destination, origin, map]);

  return null;
}

// Ajusta la vista a la geometría real de la ruta calculada (más precisa que
// solo los dos extremos, ya que el recorrido puede desviarse por las calles).
// No se dispara mientras hay navegación activa: ahí el mapa sigue al
// usuario (ver MapFollowController), no a la ruta completa.
function MapRouteController({
  route,
  isNavigating,
}: {
  route: RouteData | null;
  isNavigating: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (isNavigating || !route || route.coordinates.length === 0) return;
    const bounds = L.latLngBounds(route.coordinates);
    map.fitBounds(bounds, { padding: [56, 56], maxZoom: 17 });
  }, [route, isNavigating, map]);

  return null;
}

// Leaflet calcula el tamaño interno de los tiles UNA sola vez al montar,
// leyendo las dimensiones que tenga el contenedor en ese momento. Si el
// layout se termina de asentar después (fuente recién cargada, el propio
// swap del `dynamic import` de "Cargando mapa…" al mapa real, o —el caso
// más común en celulares— la barra de direcciones del navegador
// colapsando/expandiéndose y cambiando el viewport ya con la página
// montada), ese tamaño queda desactualizado: el mapa se ve en blanco,
// con tiles cortados o fuera de posición. En desktop el viewport no
// cambia solo, por eso ahí no se nota. `invalidateSize()` le pide a
// Leaflet que vuelva a medir su contenedor; lo disparamos al montar (con
// un pequeño delay para esperar ese asentamiento) y de nuevo cada vez que
// el contenedor cambia de tamaño real (ResizeObserver cubre resize de
// ventana, rotación y cualquier cambio de layout, no solo `resize`).
function MapInvalidateSizeController() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();

    const timeoutId = window.setTimeout(() => {
      map.invalidateSize();
    }, 250);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(container);

    function handleOrientationChange() {
      // La rotación dispara su propio reflow; un pequeño delay evita medir
      // a mitad de la transición.
      window.setTimeout(() => map.invalidateSize(), 200);
    }
    window.addEventListener("orientationchange", handleOrientationChange);

    return () => {
      window.clearTimeout(timeoutId);
      resizeObserver.disconnect();
      window.removeEventListener("orientationchange", handleOrientationChange);
    };
  }, [map]);

  return null;
}

// Durante navegación activa, el mapa sigue automáticamente al usuario
// (sección 42) — pero solo mientras nadie movió el mapa a mano. Si la
// persona arrastra el mapa, se deja de seguir hasta que vuelva a tocar "Mi
// ubicación" (mismo botón de siempre, sección 43).
function MapFollowController({
  position,
  isNavigating,
  followToken,
}: {
  position: GeoCoordinates | null;
  isNavigating: boolean;
  followToken: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!isNavigating || !position) return;
    map.setView([position.lat, position.lng], Math.max(map.getZoom(), 17), { animate: true });
    // followToken fuerza a re-centrar cuando el usuario toca "Mi ubicación"
    // de nuevo tras haber movido el mapa manualmente; el resto del tiempo,
    // seguir cada posición nueva mientras isNavigating siga activo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, isNavigating, followToken]);

  return null;
}

type LeafletMapProps = {
  userLocation: GeoCoordinates | null;
  recenterToken: number;
  origin: GeoCoordinates | null;
  destination: PlaceResult | null;
  route: RouteData | null;
  relevantSignals: SignalWithTrust[];
  selectedSignalId: string | null;
  onSelectSignal: (id: string) => void;
  onViewSignalDetail: (id: string) => void;
  isNavigating: boolean;
  navigationPosition: GeoCoordinates | null;
};

export default function LeafletMap({
  userLocation,
  recenterToken,
  origin,
  destination,
  route,
  relevantSignals,
  selectedSignalId,
  onSelectSignal,
  onViewSignalDetail,
  isNavigating,
  navigationPosition,
}: LeafletMapProps) {
  const initialCenter = userLocation ?? FALLBACK_LOCATION;

  return (
    <MapContainer
      center={[initialCenter.lat, initialCenter.lng]}
      zoom={16}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution={CARTO_TILE_ATTRIBUTION}
        url={CARTO_TILE_URL}
        subdomains={CARTO_TILE_SUBDOMAINS}
        maxZoom={CARTO_MAX_ZOOM}
      />

      {/* Antes que cualquier <Polyline>: su efecto debe crear el pane antes
          de que la ruta intente usarlo (ver ROUTE_PANE_NAME más abajo). */}
      <RoutePaneController />

      {isNavigating && navigationPosition ? (
        <Marker position={[navigationPosition.lat, navigationPosition.lng]} icon={navigatingUserIcon}>
          <Popup>Tu posición actual</Popup>
        </Marker>
      ) : userLocation ? (
        <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon}>
          <Popup>Tu ubicación</Popup>
        </Marker>
      ) : (
        <Marker
          position={[FALLBACK_LOCATION.lat, FALLBACK_LOCATION.lng]}
          icon={referenceIcon}
        >
          <Popup>Ubicación de referencia (todavía no accedimos a tu ubicación real)</Popup>
        </Marker>
      )}

      {destination && (
        <Marker position={[destination.lat, destination.lng]} icon={destinationIcon}>
          <Popup>{destination.name}</Popup>
        </Marker>
      )}

      {route && (
        <Polyline
          positions={route.coordinates}
          pane={ROUTE_PANE_NAME}
          pathOptions={{ color: "#a0d400", weight: 5, opacity: 0.9 }}
        />
      )}

      {/* Sección "SEPARAR CAPAS": los markers de señalizaciones se siguen
          renderizando acá, en el markerPane por defecto de Leaflet —
          independiente de la Polyline de arriba (pane propio, sección
          "ORDEN VISUAL") y de si `route` existe o no. Recalcular la ruta
          reemplaza el elemento <Polyline> (React reconcilia solo eso); esta
          lista de <Marker> no depende de `route` en absoluto. */}
      {relevantSignals.map((signal) => (
        <Marker
          key={signal.id}
          position={[signal.latitude, signal.longitude]}
          icon={buildRouteSignalMarkerIcon(signal, signal.id === selectedSignalId)}
          eventHandlers={{ click: () => onSelectSignal(signal.id) }}
        >
          <Popup>
            <RouteSignalPopup signal={signal} onViewDetail={() => onViewSignalDetail(signal.id)} />
          </Popup>
        </Marker>
      ))}

      <MapInvalidateSizeController />
      <MapRecenterController location={userLocation} recenterToken={recenterToken} />
      <MapDestinationController origin={origin} destination={destination} />
      <MapRouteController route={route} isNavigating={isNavigating} />
      <MapFollowController
        position={navigationPosition}
        isNavigating={isNavigating}
        followToken={recenterToken}
      />
    </MapContainer>
  );
}
