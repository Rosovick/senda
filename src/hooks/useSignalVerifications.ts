"use client";

import { useCallback, useMemo } from "react";
import { generateLocalId } from "@/lib/localId";
import {
  normalizeVerification,
  type IncorrectReason,
  type SignalVerification,
  type VerificationSource,
  type VerificationValue,
} from "@/lib/signalVerifications";
import { useLocalStorageState } from "./useLocalStorageState";

const VERIFICATIONS_KEY = "senda:signal-verifications";

type SetVerificationParams = {
  signalId: string;
  userId: string;
  value: VerificationValue;
  reason?: IncorrectReason | null;
  reasonNote?: string | null;
  source?: VerificationSource;
};

// Colección centralizada de validaciones comunitarias, separada de
// useReports (una señalización puede tener muchas validaciones, de muchos
// usuarios). Garantiza en un único lugar la regla "una validación activa
// por (signalId, userId)": setVerification siempre hace upsert, nunca
// agrega una segunda fila para el mismo par.
export function useSignalVerifications() {
  const [rawVerifications, setVerifications, isLoaded] = useLocalStorageState<
    SignalVerification[]
  >(VERIFICATIONS_KEY, []);

  const verifications = useMemo(
    () => rawVerifications.map(normalizeVerification).filter((v): v is SignalVerification => v !== null),
    [rawVerifications]
  );

  const setVerification = useCallback(
    (params: SetVerificationParams) => {
      setVerifications((current) => {
        const now = new Date().toISOString();
        const existingIndex = current.findIndex(
          (v) => v.signalId === params.signalId && v.userId === params.userId
        );

        if (existingIndex === -1) {
          const created: SignalVerification = {
            id: generateLocalId(),
            signalId: params.signalId,
            userId: params.userId,
            value: params.value,
            reason: params.reason ?? null,
            reasonNote: params.reasonNote ?? null,
            source: params.source ?? "manual",
            createdAt: now,
            updatedAt: now,
          };
          return [...current, created];
        }

        const next = [...current];
        next[existingIndex] = {
          ...next[existingIndex],
          value: params.value,
          reason: params.reason ?? null,
          reasonNote: params.reasonNote ?? null,
          source: params.source ?? next[existingIndex].source,
          updatedAt: now,
        };
        return next;
      });
    },
    [setVerifications]
  );

  return { verifications, setVerification, isLoaded };
}
