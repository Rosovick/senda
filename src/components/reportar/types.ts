import type { SignalType } from "@/lib/reports";

export type LocationMethod = "current" | "search" | "map";
export type SeenOption = "now" | "today" | "custom";

// Borrador del wizard: vive solo mientras se completa /reportar. No es el
// modelo final (Report, en src/lib/reports.ts) — recién se convierte en un
// Report real al presionar "Enviar señalización".
export type ReportDraft = {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  locationMethod: LocationMethod | null;

  // Única condición señalizada (ver SIGNAL_TYPE_OPTIONS en lib/reports.ts).
  // La categoría (help/obstacle) se deriva de esta clave, no se guarda por
  // separado en el borrador.
  signalType: SignalType | null;

  seenOption: SeenOption | null;
  seenAt: string | null; // ISO

  photo: string | null;
  description: string;
};

export const EMPTY_REPORT_DRAFT: ReportDraft = {
  latitude: null,
  longitude: null,
  address: null,
  locationMethod: null,

  signalType: null,

  seenOption: null,
  seenAt: null,

  photo: null,
  description: "",
};

export function hasValidLocation(draft: ReportDraft): boolean {
  return draft.latitude !== null && draft.longitude !== null;
}

export function hasValidDetails(draft: ReportDraft): boolean {
  return draft.signalType !== null && draft.seenAt !== null;
}
