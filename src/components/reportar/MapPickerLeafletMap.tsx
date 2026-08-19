"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { CARTO_MAX_ZOOM, CARTO_TILE_ATTRIBUTION, CARTO_TILE_SUBDOMAINS, CARTO_TILE_URL } from "@/lib/mapTiles";

// Misma configuración de mapa que /ruta y /reportes (Leaflet + OpenStreetMap).
const FALLBACK_CENTER: [number, number] = [-34.5951, -58.3736];

function buildPickerIcon() {
  return L.divIcon({
    className: "",
    html: `
      <span style="
        display:flex;align-items:center;justify-content:center;
        width:34px;height:34px;border-radius:9999px;
        background:#a0d400;border:3px solid white;
        box-shadow:0 2px 8px rgba(15,23,42,0.35);
      ">
        <span style="width:10px;height:10px;border-radius:9999px;background:white;"></span>
      </span>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

const pickerIcon = buildPickerIcon();

function MapFocusController({
  point,
  focusToken,
}: {
  point: { lat: number; lng: number } | null;
  focusToken: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (focusToken === 0 || !point) return;
    map.setView([point.lat, point.lng], 17);
  }, [focusToken, point, map]);

  return null;
}

// Ver el mismo controller en components/route/LeafletMap.tsx: Leaflet mide
// su contenedor una sola vez al montar, y en mobile el viewport suele
// asentarse recién después (barra de direcciones, fuentes, el swap del
// `dynamic import`), dejando el mapa con tiles mal calculados. Se repite acá
// (no se comparte el componente entre mapas) porque cada mapa vive en un
// `MapContainer`/árbol de contexto de react-leaflet distinto.
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

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onMapClick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

type MapPickerLeafletMapProps = {
  point: { lat: number; lng: number } | null;
  focusToken: number;
  onMapClick: (lat: number, lng: number) => void;
};

// El mapa siempre acepta clics para fijar/ajustar el punto, sin importar qué
// método haya iniciado la selección (ubicación actual, búsqueda o mapa).
export default function MapPickerLeafletMap({
  point,
  focusToken,
  onMapClick,
}: MapPickerLeafletMapProps) {
  const center = point ?? { lat: FALLBACK_CENTER[0], lng: FALLBACK_CENTER[1] };

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={point ? 17 : 13}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution={CARTO_TILE_ATTRIBUTION}
        url={CARTO_TILE_URL}
        subdomains={CARTO_TILE_SUBDOMAINS}
        maxZoom={CARTO_MAX_ZOOM}
      />

      {point && <Marker position={[point.lat, point.lng]} icon={pickerIcon} />}

      <MapInvalidateSizeController />
      <MapFocusController point={point} focusToken={focusToken} />
      <ClickHandler onMapClick={onMapClick} />
    </MapContainer>
  );
}
