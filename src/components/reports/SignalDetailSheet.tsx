"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangleIcon,
  CameraIcon,
  CircleSlashIcon,
  CheckCircleIcon,
  ClockIcon,
  CloseIcon,
  MapPinIcon,
  PencilIcon,
  TrashIcon,
} from "@/components/icons";
import { SIGNAL_TYPE_ICONS, UNKNOWN_SIGNAL_TYPE_ICON } from "@/components/signalTypeIcons";
import type { SignalWithTrust } from "@/hooks/useSignals";
import {
  formatObservedAt,
  formatReportAge,
  REPORT_STATUS_BADGE_CLASSNAMES,
  REPORT_STATUS_ICONS,
  REPORT_STATUS_LABELS,
  resolveSignal,
  SIGNAL_CATEGORY_BADGE_CLASSNAMES,
  SIGNAL_CATEGORY_ICON_CLASSNAMES,
  SIGNAL_CATEGORY_LABELS,
} from "@/lib/reports";
import {
  INCORRECT_REASON_OPTIONS,
  VERIFICATION_VALUE_LABELS,
  type IncorrectReason,
  type VerificationValue,
} from "@/lib/signalVerifications";

type SignalDetailSheetProps = {
  signal: SignalWithTrust | null;
  // Puede ser null muy brevemente, mientras useLocalIdentity todavía no
  // generó el id local (ver hooks/useLocalIdentity.ts): mientras tanto no
  // se muestran acciones de validación que fallarían en silencio.
  currentUserId: string | null;
  onClose: () => void;
  onVerify: (
    signalId: string,
    value: VerificationValue,
    reason?: IncorrectReason | null,
    reasonNote?: string | null
  ) => void;
  onDelete: (signalId: string) => void;
};

// Contenedor: solo decide si hay algo que mostrar y le pasa una `key` con
// el id de la señalización al panel real. Eso hace que el estado interno
// (qué vista se está mostrando, el motivo elegido, etc.) arranque de cero
// cada vez que se abre una señalización distinta, sin useEffect manual.
export default function SignalDetailSheet({
  signal,
  currentUserId,
  onClose,
  onVerify,
  onDelete,
}: SignalDetailSheetProps) {
  if (!signal) return null;
  return (
    <SignalDetailPanel
      key={signal.id}
      signal={signal}
      currentUserId={currentUserId}
      onClose={onClose}
      onVerify={onVerify}
      onDelete={onDelete}
    />
  );
}

type PanelView = "detail" | "confirm-delete" | "incorrect-reason";

function SignalDetailPanel({
  signal,
  currentUserId,
  onClose,
  onVerify,
  onDelete,
}: {
  signal: SignalWithTrust;
  currentUserId: string | null;
  onClose: () => void;
  onVerify: SignalDetailSheetProps["onVerify"];
  onDelete: SignalDetailSheetProps["onDelete"];
}) {
  const [view, setView] = useState<PanelView>("detail");
  const [incorrectReason, setIncorrectReason] = useState<IncorrectReason | null>(
    signal.myVerification?.reason ?? null
  );
  const [incorrectNote, setIncorrectNote] = useState(signal.myVerification?.reasonNote ?? "");
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const resolved = resolveSignal(signal.type);
  const SignalIcon = resolved.type ? SIGNAL_TYPE_ICONS[resolved.type] : UNKNOWN_SIGNAL_TYPE_ICON;
  const badgeCategory = resolved.category ?? "unknown";

  function handleVerifyIncorrectSave() {
    onVerify(signal.id, "incorrect", incorrectReason, incorrectReason === "other" ? incorrectNote.trim() || null : null);
    setView("detail");
  }

  function handleConfirmDelete() {
    onDelete(signal.id);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="signal-detail-title"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-5xl bg-white shadow-hero sm:max-h-[85vh] sm:max-w-lg sm:rounded-5xl"
      >
        <div className="flex justify-center pt-3 sm:hidden">
          <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-slate-200" />
        </div>
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 pb-4 pt-4 sm:px-6 sm:pt-5">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${SIGNAL_CATEGORY_ICON_CLASSNAMES[badgeCategory]}`}
            >
              <SignalIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 id="signal-detail-title" className="truncate text-h2 text-slate-950">
                {resolved.label}
              </h2>
              {resolved.category && (
                <span
                  className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${SIGNAL_CATEGORY_BADGE_CLASSNAMES[badgeCategory]}`}
                >
                  {SIGNAL_CATEGORY_LABELS[resolved.category]}
                </span>
              )}
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {view === "detail" && (
            <DetailView
              signal={signal}
              currentUserId={currentUserId}
              onDeleteRequest={() => setView("confirm-delete")}
              onIncorrectRequest={() => setView("incorrect-reason")}
              onVerify={onVerify}
            />
          )}

          {view === "confirm-delete" && (
            <ConfirmDeleteView onCancel={() => setView("detail")} onConfirm={handleConfirmDelete} />
          )}

          {view === "incorrect-reason" && (
            <IncorrectReasonView
              reason={incorrectReason}
              note={incorrectNote}
              onChangeReason={setIncorrectReason}
              onChangeNote={setIncorrectNote}
              onCancel={() => setView("detail")}
              onSave={handleVerifyIncorrectSave}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function DetailView({
  signal,
  currentUserId,
  onDeleteRequest,
  onIncorrectRequest,
  onVerify,
}: {
  signal: SignalWithTrust;
  currentUserId: string | null;
  onDeleteRequest: () => void;
  onIncorrectRequest: () => void;
  onVerify: SignalDetailSheetProps["onVerify"];
}) {
  const observedIso = signal.seenAt ?? signal.createdAt;
  const signalLabel = resolveSignal(signal.type).label;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-label text-slate-400">Ubicación</p>
        <div className="mt-1 flex items-start gap-2">
          <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <p className="text-sm font-medium text-slate-800">
            {signal.address ?? "Ubicación registrada"}
          </p>
        </div>
      </div>

      <div>
        <p className="text-label text-slate-400">Visto</p>
        <div className="mt-1 flex items-center gap-2">
          <ClockIcon className="h-4 w-4 shrink-0 text-slate-400" />
          <p className="text-sm font-medium text-slate-800">{formatObservedAt(observedIso)}</p>
        </div>
      </div>

      <div>
        <p className="text-label text-slate-400">Descripción</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-700">
          {signal.description || "No se agregó una descripción."}
        </p>
      </div>

      <div>
        <p className="text-label text-slate-400">Imagen</p>
        {signal.photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- dataURL local, no una URL remota optimizable todavía.
          <img
            src={signal.photo}
            alt={`Imagen adjunta de la señalización: ${signalLabel}`}
            className="mt-2 max-h-96 w-full rounded-2xl object-cover"
          />
        ) : (
          <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-slate-50 px-4 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <CameraIcon className="h-5 w-5" />
            </span>
            <p className="text-sm text-slate-500">No se adjuntó imagen.</p>
          </div>
        )}
      </div>

      <CommunityInfo signal={signal} />

      {signal.isOwner ? (
        <OwnerActions signalId={signal.id} onDeleteRequest={onDeleteRequest} />
      ) : currentUserId ? (
        <CommunityActions signal={signal} onVerify={onVerify} onIncorrectRequest={onIncorrectRequest} />
      ) : (
        <p className="border-t border-slate-100 pt-4 text-xs text-slate-400">
          Identificando tu dispositivo… probá de nuevo en un momento para poder validar esta
          señalización.
        </p>
      )}
    </div>
  );
}

function CommunityInfo({ signal }: { signal: SignalWithTrust }) {
  const StatusIcon = REPORT_STATUS_ICONS[signal.status];
  return (
    <div>
      <p className="text-label text-slate-400">
        Estado de la señalización
      </p>
      <span
        className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${REPORT_STATUS_BADGE_CLASSNAMES[signal.status]}`}
      >
        <StatusIcon className="h-4 w-4 shrink-0" />
        {REPORT_STATUS_LABELS[signal.status]}
      </span>
      {signal.confidenceLabel && (
        <p className="mt-2 text-sm text-slate-600">{signal.confidenceLabel}</p>
      )}
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-slate-200/60 bg-slate-50 px-2 py-2">
          <dt className="text-[11px] text-slate-500">Sigue así</dt>
          <dd className="text-sm font-bold text-slate-800">{signal.confirmedCount}</dd>
        </div>
        <div className="rounded-xl border border-slate-200/60 bg-slate-50 px-2 py-2">
          <dt className="text-[11px] text-slate-500">Ya no está</dt>
          <dd className="text-sm font-bold text-slate-800">{signal.resolvedCount}</dd>
        </div>
        <div className="rounded-xl border border-slate-200/60 bg-slate-50 px-2 py-2">
          <dt className="text-[11px] text-slate-500">Incorrecta</dt>
          <dd className="text-sm font-bold text-slate-800">{signal.incorrectCount}</dd>
        </div>
      </dl>
      {signal.lastConfirmedAt && (
        <p className="mt-3 text-xs text-slate-500">
          Última confirmación {formatReportAge(signal.lastConfirmedAt).toLowerCase()}
        </p>
      )}
    </div>
  );
}

function OwnerActions({
  signalId,
  onDeleteRequest,
}: {
  signalId: string;
  onDeleteRequest: () => void;
}) {
  return (
    <div className="flex flex-col gap-2.5 border-t border-slate-100 pt-4">
      <p className="text-xs text-slate-500">
        Esta señalización es tuya, así que no podés validarla vos mismo/a.
      </p>
      <Link
        href={`/reportar?edit=${signalId}`}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-teal-200 bg-white px-5 py-3 text-sm font-semibold text-teal-700 shadow-control transition hover:bg-teal-50 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
      >
        <PencilIcon className="h-4 w-4" />
        Editar señalización
      </Link>
      <button
        type="button"
        onClick={onDeleteRequest}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-5 py-3 text-sm font-semibold text-rose-600 shadow-control transition hover:bg-rose-50 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
      >
        <TrashIcon className="h-4 w-4" />
        Eliminar señalización
      </button>
    </div>
  );
}

const VERIFICATION_BUTTONS: { value: VerificationValue; icon: typeof CheckCircleIcon }[] = [
  { value: "confirmed", icon: CheckCircleIcon },
  { value: "resolved", icon: CircleSlashIcon },
  { value: "incorrect", icon: AlertTriangleIcon },
];

function CommunityActions({
  signal,
  onVerify,
  onIncorrectRequest,
}: {
  signal: SignalWithTrust;
  onVerify: SignalDetailSheetProps["onVerify"];
  onIncorrectRequest: () => void;
}) {
  return (
    <div className="flex flex-col gap-2.5 border-t border-slate-100 pt-4">
      <p className="text-sm font-bold text-slate-900">¿Esta señalización sigue siendo correcta?</p>

      {signal.myVerification && (
        <p className="rounded-xl border border-teal-100 bg-teal-50 px-3 py-2 text-xs font-medium text-teal-800">
          Tu verificación: {VERIFICATION_VALUE_LABELS[signal.myVerification.value]}
        </p>
      )}

      <div role="group" aria-label="Verificar señalización" className="flex flex-col gap-2">
        {VERIFICATION_BUTTONS.map(({ value, icon: Icon }) => {
          const isActive = signal.myVerification?.value === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={isActive}
              onClick={() =>
                value === "incorrect" ? onIncorrectRequest() : onVerify(signal.id, value)
              }
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold shadow-control transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
                isActive
                  ? "border-teal-400 bg-teal-50 text-teal-800"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {VERIFICATION_VALUE_LABELS[value]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ConfirmDeleteView({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-h3 text-slate-950">¿Eliminar esta señalización?</h3>
        <p className="mt-1 text-sm text-slate-600">
          Dejará de mostrarse como una señalización activa.
        </p>
      </div>
      <div className="flex flex-col gap-2.5 sm:flex-row-reverse">
        <button
          type="button"
          onClick={onConfirm}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white shadow-control transition hover:bg-rose-700 hover:shadow-card active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
        >
          <TrashIcon className="h-4 w-4" />
          Eliminar señalización
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-control transition hover:bg-slate-50 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function IncorrectReasonView({
  reason,
  note,
  onChangeReason,
  onChangeNote,
  onCancel,
  onSave,
}: {
  reason: IncorrectReason | null;
  note: string;
  onChangeReason: (reason: IncorrectReason) => void;
  onChangeNote: (note: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-h3 text-slate-950">¿Qué está incorrecto?</h3>
        <p className="mt-1 text-sm text-slate-500">Elegí la opción que mejor describe el problema.</p>
      </div>

      <div role="radiogroup" aria-label="¿Qué está incorrecto?" className="flex flex-col gap-2">
        {INCORRECT_REASON_OPTIONS.map(({ key, label }) => {
          const isSelected = reason === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChangeReason(key)}
              className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium shadow-control transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${
                isSelected
                  ? "border-orange-400 bg-orange-50 text-orange-800"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {label}
              <span
                aria-hidden="true"
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  isSelected ? "border-orange-500" : "border-slate-300"
                }`}
              >
                {isSelected && <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />}
              </span>
            </button>
          );
        })}
      </div>

      {reason === "other" && (
        <div>
          <label htmlFor="incorrect-reason-note" className="text-sm font-medium text-slate-700">
            Contanos brevemente (opcional)
          </label>
          <textarea
            id="incorrect-reason-note"
            value={note}
            maxLength={250}
            onChange={(event) => onChangeNote(event.target.value)}
            rows={2}
            placeholder="¿Qué está mal con esta señalización?"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-inset-control placeholder:text-slate-400 transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
        </div>
      )}

      <div className="flex flex-col gap-2.5 sm:flex-row-reverse">
        <button
          type="button"
          disabled={!reason}
          onClick={onSave}
          className="flex flex-1 items-center justify-center rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-control transition hover:bg-orange-600 hover:shadow-card active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-control transition hover:bg-slate-50 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
