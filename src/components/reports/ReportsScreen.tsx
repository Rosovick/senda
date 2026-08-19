"use client";

import { useCallback, useEffect, useState } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useSignals } from "@/hooks/useSignals";
import type { PlaceResult } from "@/hooks/usePlaceSearch";
import { filterReports, type ReportFilterKey } from "@/lib/reports";
import type { IncorrectReason, VerificationValue } from "@/lib/signalVerifications";
import ReportCard from "./ReportCard";
import ReportFilters from "./ReportFilters";
import ReportsEmptyState from "./ReportsEmptyState";
import ReportsMap from "./ReportsMap";
import SignalDetailSheet from "./SignalDetailSheet";
import type { MapFocusPoint } from "./ReportsLeafletMap";
import ReportsSearchBar from "./ReportsSearchBar";

// Dueño del estado de /reportes. La UI depende de `activeSignals.length ===
// 0` vs. `> 0`, nunca de datos inventados: useSignals() lee la misma
// colección centralizada (reportes + validaciones) que /reportar escribe.
export default function ReportsScreen() {
  const { signals, currentUserId, verify, deleteSignal } = useSignals();
  const { location: userLocation, requestLocation } = useGeolocation();
  const [filter, setFilter] = useState<ReportFilterKey>("nearby");
  const [focusPoint, setFocusPoint] = useState<MapFocusPoint | null>(null);
  const [focusToken, setFocusToken] = useState(0);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [detailSignalId, setDetailSignalId] = useState<string | null>(null);

  // Una señalización retirada (soft delete) nunca se ve en el panel ni en
  // el mapa, aunque el registro se conserve para historial.
  const activeSignals = signals.filter((signal) => signal.isActive);

  const handleSelectPlace = useCallback((place: PlaceResult) => {
    setFocusPoint({ lat: place.lat, lng: place.lng, zoom: 16 });
    setFocusToken((token) => token + 1);
  }, []);

  // Reutiliza la geolocalización existente (misma que /ruta). Si ya
  // conocemos la ubicación, solo recentra; si no, la pide una vez.
  async function handleCenterOnMyLocation() {
    if (userLocation) {
      setFocusPoint({ ...userLocation, zoom: 16 });
      setFocusToken((token) => token + 1);
      return;
    }
    const result = await requestLocation();
    if (result) {
      setFocusPoint({ ...result, zoom: 16 });
      setFocusToken((token) => token + 1);
    }
  }

  // Única función para ambos sentidos: tocar una card o tocar su marcador
  // llaman a lo mismo. Además de centrar el mapa, tocar una card abre su
  // ficha de detalle (ver SignalDetailSheet).
  function handleSelectReport(id: string) {
    const next = selectedReportId === id ? null : id;
    setSelectedReportId(next);
    setDetailSignalId(id);

    if (next) {
      const report = activeSignals.find((item) => item.id === next);
      if (report) {
        setFocusPoint({ lat: report.latitude, lng: report.longitude, zoom: 17 });
        setFocusToken((token) => token + 1);
      }
    }
  }

  function handleVerify(
    signalId: string,
    value: VerificationValue,
    reason?: IncorrectReason | null,
    reasonNote?: string | null
  ) {
    verify(signalId, value, reason ?? null, reasonNote ?? null);
  }

  function handleDelete(signalId: string) {
    deleteSignal(signalId);
    if (selectedReportId === signalId) setSelectedReportId(null);
  }

  useEffect(() => {
    if (!selectedReportId) return;
    document
      .getElementById(`report-${selectedReportId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedReportId]);

  const hasReports = activeSignals.length > 0;
  const visibleReports = hasReports ? filterReports(activeSignals, filter, currentUserId) : [];
  const detailSignal = detailSignalId
    ? (activeSignals.find((item) => item.id === detailSignalId) ?? null)
    : null;

  return (
    <>
      <ReportsSearchBar onSelectPlace={handleSelectPlace} />
      <ReportsMap
        reports={activeSignals}
        focusPoint={focusPoint}
        focusToken={focusToken}
        selectedReportId={selectedReportId}
        onSelectReport={handleSelectReport}
        onCenterOnMyLocation={handleCenterOnMyLocation}
      />

      {hasReports ? (
        <>
          <ReportFilters active={filter} onChange={setFilter} />
          <div className="flex flex-col gap-4">
            {visibleReports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                isSelected={report.id === selectedReportId}
                onSelect={() => handleSelectReport(report.id)}
              />
            ))}
          </div>
        </>
      ) : (
        <ReportsEmptyState />
      )}

      <SignalDetailSheet
        signal={detailSignal}
        currentUserId={currentUserId}
        onClose={() => setDetailSignalId(null)}
        onVerify={handleVerify}
        onDelete={handleDelete}
      />
    </>
  );
}
