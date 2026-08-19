import type { SignalWithTrust } from "@/hooks/useSignals";
import { ClockIcon, ImageOffIcon, MapPinIcon } from "@/components/icons";
import { SIGNAL_TYPE_ICONS, UNKNOWN_SIGNAL_TYPE_ICON } from "@/components/signalTypeIcons";
import {
  CATEGORY_DARK_BADGE_CLASSNAMES,
  CATEGORY_DARK_ICON_CLASSNAMES,
  STATUS_DARK_CLASSNAMES,
} from "@/lib/darkSignalPresentation";
import {
  formatObservedAt,
  REPORT_STATUS_LABELS,
  resolveSignal,
  SIGNAL_CATEGORY_LABELS,
} from "@/lib/reports";

type SignalSummaryCardProps = {
  report: SignalWithTrust;
};

// Versión compacta, no interactiva, de la card negra de /reportes
// (ReportCard.tsx) — "la publicación original" sobre la que se comenta.
// Mismos datos reales (resolveSignal, SIGNAL_TYPE_ICONS, REPORT_STATUS_*),
// misma paleta oscura compartida (lib/darkSignalPresentation.ts): nunca
// una segunda implementación de cómo se ve una señalización.
export default function SignalSummaryCard({ report }: SignalSummaryCardProps) {
  const signal = resolveSignal(report.type);
  const SignalIcon = signal.type ? SIGNAL_TYPE_ICONS[signal.type] : UNKNOWN_SIGNAL_TYPE_ICON;
  const badgeCategory = signal.category ?? "unknown";
  const observedIso = report.seenAt ?? report.createdAt;

  return (
    <section className="overflow-hidden rounded-4xl bg-slate-950 p-5 shadow-card sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${CATEGORY_DARK_ICON_CLASSNAMES[badgeCategory]}`}
          >
            <SignalIcon className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h2 className="text-h3 text-white">{signal.label}</h2>
            {signal.category && (
              <p
                className={`mt-1.5 inline-flex items-center rounded-full px-2.5 py-1 text-caption font-semibold ${CATEGORY_DARK_BADGE_CLASSNAMES[badgeCategory]}`}
              >
                {SIGNAL_CATEGORY_LABELS[signal.category]}
              </p>
            )}
          </div>
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-center text-caption font-semibold ${STATUS_DARK_CLASSNAMES[report.status]}`}
        >
          {REPORT_STATUS_LABELS[report.status]}
        </span>
      </div>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2 text-sm text-slate-300">
          <div className="flex items-start gap-2">
            <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <span className="min-w-0">{report.address ?? "Ubicación registrada"}</span>
          </div>
          <div className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4 shrink-0 text-slate-500" />
            <span>{formatObservedAt(observedIso)}</span>
          </div>
        </div>

        {report.photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- dataURL local, no una URL remota optimizable todavía.
          <img
            src={report.photo}
            alt={`Imagen adjunta de la señalización: ${signal.label}`}
            className="h-20 w-24 shrink-0 rounded-2xl object-cover sm:h-24 sm:w-28"
          />
        ) : (
          <div className="flex h-20 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl bg-white/5 px-2 text-center sm:h-24 sm:w-28">
            <ImageOffIcon className="h-5 w-5 text-slate-500" />
            <span className="text-[10px] font-medium leading-tight text-slate-500">
              Sin foto adjunta
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
