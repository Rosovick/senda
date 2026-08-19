"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { FlagIcon, LocateIcon } from "@/components/icons";
import { importMapWithTimeout, MapErrorBoundary, MapLoadingFallback } from "@/components/MapLoadState";
import type { GeoCoordinates } from "@/hooks/useGeolocation";
import type { SignalWithTrust } from "@/hooks/useSignals";
import type { PlaceResult } from "@/hooks/usePlaceSearch";
import type { RouteData } from "@/lib/routing";

// Leaflet depende de `window`, que no existe durante el renderizado en el
// servidor: el mapa real se carga únicamente en el cliente. Ver
// MapLoadState.tsx.
const LeafletMap = dynamic(() => importMapWithTimeout(() => import("./LeafletMap")), {
  ssr: false,
  loading: () => <MapLoadingFallback />,
});

type AccessibleMapProps = {
  className?: string;
  userLocation: GeoCoordinates | null;
  recenterToken: number;
  onCenterOnMyLocation: () => void;
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

// Mapa real (Leaflet + OpenStreetMap). Mantiene la misma interfaz de props
// que el placeholder original, para poder seguir evolucionándolo sin
// reconstruir el resto de la pantalla.
export default function AccessibleMap({
  className = "",
  userLocation,
  recenterToken,
  onCenterOnMyLocation,
  origin,
  destination,
  route,
  relevantSignals,
  selectedSignalId,
  onSelectSignal,
  onViewSignalDetail,
  isNavigating,
  navigationPosition,
}: AccessibleMapProps) {
  return (
    // z-0 (no solo `relative`) es lo que importa acá: crea un stacking
    // context propio que contiene los panes/controles internos de Leaflet
    // (que usan z-index hasta ~1000). Sin esto, esos valores "se escapan"
    // del wrapper y compiten directamente contra elementos de otras partes
    // de la página, como el dropdown del buscador — y como 1000 > 30, el
    // mapa terminaba tapándolo pese a que el dropdown está "después" en el
    // documento. Con el mapa contenido en su propio contexto, cualquier
    // elemento fuera de él con un z-index mayor que z-0 (como el dropdown,
    // en z-30) queda garantizado por encima del mapa entero.
    <div
      data-map-root
      className={`relative z-0 overflow-hidden rounded-4xl border border-slate-200/70 bg-slate-100 shadow-card ${className}`}
    >
      <div className="absolute inset-0">
        <MapErrorBoundary>
          <LeafletMap
            userLocation={userLocation}
            recenterToken={recenterToken}
            origin={origin}
            destination={destination}
            route={route}
            relevantSignals={relevantSignals}
            selectedSignalId={selectedSignalId}
            onSelectSignal={onSelectSignal}
            onViewSignalDetail={onViewSignalDetail}
            isNavigating={isNavigating}
            navigationPosition={navigationPosition}
          />
        </MapErrorBoundary>
      </div>

      <button
        type="button"
        onClick={onCenterOnMyLocation}
        aria-label="Centrar mapa en mi ubicación"
        className="absolute right-4 top-4 z-[1100] flex items-center gap-2 rounded-full bg-white py-3 pl-4 pr-4 text-slate-950 shadow-hero transition hover:bg-slate-50 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400"
      >
        <LocateIcon className="h-4 w-4 shrink-0" />
        <span className="text-caption font-semibold">Mi ubicación actual</span>
      </button>

      <Link
        href="/reportes"
        aria-label="Reportar una barrera"
        className="absolute bottom-4 right-4 z-[1100] flex h-14 w-14 items-center justify-center rounded-full bg-lime-400 text-slate-950 shadow-hero transition hover:bg-lime-300 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400"
      >
        <FlagIcon className="h-6 w-6" />
      </Link>
    </div>
  );
}
