"use client";

import { useMemo } from "react";
import type { Report } from "@/lib/reports";
import { evaluateSignalTrust, type SignalTrust } from "@/lib/signalTrust";
import type { IncorrectReason, SignalVerification, VerificationValue } from "@/lib/signalVerifications";
import { useLocalIdentity } from "./useLocalIdentity";
import { useReports } from "./useReports";
import { useSignalVerifications } from "./useSignalVerifications";

export type SignalWithTrust = Report &
  SignalTrust & {
    isOwner: boolean;
    myVerification: SignalVerification | null;
    // false para señalizaciones retiradas (soft delete): no deben
    // aparecer en el panel ni, más adelante, participar de rutas.
    isActive: boolean;
  };

// Une la colección de señalizaciones (useReports) con las validaciones
// comunitarias (useSignalVerifications) y la identidad local
// (useLocalIdentity) en objetos listos para la UI. Es el único lugar donde
// se calcula "esto es mío" o "esto está confirmado": ningún componente
// vuelve a calcularlo por su cuenta.
export function useSignals() {
  const { userId: currentUserId } = useLocalIdentity();
  const { reports, addReport, updateReport, softDeleteReport, isLoaded: reportsLoaded } =
    useReports();
  const { verifications, setVerification, isLoaded: verificationsLoaded } =
    useSignalVerifications();

  const signals: SignalWithTrust[] = useMemo(() => {
    // Sin pasar `now`: evaluateSignalTrust usa Date.now() como valor por
    // defecto internamente. No se calcula acá para no llamar una función
    // impura durante el render del hook (Date.now() directo en un useMemo
    // rompe la regla de pureza de render de React).
    return reports.map((report) => {
      const trust = evaluateSignalTrust(report, verifications);
      const myVerification =
        currentUserId != null
          ? verifications.find((v) => v.signalId === report.id && v.userId === currentUserId) ??
            null
          : null;

      return {
        ...report,
        ...trust,
        isOwner: currentUserId != null && report.userId === currentUserId,
        myVerification,
        isActive: trust.status !== "withdrawn",
      };
    });
  }, [reports, verifications, currentUserId]);

  // El creador no puede validar su propia señalización (ver sección 12):
  // se controla acá, en el único lugar que escribe verificaciones, no solo
  // ocultando el botón en la UI.
  function verify(
    signalId: string,
    value: VerificationValue,
    reason: IncorrectReason | null = null,
    reasonNote: string | null = null
  ) {
    if (!currentUserId) return;
    const signal = signals.find((item) => item.id === signalId);
    if (!signal || signal.isOwner) return;
    setVerification({ signalId, userId: currentUserId, value, reason, reasonNote, source: "manual" });
  }

  function deleteSignal(signalId: string) {
    const signal = signals.find((item) => item.id === signalId);
    if (!signal || !signal.isOwner) return;
    softDeleteReport(signalId);
  }

  function editSignal(signalId: string, patch: Partial<Report>) {
    const signal = signals.find((item) => item.id === signalId);
    if (!signal || !signal.isOwner) return;
    updateReport(signalId, patch);
  }

  return {
    signals,
    currentUserId,
    addReport,
    verify,
    deleteSignal,
    editSignal,
    isLoaded: reportsLoaded && verificationsLoaded,
  };
}
