// Verificación comunitaria de una señalización: "esto sigue existiendo",
// "esto ya no está" o "esta información está mal". No es una red social
// (no hay upvote/like): cada persona expresa lo que observó sobre una
// condición real de la ciudad.
export type VerificationValue = "confirmed" | "resolved" | "incorrect";

export const VERIFICATION_VALUE_LABELS: Record<VerificationValue, string> = {
  confirmed: "Sí, sigue así",
  resolved: "Ya no está",
  incorrect: "La información es incorrecta",
};

// De dónde vino la verificación. Hoy todo lo que se crea desde la ficha de
// detalle usa "manual". Preparado para una futura verificación por
// proximidad (alguien que realmente pasó cerca) o durante la navegación,
// que podría pesar más que una manual — no implementado todavía.
export type VerificationSource = "manual" | "nearby" | "navigation";

export type IncorrectReason =
  | "wrong_location"
  | "wrong_category"
  | "misleading_or_false"
  | "duplicate"
  | "other";

export const INCORRECT_REASON_LABELS: Record<IncorrectReason, string> = {
  wrong_location: "Ubicación incorrecta",
  wrong_category: "Tipo o categoría incorrecta",
  misleading_or_false: "Información engañosa o falsa",
  duplicate: "Señalización duplicada",
  other: "Otro",
};

export const INCORRECT_REASON_OPTIONS: { key: IncorrectReason; label: string }[] = (
  Object.keys(INCORRECT_REASON_LABELS) as IncorrectReason[]
).map((key) => ({ key, label: INCORRECT_REASON_LABELS[key] }));

// Una verificación por (signalId, userId): quien creó la señalización no
// puede verificarla a sí mismo (se controla en la UI/hook, no acá — este
// archivo es solo el modelo). Cambiar de opinión reemplaza la fila
// existente, nunca agrega una segunda.
export type SignalVerification = {
  id: string;
  signalId: string;
  userId: string;
  value: VerificationValue;
  reason: IncorrectReason | null; // solo tiene sentido cuando value === "incorrect"
  reasonNote: string | null; // texto libre opcional cuando reason === "other"
  source: VerificationSource;
  createdAt: string; // ISO
  updatedAt: string; // ISO: cuándo cambió por última vez esta verificación
};

const VERIFICATION_VALUE_SET = new Set<VerificationValue>(
  Object.keys(VERIFICATION_VALUE_LABELS) as VerificationValue[]
);

function isVerificationValue(value: unknown): value is VerificationValue {
  return typeof value === "string" && VERIFICATION_VALUE_SET.has(value as VerificationValue);
}

const INCORRECT_REASON_SET = new Set<IncorrectReason>(
  Object.keys(INCORRECT_REASON_LABELS) as IncorrectReason[]
);

function isIncorrectReason(value: unknown): value is IncorrectReason {
  return typeof value === "string" && INCORRECT_REASON_SET.has(value as IncorrectReason);
}

const VERIFICATION_SOURCE_SET = new Set<VerificationSource>(["manual", "nearby", "navigation"]);

function isVerificationSource(value: unknown): value is VerificationSource {
  return typeof value === "string" && VERIFICATION_SOURCE_SET.has(value as VerificationSource);
}

// Descarta filas corruptas o incompletas en vez de dejarlas pasar con
// valores inventados: una verificación sin signalId/userId/value válidos no
// puede participar del cálculo de confianza. Ver uso en
// useSignalVerifications.
export function normalizeVerification(raw: SignalVerification): SignalVerification | null {
  if (
    !raw ||
    typeof raw.id !== "string" ||
    typeof raw.signalId !== "string" ||
    typeof raw.userId !== "string" ||
    !isVerificationValue(raw.value)
  ) {
    return null;
  }

  return {
    id: raw.id,
    signalId: raw.signalId,
    userId: raw.userId,
    value: raw.value,
    reason: isIncorrectReason(raw.reason) ? raw.reason : null,
    reasonNote: typeof raw.reasonNote === "string" ? raw.reasonNote : null,
    source: isVerificationSource(raw.source) ? raw.source : "manual",
    createdAt: raw.createdAt ?? raw.updatedAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? raw.createdAt ?? new Date().toISOString(),
  };
}
