"use client";

import dynamic from "next/dynamic";
import { importMapWithTimeout, MapErrorBoundary, MapLoadingFallback } from "@/components/MapLoadState";

// Leaflet depende de `window`: se carga solo en el cliente, igual que en
// /ruta y /reportes. Ver MapLoadState.tsx.
const MapPickerLeafletMap = dynamic(() => importMapWithTimeout(() => import("./MapPickerLeafletMap")), {
  ssr: false,
  loading: () => <MapLoadingFallback />,
});

type MapPickerMapProps = {
  point: { lat: number; lng: number } | null;
  focusToken: number;
  onMapClick: (lat: number, lng: number) => void;
};

export default function MapPickerMap({ point, focusToken, onMapClick }: MapPickerMapProps) {
  return (
    // z-0 crea un stacking context propio para el mapa, conteniendo los
    // panes/controles internos de Leaflet (z-index hasta ~1000) para que no
    // se escapen a competir contra elementos de otras partes de la página,
    // como el dropdown del buscador de direcciones.
    <div data-map-root className="relative z-0 h-64 overflow-hidden rounded-4xl border border-slate-200/70 bg-slate-100 shadow-card sm:h-72">
      <MapErrorBoundary>
        <MapPickerLeafletMap point={point} focusToken={focusToken} onMapClick={onMapClick} />
      </MapErrorBoundary>
    </div>
  );
}
