import { normalizeReportStatus, type Report, type ReportStatus, type SignalType } from "./reports";
import type { SignalVerification } from "./signalVerifications";

// Umbrales centralizados: nada de números mágicos repartidos por
// componentes ni por ReportCard/SignalDetailSheet. Pensados para que UNA
// sola persona nunca pueda, por sí misma, llevar una señalización a
// CONFIRMED ni a RESOLVED, y para que UNA sola contradicción nunca destruya
// una señalización con evidencia sólida.
export const SIGNAL_TRUST_THRESHOLDS = {
  // Usuarios distintos con "Sí, sigue así" necesarios para CONFIRMED.
  MIN_CONFIRMATIONS: 3,
  // Usuarios distintos con "Ya no está" necesarios para POSSIBLY_RESOLVED.
  POSSIBLY_RESOLVED_MIN: 2,
  // Usuarios distintos con "Ya no está" necesarios para RESOLVED.
  RESOLVED_MIN: 3,
  // Usuarios distintos (con "Ya no está" O "Información incorrecta")
  // necesarios como mínimo para siquiera considerar UNDER_REVIEW.
  REVIEW_CONTRADICTION_MIN: 2,
  // Además del mínimo de arriba, la evidencia contradictoria (ponderada por
  // recencia) tiene que representar al menos esta fracción de la evidencia
  // a favor para considerarse "significativa" — así 1 de cada 10
  // confirmaciones no dispara una revisión, pero 2 de cada 3 sí.
  CONTRADICTION_RATIO: 0.3,
  // Una verificación de hasta esta antigüedad pesa el máximo (RECENT).
  RECENT_DAYS: 30,
  // Entre RECENT_DAYS y STALE_DAYS pesa menos (AGING). Más allá de
  // STALE_DAYS pesa mínimo (STALE), pero nunca se descarta del todo: sigue
  // existiendo para historial, solo pierde influencia sobre el estado
  // actual (ver recencyWeight).
  STALE_DAYS: 90,
} as const;

const RECENCY_WEIGHT = {
  recent: 1,
  aging: 0.5,
  stale: 0.2,
} as const;

export type SignalTrust = {
  status: ReportStatus;
  confidenceScore: number; // 0–100, uso interno/futuro (rutas). No se muestra crudo en la UI.
  confidenceLabel: string; // "Pendiente de validación" / "Confianza baja/media/alta" / "En revisión" / ""
  confirmedCount: number;
  resolvedCount: number;
  incorrectCount: number;
  lastConfirmedAt: string | null;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Punto de extensión preparado (no implementado todavía): condiciones más
// permanentes (escalera, paso angosto, pendiente) podrán envejecer más
// lento que condiciones más cambiantes (obra, bache, vereda obstaculizada,
// semáforo) sin tener que tocar evaluateSignalTrust ni los componentes que
// lo consumen — hoy siempre devuelve 1 (todas envejecen igual).
// Parámetro del punto de extensión, todavía sin usar a propósito (ver
// comentario de arriba).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function temporalWeightMultiplier(signalType: SignalType | null): number {
  return 1;
}

function recencyWeight(isoDate: string, now: number, signalType: SignalType | null): number {
  const ageDays = (now - new Date(isoDate).getTime()) / MS_PER_DAY;
  const base =
    ageDays <= SIGNAL_TRUST_THRESHOLDS.RECENT_DAYS
      ? RECENCY_WEIGHT.recent
      : ageDays <= SIGNAL_TRUST_THRESHOLDS.STALE_DAYS
        ? RECENCY_WEIGHT.aging
        : RECENCY_WEIGHT.stale;
  return base * temporalWeightMultiplier(signalType);
}

export type SignalVerificationStats = {
  confirmedCount: number;
  resolvedCount: number;
  incorrectCount: number;
  weightedConfirmed: number;
  weightedResolved: number;
  weightedIncorrect: number;
  lastConfirmedAt: string | null;
};

// Única fuente de verdad para "cuántas verificaciones tiene esta
// señalización": tanto evaluateSignalTrust como cualquier otro lugar que
// necesite los conteos reales (card, detalle) parten de acá. Cuenta
// USUARIOS DISTINTOS, nunca filas: si un usuario tiene más de una fila para
// la misma señalización (no debería pasar — useSignalVerifications escribe
// con upsert), se queda con la más reciente.
export function getSignalVerificationStats(
  signalId: string,
  verifications: SignalVerification[],
  now: number = Date.now(),
  signalType: SignalType | null = null
): SignalVerificationStats {
  const latestByUser = new Map<string, SignalVerification>();
  for (const verification of verifications) {
    if (verification.signalId !== signalId) continue;
    const existing = latestByUser.get(verification.userId);
    if (!existing || new Date(verification.updatedAt) > new Date(existing.updatedAt)) {
      latestByUser.set(verification.userId, verification);
    }
  }
  const relevant = [...latestByUser.values()];

  const confirmed = relevant.filter((v) => v.value === "confirmed");
  const resolved = relevant.filter((v) => v.value === "resolved");
  const incorrect = relevant.filter((v) => v.value === "incorrect");

  const weightOf = (v: SignalVerification) => recencyWeight(v.updatedAt, now, signalType);

  const lastConfirmedAt = confirmed.length
    ? confirmed.reduce(
        (latest, v) => (new Date(v.updatedAt) > new Date(latest) ? v.updatedAt : latest),
        confirmed[0].updatedAt
      )
    : null;

  return {
    confirmedCount: confirmed.length,
    resolvedCount: resolved.length,
    incorrectCount: incorrect.length,
    weightedConfirmed: confirmed.reduce((sum, v) => sum + weightOf(v), 0),
    weightedResolved: resolved.reduce((sum, v) => sum + weightOf(v), 0),
    weightedIncorrect: incorrect.reduce((sum, v) => sum + weightOf(v), 0),
    lastConfirmedAt,
  };
}

// Cantidad de verificaciones (confirmedCount/resolvedCount/incorrectCount)
// y estado/confianza son conceptos DISTINTOS (ver sección 1): una
// señalización con 1 confirmación sigue "Esperando confirmaciones", no
// "Confirmada". Estas etiquetas son deterministas a partir de los conteos
// reales, no de una fórmula numérica interna — así la card y el detalle,
// que llaman a la misma evaluateSignalTrust, nunca pueden mostrar textos
// contradictorios entre sí.
function confidenceLabelFor(status: ReportStatus, confirmedCount: number): string {
  if (status === "under_review") return "En revisión";
  if (status === "confirmed") return "Confianza alta";
  if (status === "new") {
    if (confirmedCount <= 0) return "Pendiente de validación";
    if (confirmedCount === 1) return "Confianza baja";
    return "Confianza media"; // confirmedCount === 2 (siempre <3 mientras status === "new")
  }
  // possibly_resolved / resolved / withdrawn: el badge de estado ya dice
  // todo lo relevante: agregar una "confianza" acá sería redundante (ver
  // sección 27) y esos estados no forman parte de la escala baja/media/alta.
  return "";
}

// Único lugar donde se decide el estado y la confianza de una
// señalización. Determinista: mismas entradas, mismo resultado — nada de
// aleatoriedad ni de estado oculto. ReportCard y SignalDetailSheet llaman
// EXACTAMENTE a esta función (vía useSignals) y nunca implementan su propio
// cálculo: por eso nunca pueden mostrar información contradictoria entre sí.
export function evaluateSignalTrust(
  report: Report,
  verifications: SignalVerification[],
  now: number = Date.now()
): SignalTrust {
  if (report.deletedAt || normalizeReportStatus(report.status) === "withdrawn") {
    return {
      status: "withdrawn",
      confidenceScore: 0,
      confidenceLabel: "Retirada",
      confirmedCount: 0,
      resolvedCount: 0,
      incorrectCount: 0,
      lastConfirmedAt: null,
    };
  }

  const stats = getSignalVerificationStats(report.id, verifications, now, report.type ?? null);
  const {
    confirmedCount,
    resolvedCount,
    incorrectCount,
    weightedConfirmed,
    weightedResolved,
    weightedIncorrect,
    lastConfirmedAt,
  } = stats;

  const T = SIGNAL_TRUST_THRESHOLDS;

  // "Contradicción significativa": no alcanza con el mínimo de usuarios,
  // la evidencia en contra (ponderada por recencia) también tiene que
  // representar una proporción relevante de la evidencia a favor. Así
  // "10 confirmed + 1 incorrect" nunca entra acá (no llega ni al mínimo de
  // usuarios), y "20 confirmed + 2 resolved" tampoco (no llega a la
  // proporción) — pero "3 confirmed + 2 resolved" sí, en ambos criterios.
  const hasSignificantContradiction =
    (resolvedCount >= T.REVIEW_CONTRADICTION_MIN &&
      weightedResolved >= weightedConfirmed * T.CONTRADICTION_RATIO) ||
    (incorrectCount >= T.REVIEW_CONTRADICTION_MIN &&
      weightedIncorrect >= weightedConfirmed * T.CONTRADICTION_RATIO);

  // Prioridad de estados (sección 33): WITHDRAWN (ya resuelto arriba) >
  // RESOLVED > POSSIBLY_RESOLVED > UNDER_REVIEW > CONFIRMED > NEW. Una
  // señalización nunca cumple dos estados a la vez: apenas una condición
  // matchea, las siguientes ni se evalúan.
  let status: ReportStatus;
  if (resolvedCount >= T.RESOLVED_MIN && weightedResolved > weightedConfirmed) {
    // Evidencia reciente de "ya no está" predomina claramente sobre
    // cualquier confirmación (que puede ser vieja/decaída, ver sección 12):
    // ya no alcanza con "posiblemente", hay evidencia fuerte de resolución.
    status = "resolved";
  } else if (resolvedCount >= T.POSSIBLY_RESOLVED_MIN && weightedResolved >= weightedConfirmed) {
    // Suficientes "ya no está" recientes y ya igualan o superan a las
    // confirmaciones: probablemente resuelta, pero sin evidencia tan fuerte
    // como para RESOLVED.
    status = "possibly_resolved";
  } else if (hasSignificantContradiction) {
    // Ni las confirmaciones ni la evidencia contraria predominan con
    // claridad: hay desacuerdo real de la comunidad, no que "ya no está".
    status = "under_review";
  } else if (confirmedCount >= T.MIN_CONFIRMATIONS) {
    status = "confirmed";
  } else {
    status = "new";
  }

  // confidenceScore: valor interno 0–100 (uso futuro para rutas), nunca se
  // muestra crudo en la UI (ver sección 19). La etiqueta que ve la persona
  // sale de confidenceLabelFor, no de este número.
  let confidenceScore = 50 + weightedConfirmed * 12 - weightedResolved * 15 - weightedIncorrect * 18;
  if (status === "resolved") confidenceScore = Math.min(confidenceScore, 20);
  confidenceScore = Math.max(0, Math.min(100, Math.round(confidenceScore)));

  return {
    status,
    confidenceScore,
    confidenceLabel: confidenceLabelFor(status, confirmedCount),
    confirmedCount,
    resolvedCount,
    incorrectCount,
    lastConfirmedAt,
  };
}

// Wrappers con el nombre pedido: internamente comparten el mismo cálculo
// (evaluateSignalTrust) para que estado y confianza nunca queden
// contradictorios entre sí.
export function calculateSignalStatus(
  report: Report,
  verifications: SignalVerification[],
  now?: number
): ReportStatus {
  return evaluateSignalTrust(report, verifications, now).status;
}

export function calculateSignalConfidence(
  report: Report,
  verifications: SignalVerification[],
  now?: number
): number {
  return evaluateSignalTrust(report, verifications, now).confidenceScore;
}
