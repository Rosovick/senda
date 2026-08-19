"use client";

import dynamic from "next/dynamic";
import { LocateIcon, MapPinIcon } from "@/components/icons";
import { importMapWithTimeout, MapErrorBoundary, MapLoadingFallback } from "@/components/MapLoadState";
import type { Report } from "@/lib/reports";
import type { MapFocusPoint } from "./ReportsLeafletMap";

// Leaflet depende de `window`: el mapa real se carga únicamente en el
// cliente, igual que en /ruta. Ver MapLoadState.tsx.
const ReportsLeafletMap = dynamic(() => importMapWithTimeout(() => import("./ReportsLeafletMap")), {
  ssr: false,
  loading: () => <MapLoadingFallback />,
});

type ReportsMapProps = {
  reports: Report[];
  focusPoint: MapFocusPoint | null;
  focusToken: number;
  selectedReportId: string | null;
  onSelectReport?: (id: string) => void;
  onCenterOnMyLocation: () => void;
};

export default function ReportsMap({
  reports,
  focusPoint,
  focusToken,
  selectedReportId,
  onSelectReport,
  onCenterOnMyLocation,
}: ReportsMapProps) {
  return (
    // z-0 crea un stacking context propio para el mapa, conteniendo los
    // panes/controles internos de Leaflet (z-index hasta ~1000) para que no
    // se escapen a competir contra elementos de otras partes de la página,
    // como el dropdown del buscador.
    <div data-map-root className="relative z-0 h-72 overflow-hidden rounded-4xl border border-slate-200/70 bg-slate-100 shadow-card sm:h-96">
      <MapErrorBoundary>
        <ReportsLeafletMap
          reports={reports}
          focusPoint={focusPoint}
          focusToken={focusToken}
          selectedReportId={selectedReportId}
          onSelectReport={onSelectReport}
        />
      </MapErrorBoundary>

      <button
        type="button"
        onClick={onCenterOnMyLocation}
        aria-label="Centrar mapa en mi ubicación"
        className="absolute right-4 top-4 z-[1100] flex items-center gap-2 rounded-full bg-white py-3 pl-4 pr-4 text-slate-950 shadow-hero transition hover:bg-slate-50 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400"
      >
        <LocateIcon className="h-4 w-4 shrink-0" />
        <span className="text-caption font-semibold">Mi ubicación</span>
      </button>

      {reports.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center p-6">
          <div className="pointer-events-auto flex max-w-[240px] flex-col items-center gap-3 rounded-3xl bg-white px-8 py-7 text-center shadow-hero">
            <MapPinIcon className="h-7 w-7 text-slate-950" />
            <p className="text-base font-bold leading-snug text-slate-950">
              Aún no hay señalizaciones
              <br />
              en esta zona
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
