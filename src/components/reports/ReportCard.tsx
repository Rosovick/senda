import Link from "next/link";
import type { SignalWithTrust } from "@/hooks/useSignals";
import {
  ChevronRightIcon,
  ClockIcon,
  ImageOffIcon,
  MapPinIcon,
  MessageCircleIcon,
  UsersIcon,
} from "@/components/icons";
import { SIGNAL_TYPE_ICONS, UNKNOWN_SIGNAL_TYPE_ICON } from "@/components/signalTypeIcons";
import { useComments } from "@/hooks/useComments";
import { countActiveComments } from "@/lib/comments";
import {
  CATEGORY_DARK_BADGE_CLASSNAMES,
  CATEGORY_DARK_ICON_CLASSNAMES,
  STATUS_DARK_CLASSNAMES,
} from "@/lib/darkSignalPresentation";
import {
  formatObservedAt,
  formatReportAge,
  formatSignalCommunitySummary,
  REPORT_STATUS_LABELS,
  resolveSignal,
  SIGNAL_CATEGORY_LABELS,
} from "@/lib/reports";

type ReportCardProps = {
  report: SignalWithTrust;
  isSelected?: boolean;
  onSelect?: () => void;
};

// Card negra grande (referencia: senalizaciones-comunidad). Todo el
// contenido sigue siendo el mismo dato real que ya mostraba la versión
// anterior (SIGNAL_TYPE_ICONS, resolveSignal, formatSignalCommunitySummary,
// etc.) — solo cambia la presentación visual, ninguna lógica de datos.
// El detalle completo (confirmar/editar/eliminar) sigue viviendo en
// SignalDetailSheet, que se abre al tocar la card. "Ver comentarios" ahora
// navega a /reportes/[id]/comentarios (pantalla nueva, ver
// components/comments/) en vez de abrir ese mismo panel.
export default function ReportCard({ report, isSelected = false, onSelect }: ReportCardProps) {
  // report.type puede venir de localStorage (dato de una versión anterior
  // del modelo, sin category/type, o corrupto): resolveSignal es la única
  // vía para leerlo, nunca se indexa SIGNAL_TYPE_* directamente acá.
  const signal = resolveSignal(report.type);
  const SignalIcon = signal.type ? SIGNAL_TYPE_ICONS[signal.type] : UNKNOWN_SIGNAL_TYPE_ICON;
  const badgeCategory = signal.category ?? "unknown";
  const observedIso = report.seenAt ?? report.createdAt;

  const { comments } = useComments();
  const commentCount = countActiveComments(comments, report.id);

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect?.();
  }

  // stopPropagation: la card entera ya dispara onSelect (ver más abajo) —
  // sin esto, tocar el link también burbujearía hasta el onClick de la
  // card y abriría el detalle a la vez que se navega.
  function handleCommentsClick(event: React.MouseEvent) {
    event.stopPropagation();
  }

  return (
    <article
      id={`report-${report.id}`}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={`cursor-pointer overflow-hidden rounded-4xl bg-slate-950 p-5 shadow-card transition hover:shadow-hero focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400 sm:p-6 ${
        isSelected ? "ring-2 ring-lime-400" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${CATEGORY_DARK_ICON_CLASSNAMES[badgeCategory]}`}
          >
            <SignalIcon className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h3 className="text-h3 text-white">{signal.label}</h3>
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

      <div className="mt-4 flex items-center gap-2 text-sm text-slate-300">
        <UsersIcon className="h-4 w-4 shrink-0 text-slate-500" />
        <span className="min-w-0">{formatSignalCommunitySummary(report)}</span>
      </div>

      <Link
        href={`/reportes/${report.id}/comentarios`}
        onClick={handleCommentsClick}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400"
      >
        <MessageCircleIcon className="h-4 w-4" />
        {commentCount > 0 ? `Ver comentarios (${commentCount})` : "Ver comentarios"}
      </Link>

      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-slate-400">
        <span>{formatReportAge(report.createdAt)}</span>
        <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-500" />
      </div>
    </article>
  );
}
