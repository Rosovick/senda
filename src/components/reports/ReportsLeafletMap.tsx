"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { Report } from "@/lib/reports";
import { CARTO_MAX_ZOOM, CARTO_TILE_ATTRIBUTION, CARTO_TILE_SUBDOMAINS, CARTO_TILE_URL } from "@/lib/mapTiles";

// Misma configuración de mapa que /ruta (Leaflet + OpenStreetMap): se
// reutiliza la tecnología en vez de agregar una segunda librería.
// Posición de referencia (Plaza San Martín, Buenos Aires) solo como centro
// inicial hasta que el usuario busque una zona.
const FALLBACK_CENTER: [number, number] = [-34.5951, -58.3736];

function buildBarrierIcon(isSelected: boolean) {
  const size = isSelected ? 42 : 34;
  return L.divIcon({
    className: "",
    html: `
      <span style="
        display:flex;align-items:center;justify-content:center;
        width:${size}px;height:${size}px;border-radius:9999px;
        background:#f97316;border:3px solid white;
        box-shadow:0 2px 8px rgba(15,23,42,0.35)${
          isSelected ? ", 0 0 0 4px rgba(20,184,92,0.45)" : ""
        };
      ">
        <span style="width:10px;height:10px;border-radius:9999px;background:white;"></span>
      </span>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const barrierIcon = buildBarrierIcon(false);
const barrierIconSelected = buildBarrierIcon(true);

export type MapFocusPoint = { lat: number; lng: number; zoom?: number };

// Centra (y opcionalmente hace zoom) cuando el usuario elige un lugar en el
// buscador, toca "Mi ubicación" o selecciona un reporte. No hace nada
// mientras focusToken siga en 0 (todavía no se disparó ninguna acción).
function MapFocusController({
  focusPoint,
  focusToken,
}: {
  focusPoint: MapFocusPoint | null;
  focusToken: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (focusToken === 0 || !focusPoint) return;
    map.setView([focusPoint.lat, focusPoint.lng], focusPoint.zoom ?? 16);
  }, [focusToken, focusPoint, map]);

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

type ReportsLeafletMapProps = {
  reports: Report[];
  focusPoint: MapFocusPoint | null;
  focusToken: number;
  selectedReportId: string | null;
  onSelectReport?: (id: string) => void;
};

// Los marcadores de barreras se generan a partir de `reports`, usando
// exactamente report.latitude/report.longitude: el mismo objeto que
// muestra la card correspondiente, no coordenadas separadas.
export default function ReportsLeafletMap({
  reports,
  focusPoint,
  focusToken,
  selectedReportId,
  onSelectReport,
}: ReportsLeafletMapProps) {
  return (
    <MapContainer center={FALLBACK_CENTER} zoom={14} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution={CARTO_TILE_ATTRIBUTION}
        url={CARTO_TILE_URL}
        subdomains={CARTO_TILE_SUBDOMAINS}
        maxZoom={CARTO_MAX_ZOOM}
      />

      {reports.map((report) => (
        <Marker
          key={report.id}
          position={[report.latitude, report.longitude]}
          icon={report.id === selectedReportId ? barrierIconSelected : barrierIcon}
          eventHandlers={
            onSelectReport ? { click: () => onSelectReport(report.id) } : undefined
          }
        >
          <Popup>{report.description || "Barrera reportada"}</Popup>
        </Marker>
      ))}

      <MapInvalidateSizeController />
      <MapFocusController focusPoint={focusPoint} focusToken={focusToken} />
    </MapContainer>
  );
}
