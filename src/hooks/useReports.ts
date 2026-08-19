"use client";

import { useCallback, useMemo } from "react";
import { normalizeReport, type Report } from "@/lib/reports";
import { useLocalStorageState } from "./useLocalStorageState";

const REPORTS_KEY = "senda:reports";

// Colección centralizada de señalizaciones: /reportes, /ruta y /reportar
// leen y escriben esta misma fuente (hoy localStorage, detrás de un hook;
// el día que haya backend real, solo cambia esta capa). Empieza en []
// porque todavía no existe ninguna señalización real.
export function useReports() {
  const [rawReports, setReports, isLoaded] = useLocalStorageState<Report[]>(REPORTS_KEY, []);

  // Todo lo que sale de acá ya pasó por normalizeReport: ningún consumidor
  // necesita defenderse de señalizaciones guardadas antes de este modelo.
  const reports = useMemo(() => rawReports.map(normalizeReport), [rawReports]);

  if (process.env.NODE_ENV !== "production" && isLoaded) {
    console.debug(`[useReports] key="${REPORTS_KEY}" cargados=${reports.length}`);
  }

  const addReport = useCallback(
    (report: Report) => {
      setReports((current) => [...current, report]);
    },
    [setReports]
  );

  const updateReport = useCallback(
    (id: string, patch: Partial<Report>) => {
      const now = new Date().toISOString();
      setReports((current) =>
        current.map((report) =>
          report.id === id ? { ...report, ...patch, id: report.id, updatedAt: now } : report
        )
      );
    },
    [setReports]
  );

  // Soft delete: nunca se borra el registro. "Retirada" dejar de aparecer
  // como activa (ver isActive en useSignals) y no debe participar de rutas
  // más adelante, pero se conserva para historial y para no dejar
  // validaciones comunitarias huérfanas.
  const softDeleteReport = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      setReports((current) =>
        current.map((report) =>
          report.id === id
            ? { ...report, deletedAt: now, status: "withdrawn", updatedAt: now }
            : report
        )
      );
    },
    [setReports]
  );

  return { reports, addReport, updateReport, softDeleteReport, isLoaded };
}
