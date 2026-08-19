import { AlertTriangleIcon, CheckCircleIcon, CircleSlashIcon, ClockIcon, TrashIcon } from "@/components/icons";

// Estados de una señalización. Nunca se escriben "a mano" desde un
// componente: siempre los calcula evaluateSignalTrust() (ver
// src/lib/signalTrust.ts) a partir de las validaciones comunitarias, con la
// única excepción de "withdrawn" (el creador la retira, ver
// useReports().softDeleteReport).
//
// new              → esperando confirmaciones, sin evidencia todavía.
// confirmed        → varias personas independientes indicaron que sigue ahí.
// under_review     → evidencia contradictoria significativa (denuncias de
//                    información incorrecta comparables a las confirmaciones).
// possibly_resolved→ varias verificaciones recientes de "ya no está".
// resolved         → evidencia fuerte y reciente de que ya no existe.
// withdrawn        → retirada por quien la creó (soft delete).
export type ReportStatus =
  | "new"
  | "confirmed"
  | "under_review"
  | "possibly_resolved"
  | "resolved"
  | "withdrawn";

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  new: "Esperando confirmaciones",
  confirmed: "Confirmada por la comunidad",
  under_review: "En revisión",
  possibly_resolved: "Posiblemente resuelta",
  resolved: "Resuelta",
  withdrawn: "Retirada",
};

// Color del badge de ESTADO (confianza/validación comunitaria). Es un
// sistema de color totalmente separado del color del ícono por categoría
// (ver SIGNAL_CATEGORY_*_CLASSNAMES más abajo): una señalización puede ser
// un obstáculo (ícono naranja) y estar Confirmada (badge verde) al mismo
// tiempo. Nunca se deriva el color del ícono a partir de esto, ni viceversa.
export const REPORT_STATUS_BADGE_CLASSNAMES: Record<ReportStatus, string> = {
  new: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/10",
  confirmed: "bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-600/10",
  under_review: "bg-orange-100 text-orange-800 ring-1 ring-inset ring-orange-600/10",
  possibly_resolved: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-900/5",
  resolved: "bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-900/5",
  withdrawn: "bg-slate-700 text-slate-50 ring-1 ring-inset ring-white/10",
};

// Ícono del badge de ESTADO: el estado nunca debe distinguirse solo por
// color (accesibilidad) — cada badge de estado también muestra este ícono
// junto al texto.
export const REPORT_STATUS_ICONS: Record<ReportStatus, typeof ClockIcon> = {
  new: ClockIcon,
  confirmed: CheckCircleIcon,
  under_review: AlertTriangleIcon,
  possibly_resolved: CircleSlashIcon,
  resolved: CircleSlashIcon,
  withdrawn: TrashIcon,
};

const REPORT_STATUS_SET = new Set<ReportStatus>(Object.keys(REPORT_STATUS_LABELS) as ReportStatus[]);

export function isReportStatus(value: unknown): value is ReportStatus {
  return typeof value === "string" && REPORT_STATUS_SET.has(value as ReportStatus);
}

// Datos de antes de este modelo guardaron "reported" (nombre viejo de
// "new") o pueden tener un status ausente/corrupto: nunca se confía en el
// valor crudo, todo pasa por acá. Ver normalizeReport más abajo.
export function normalizeReportStatus(value: unknown): ReportStatus {
  if (value === "reported") return "new";
  return isReportStatus(value) ? value : "new";
}

// Una señalización representa UNA condición concreta encontrada en la
// ciudad: o bien una ayuda de accesibilidad (algo que facilita un
// recorrido) o un obstáculo (algo que lo dificulta). Nunca ambas a la vez.
export type SignalCategory = "help" | "obstacle";

export const SIGNAL_CATEGORY_LABELS: Record<SignalCategory, string> = {
  help: "Ayuda de accesibilidad",
  obstacle: "Obstáculo de accesibilidad",
};

// Color del ÍCONO/badge de CATEGORÍA (qué tipo de señalización es). "unknown"
// es el tratamiento neutro para señalizaciones con un `type` inválido o
// anterior a este modelo (ver resolveSignal): nunca se les asigna verde ni
// naranja porque no sabemos a cuál corresponden.
export const SIGNAL_CATEGORY_ICON_CLASSNAMES = {
  help: "bg-teal-50 text-teal-600 shadow-control",
  obstacle: "bg-orange-50 text-orange-500 shadow-control",
  unknown: "bg-slate-100 text-slate-500 shadow-control",
} as const;

export const SIGNAL_CATEGORY_BADGE_CLASSNAMES = {
  help: "bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-600/10",
  obstacle: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/10",
  unknown: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-900/5",
} as const;

// Mismas claves que las preferencias de Perfil (RouteNeedPreferences /
// RouteAvoidPreferences, ver src/hooks/useProfilePreferences.ts): una
// señalización describe, desde el punto de vista de lo que existe en la
// ciudad, la misma condición que el Perfil describe desde el punto de vista
// de lo que la persona necesita o quiere evitar. Compartir el nombre de
// clave permite cruzar Perfil ↔ Señalizaciones ↔ Mapa más adelante sin
// depender del texto visible.
export type SignalType =
  | "rampsRequired"
  | "prioritizeSafeCrossings"
  | "trafficLightCrossings"
  | "audibleTrafficLights"
  | "avoidBadSidewalks"
  | "avoidStairs"
  | "avoidNarrowPaths"
  | "avoidSteepSlopes"
  | "potholes"
  | "obstructedSidewalks"
  | "constructionZones"
  | "crossingsWithoutTrafficLights";

type SignalTypeOption = { key: SignalType; category: SignalCategory; label: string };

// Único listado ordenado: fuente de verdad tanto para las opciones de
// "¿Qué querés señalizar?" (Detalles) como para las etiquetas mostradas en
// Confirmar y en las cards del panel de Señalizaciones.
const SIGNAL_TYPE_OPTIONS_LIST: SignalTypeOption[] = [
  { key: "rampsRequired", category: "help", label: "Rampa o acceso sin escalones" },
  { key: "prioritizeSafeCrossings", category: "help", label: "Cruce seguro" },
  { key: "trafficLightCrossings", category: "help", label: "Cruce con semáforo" },
  { key: "audibleTrafficLights", category: "help", label: "Semáforo con señal sonora" },
  { key: "avoidBadSidewalks", category: "obstacle", label: "Vereda en mal estado" },
  { key: "avoidStairs", category: "obstacle", label: "Escalera" },
  { key: "avoidNarrowPaths", category: "obstacle", label: "Paso o vereda angosta" },
  { key: "avoidSteepSlopes", category: "obstacle", label: "Pendiente pronunciada" },
  { key: "potholes", category: "obstacle", label: "Bache o pozo" },
  { key: "obstructedSidewalks", category: "obstacle", label: "Vereda obstaculizada" },
  { key: "constructionZones", category: "obstacle", label: "Obra en construcción" },
  { key: "crossingsWithoutTrafficLights", category: "obstacle", label: "Cruce sin semáforo" },
];

export const SIGNAL_TYPE_OPTIONS = SIGNAL_TYPE_OPTIONS_LIST;

export function signalTypeOptionsByCategory(category: SignalCategory): SignalTypeOption[] {
  return SIGNAL_TYPE_OPTIONS_LIST.filter((option) => option.category === category);
}

export const SIGNAL_TYPE_LABELS: Record<SignalType, string> = Object.fromEntries(
  SIGNAL_TYPE_OPTIONS_LIST.map(({ key, label }) => [key, label])
) as Record<SignalType, string>;

export const SIGNAL_TYPE_CATEGORY: Record<SignalType, SignalCategory> = Object.fromEntries(
  SIGNAL_TYPE_OPTIONS_LIST.map(({ key, category }) => [key, category])
) as Record<SignalType, SignalCategory>;

// Cuánto pesa CADA tipo de señalización sobre el costo de una ruta,
// relativo a la base (1 = peso "normal"). No todas las ayudas ni todos los
// obstáculos son igual de determinantes: una rampa debería poder inclinar
// la elección de ruta bastante más que un cruce con semáforo, y una
// escalera debería pesar mucho más que un bache chico (que penaliza, pero
// no debería casi nunca justificar por sí solo un desvío grande). Esto es
// intencionalmente estático por TIPO (no por perfil): el perfil ya decide
// SI un tipo participa (needs/avoids en useProfilePreferences, ver
// isSignalRelevantToProfile en lib/routeSignals.ts); esto decide CUÁNTO
// pesa una vez que participa. No inventa perfiles nuevos ni un segundo
// sistema de confianza — se combina multiplicando con confidenceWeight en
// getSignalRouteEffects (lib/routeSignals.ts).
export const SIGNAL_TYPE_SEVERITY: Record<SignalType, number> = {
  // Ayudas (bonus): más alto = SENDA se inclina más fuerte hacia esa calle.
  rampsRequired: 2.2,
  audibleTrafficLights: 1.6,
  prioritizeSafeCrossings: 1.3,
  trafficLightCrossings: 1.1,
  // Obstáculos (penalización): más alto = SENDA evita con más fuerza.
  avoidStairs: 3,
  avoidSteepSlopes: 1.8,
  crossingsWithoutTrafficLights: 1.6,
  constructionZones: 1.5,
  avoidNarrowPaths: 1.4,
  obstructedSidewalks: 1.3,
  avoidBadSidewalks: 1.2,
  potholes: 0.8,
};

const SIGNAL_TYPE_SET = new Set<SignalType>(SIGNAL_TYPE_OPTIONS_LIST.map((option) => option.key));

// Guarda de runtime: `Report.type` es `SignalType` a nivel de TypeScript,
// pero un Report real puede venir de localStorage (JSON.parse, sin validar)
// y por lo tanto de una versión anterior del modelo (que usaba
// `barrierType`/`affectedNeeds` en vez de `category`/`type`) o de un dato
// corrupto. Cualquier lugar que indexe SIGNAL_TYPE_ICONS/SIGNAL_TYPE_LABELS
// con un valor que pueda venir de afuera debe validar con esto antes.
export function isSignalType(value: unknown): value is SignalType {
  return typeof value === "string" && SIGNAL_TYPE_SET.has(value as SignalType);
}

// Texto neutro para una señalización cuyo `type` no es válido (dato
// anterior a este modelo, o corrupto). No inventa una condición específica
// que el dato no tiene.
export const UNKNOWN_SIGNAL_TYPE_LABEL = "Señalización";

export type ResolvedSignal =
  | { type: SignalType; category: SignalCategory; label: string }
  | { type: null; category: null; label: string };

// Único punto de entrada para pasar de "lo que sea que tenga report.type"
// a datos seguros para mostrar (ícono/label/categoría). Nunca lanza ni
// devuelve un valor indefinido: si el type no es válido, devuelve el
// resultado "desconocido" en vez de fallar.
export function resolveSignal(rawType: unknown): ResolvedSignal {
  if (isSignalType(rawType)) {
    return {
      type: rawType,
      category: SIGNAL_TYPE_CATEGORY[rawType],
      label: SIGNAL_TYPE_LABELS[rawType],
    };
  }
  return { type: null, category: null, label: UNKNOWN_SIGNAL_TYPE_LABEL };
}

export type Report = {
  id: string;
  // = "createdBy": quién creó la señalización. Reutiliza el mismo campo que
  // ya existía (antes siempre null, porque no había identidad) en vez de
  // agregar uno nuevo — ver useLocalIdentity para de dónde sale el valor
  // hoy, sin un sistema de autenticación real todavía.
  userId: string | null;
  category: SignalCategory;
  type: SignalType;
  latitude: number;
  longitude: number;
  address: string | null;
  seenAt: string | null; // = "observedAt": cuándo la persona vio la condición
  description: string;
  photo: string | null; // dataURL local, igual que el avatar del perfil
  createdAt: string; // ISO
  updatedAt: string; // ISO: última modificación (edición, borrado, etc.)
  deletedAt: string | null; // ISO: soft delete ("Eliminar señalización")
  // Valor de referencia/histórico. La UI nunca lo usa directamente para
  // decidir qué mostrar: siempre recalcula con evaluateSignalTrust() a
  // partir de las validaciones comunitarias (ver src/lib/signalTrust.ts).
  status: ReportStatus;
  // Campos legados de un modelo más simple (antes de que existieran
  // validaciones por usuario). Ya no alimentan el cálculo de confianza; se
  // conservan solo para no perder datos de señalizaciones creadas antes de
  // este cambio.
  confirmations: number;
  resolvedConfirmations: number;
};

// Único punto de entrada para leer un Report que puede venir de
// localStorage (dato de antes de este modelo, o corrupto): garantiza que
// updatedAt/deletedAt/status/confirmations siempre tengan un valor seguro,
// sin inventar información que el registro no tiene.
export function normalizeReport(raw: Report): Report {
  return {
    ...raw,
    updatedAt: raw.updatedAt ?? raw.createdAt,
    deletedAt: raw.deletedAt ?? null,
    status: normalizeReportStatus(raw.status),
    confirmations: typeof raw.confirmations === "number" ? raw.confirmations : 0,
    resolvedConfirmations:
      typeof raw.resolvedConfirmations === "number" ? raw.resolvedConfirmations : 0,
  };
}

export type ReportFilterKey = "nearby" | "recent" | "confirmed" | "mine";

export const REPORT_FILTERS: { key: ReportFilterKey; label: string }[] = [
  { key: "nearby", label: "Cerca de mí" },
  { key: "recent", label: "Recientes" },
  { key: "confirmed", label: "Confirmadas" },
  { key: "mine", label: "Mis reportes" },
];

// Genérico para poder operar tanto sobre Report[] "crudo" como sobre las
// señalizaciones enriquecidas con confianza/validaciones (SignalWithTrust,
// ver src/hooks/useSignals.ts), que además tienen status/createdAt/userId
// pero con status ya recalculado.
export function filterReports<T extends Pick<Report, "status" | "createdAt" | "userId">>(
  reports: T[],
  filter: ReportFilterKey,
  currentUserId: string | null
): T[] {
  switch (filter) {
    case "recent":
      return [...reports].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    case "confirmed":
      return reports.filter((report) => report.status === "confirmed");
    case "mine":
      return reports.filter((report) => report.userId === currentUserId);
    case "nearby":
    default:
      return reports;
  }
}

export function formatReportAge(isoDate: string): string {
  const diffMinutes = Math.round((Date.now() - new Date(isoDate).getTime()) / 60000);
  if (diffMinutes < 1) return "Hace un momento";
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;
  const diffDays = Math.round(diffHours / 24);
  return `Hace ${diffDays} d`;
}

export function formatDateTime(isoDate: string): string {
  return new Date(isoDate).toLocaleString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Formato compacto para "Visto": "Hoy · 15:30" si fue hoy, o
// "15 ago 2026 · 18:20" en otro caso. Usado en la card y en el detalle para
// que ambos muestren exactamente el mismo dato de la misma forma.
export function formatObservedAt(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const time = date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (isToday) return `Hoy · ${time}`;

  const datePart = date.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${datePart} · ${time}`;
}

// Línea breve de información comunitaria concreta, con los conteos REALES
// (nunca asumidos a partir del status — ver la corrección de esta misma
// lógica en la tarea de confianza/estado). Único lugar que la calcula:
// ReportCard, el popup del mapa de /ruta y cualquier otro lugar que
// necesite el mismo texto lo importan de acá en vez de reimplementarlo.
// Tipado estructural a propósito (no importa SignalWithTrust): reports.ts
// no depende de hooks de React, así se evita un import circular.
export function formatSignalCommunitySummary(signal: {
  status: ReportStatus;
  confirmedCount: number;
  resolvedCount: number;
  lastConfirmedAt: string | null;
}): string {
  switch (signal.status) {
    case "new":
    case "confirmed": {
      if (signal.confirmedCount === 0) return "Todavía sin confirmaciones";
      const count =
        signal.confirmedCount === 1 ? "1 confirmación" : `${signal.confirmedCount} confirmaciones`;
      return signal.lastConfirmedAt
        ? `${count} · ${formatReportAge(signal.lastConfirmedAt).toLowerCase()}`
        : count;
    }
    case "possibly_resolved":
    case "resolved":
      return signal.resolvedCount === 1
        ? "1 persona dijo que ya no está"
        : `${signal.resolvedCount} personas dijeron que ya no está`;
    case "under_review":
      return "Información cuestionada por la comunidad";
    case "withdrawn":
      return "Retirada por quien la creó";
  }
}
