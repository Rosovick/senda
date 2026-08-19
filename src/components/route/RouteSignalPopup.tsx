import { ChevronRightIcon } from "@/components/icons";
import { SIGNAL_TYPE_ICONS, UNKNOWN_SIGNAL_TYPE_ICON } from "@/components/signalTypeIcons";
import type { SignalWithTrust } from "@/hooks/useSignals";
import {
  formatSignalCommunitySummary,
  REPORT_STATUS_BADGE_CLASSNAMES,
  REPORT_STATUS_ICONS,
  REPORT_STATUS_LABELS,
  resolveSignal,
  SIGNAL_CATEGORY_ICON_CLASSNAMES,
  SIGNAL_CATEGORY_LABELS,
} from "@/lib/reports";

type RouteSignalPopupProps = {
  signal: SignalWithTrust;
  onViewDetail: () => void;
};

// Popup pequeño y flotante al tocar un marcador (secciones 18-20): NO abre
// una pantalla completa. "Ver detalle" abre la MISMA ficha existente
// (SignalDetailSheet, ya usada en /reportes) — nunca un segundo detalle.
export default function RouteSignalPopup({ signal, onViewDetail }: RouteSignalPopupProps) {
  const resolved = resolveSignal(signal.type);
  const Icon = resolved.type ? SIGNAL_TYPE_ICONS[resolved.type] : UNKNOWN_SIGNAL_TYPE_ICON;
  const badgeCategory = resolved.category ?? "unknown";
  const StatusIcon = REPORT_STATUS_ICONS[signal.status];

  return (
    <div className="min-w-[200px] max-w-[240px]">
      <div className="flex items-start gap-2.5">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${SIGNAL_CATEGORY_ICON_CLASSNAMES[badgeCategory]}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-h3 leading-tight text-slate-950">{resolved.label}</p>
          {resolved.category && (
            <p className="text-caption text-slate-500">{SIGNAL_CATEGORY_LABELS[resolved.category]}</p>
          )}
        </div>
      </div>

      <span
        className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-semibold ${REPORT_STATUS_BADGE_CLASSNAMES[signal.status]}`}
      >
        <StatusIcon className="h-3 w-3 shrink-0" />
        {REPORT_STATUS_LABELS[signal.status]}
      </span>

      {signal.address && <p className="mt-2 truncate text-caption text-slate-600">{signal.address}</p>}
      <p className="mt-1 text-caption text-slate-500">{formatSignalCommunitySummary(signal)}</p>

      <button
        type="button"
        onClick={onViewDetail}
        className="mt-3 flex w-full items-center justify-center gap-1 rounded-full bg-teal-500 px-3 py-2 text-caption font-semibold text-slate-950 transition hover:bg-teal-400"
      >
        Ver detalle
        <ChevronRightIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
