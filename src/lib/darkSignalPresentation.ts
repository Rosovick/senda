import type { ReportStatus, SignalCategory } from "./reports";

// Mismo significado semántico que REPORT_STATUS_BADGE_CLASSNAMES/
// SIGNAL_CATEGORY_*_CLASSNAMES (lib/reports.ts) — amber=nueva,
// teal=confirmada/ayuda, orange=en revisión/obstáculo, slate=neutro — pero
// recalibrado para pintar sobre fondo NEGRO en vez de blanco. Solo cambia
// la presentación, nunca el estado/categoría real que representa cada uno.
// Único lugar donde vive esta paleta: la card de /reportes
// (components/reports/ReportCard.tsx) y el resumen compacto de la pantalla
// de comentarios (components/comments/SignalSummaryCard.tsx) importan de
// acá en vez de redefinirla cada uno.
export const STATUS_DARK_CLASSNAMES: Record<ReportStatus, string> = {
  new: "bg-amber-400/15 text-amber-300",
  confirmed: "bg-teal-400/20 text-teal-300",
  under_review: "bg-orange-400/15 text-orange-300",
  possibly_resolved: "bg-slate-400/15 text-slate-300",
  resolved: "bg-slate-400/15 text-slate-300",
  withdrawn: "bg-slate-400/15 text-slate-300",
};

export const CATEGORY_DARK_ICON_CLASSNAMES: Record<SignalCategory | "unknown", string> = {
  help: "bg-teal-400/15 text-teal-300",
  obstacle: "bg-orange-400/15 text-orange-300",
  unknown: "bg-slate-400/15 text-slate-300",
};

export const CATEGORY_DARK_BADGE_CLASSNAMES: Record<SignalCategory | "unknown", string> = {
  help: "bg-teal-400/15 text-teal-300",
  obstacle: "bg-orange-400/15 text-orange-300",
  unknown: "bg-slate-400/15 text-slate-300",
};
