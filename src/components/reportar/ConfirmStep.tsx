"use client";

import {
  CameraIcon,
  ClockIcon,
  InfoIcon,
  MapPinIcon,
  SendIcon,
  ShieldIcon,
} from "@/components/icons";
import { SIGNAL_TYPE_ICONS } from "@/components/signalTypeIcons";
import {
  formatDateTime,
  SIGNAL_CATEGORY_LABELS,
  SIGNAL_TYPE_CATEGORY,
  SIGNAL_TYPE_LABELS,
} from "@/lib/reports";
import type { ReportDraft } from "./types";

type ConfirmStepProps = {
  draft: ReportDraft;
  onEditStep: (step: 1 | 2) => void;
  onSubmit: () => void;
};

function SummaryRow({
  icon,
  label,
  onEdit,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-4 last:border-b-0">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-600 shadow-control">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-label text-slate-400">{label}</p>
          <div className="mt-1 text-sm text-slate-800">{children}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 rounded-full px-2 py-1 text-sm font-semibold text-teal-700 transition hover:text-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
      >
        Editar
      </button>
    </div>
  );
}

export default function ConfirmStep({ draft, onEditStep, onSubmit }: ConfirmStepProps) {
  const SignalIcon = draft.signalType ? SIGNAL_TYPE_ICONS[draft.signalType] : ShieldIcon;

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-card sm:p-7">
        <h2 className="text-h2 text-slate-950">Revisá tu señalización</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Confirmá que la información sea correcta antes de enviarla.
        </p>

        <div className="mt-2">
          <SummaryRow
            icon={<MapPinIcon className="h-4 w-4" />}
            label="Ubicación"
            onEdit={() => onEditStep(1)}
          >
            <p>{draft.address ?? "Ubicación seleccionada"}</p>
            {draft.latitude !== null && draft.longitude !== null && (
              <p className="mt-0.5 text-xs text-slate-500">
                Lat {draft.latitude.toFixed(4)}, Long {draft.longitude.toFixed(4)}
              </p>
            )}
          </SummaryRow>

          <SummaryRow
            icon={<SignalIcon className="h-4 w-4" />}
            label="Qué señalizaste"
            onEdit={() => onEditStep(2)}
          >
            {draft.signalType ? (
              <>
                <p className="text-label text-slate-400">
                  {SIGNAL_CATEGORY_LABELS[SIGNAL_TYPE_CATEGORY[draft.signalType]]}
                </p>
                <p>{SIGNAL_TYPE_LABELS[draft.signalType]}</p>
              </>
            ) : (
              <p>—</p>
            )}
          </SummaryRow>

          <SummaryRow
            icon={<ClockIcon className="h-4 w-4" />}
            label="Visto"
            onEdit={() => onEditStep(2)}
          >
            <p>
              {draft.seenOption === "now"
                ? "Ahora"
                : draft.seenOption === "today"
                  ? "Hoy"
                  : "Fecha elegida"}
              {draft.seenAt ? ` · ${formatDateTime(draft.seenAt)}` : ""}
            </p>
          </SummaryRow>

          {draft.photo && (
            <SummaryRow
              icon={<CameraIcon className="h-4 w-4" />}
              label="Foto"
              onEdit={() => onEditStep(2)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- dataURL local (recortada/comprimida), no una URL remota optimizable todavía. */}
              <img src={draft.photo} alt="" className="h-16 w-16 rounded-2xl object-cover" />
            </SummaryRow>
          )}

          {draft.description && (
            <SummaryRow
              icon={<InfoIcon className="h-4 w-4" />}
              label="Descripción"
              onEdit={() => onEditStep(2)}
            >
              <p className="leading-relaxed">{draft.description}</p>
            </SummaryRow>
          )}
        </div>
      </section>

      <button
        type="button"
        onClick={onSubmit}
        className="flex items-center justify-center gap-2 rounded-full bg-teal-500 px-6 py-4 text-base font-semibold text-slate-950 shadow-control transition hover:bg-teal-400 hover:shadow-card active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
      >
        <SendIcon className="h-5 w-5" />
        Enviar señalización
      </button>
      <p className="-mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
        <ShieldIcon className="h-3.5 w-3.5 text-slate-300" />
        Tu señalización será visible para ayudar a toda la comunidad.
      </p>
    </div>
  );
}
