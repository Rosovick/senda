"use client";

import { useRef, useState, type ComponentType } from "react";
import {
  CalendarIcon,
  CameraIcon,
  ClockIcon,
  CloseIcon,
  InfoIcon,
  ThumbsUpIcon,
} from "@/components/icons";
import { signalTypeOptionsByCategory, type SignalType } from "@/lib/reports";
import {
  createReportPhotoPreview,
  ReportPhotoError,
  validateReportPhotoFile,
} from "@/lib/reportPhoto";
import { ExclamationBadgeIcon, GalleryPhotoIcon, SIGNAL_DETAIL_ICONS } from "./signalDetailIcons";
import type { ReportDraft, SeenOption } from "./types";
import { hasValidDetails } from "./types";

type DetailsStepProps = {
  draft: ReportDraft;
  onNext: (
    patch: Pick<ReportDraft, "signalType" | "seenOption" | "seenAt" | "photo" | "description">
  ) => void;
};

const HELP_OPTIONS = signalTypeOptionsByCategory("help");
const OBSTACLE_OPTIONS = signalTypeOptionsByCategory("obstacle");

const SEEN_OPTIONS: { key: SeenOption; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { key: "now", label: "Ahora", icon: ClockIcon },
  { key: "today", label: "Hoy", icon: CalendarIcon },
  { key: "custom", label: "Elegir fecha", icon: CalendarIcon },
];

const DESCRIPTION_MAX_LENGTH = 250;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

// Una única fila de radio: visualmente forma parte de una de las dos
// columnas (ayuda/obstáculo), pero pertenece al mismo grupo de selección
// que todas las demás (ver el div role="radiogroup" en el render).
function SignalOptionRow({
  label,
  icon: Icon,
  isSelected,
  color,
  onSelect,
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  isSelected: boolean;
  color: "lime" | "orange";
  onSelect: () => void;
}) {
  const tileBg = color === "lime" ? "bg-lime-50" : "bg-orange-50";
  const iconColor = color === "lime" ? "text-lime-800" : "text-orange-600";
  const ringColor = color === "lime" ? "border-lime-600" : "border-orange-600";
  const dotColor = color === "lime" ? "bg-lime-600" : "bg-orange-600";
  const activeRowBg = color === "lime" ? "bg-lime-50/60" : "bg-orange-50/60";

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      onClick={onSelect}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-lime-400 ${
        isSelected ? activeRowBg : "hover:bg-slate-50"
      }`}
    >
      <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${tileBg}`}>
        <Icon className={`h-7 w-7 ${iconColor}`} />
      </span>
      <span className="flex-1 text-sm font-medium leading-snug text-slate-800">{label}</span>
      <span
        aria-hidden="true"
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
          isSelected ? ringColor : "border-slate-300"
        }`}
      >
        {isSelected && <span className={`h-3 w-3 rounded-full ${dotColor}`} />}
      </span>
    </button>
  );
}

export default function DetailsStep({ draft, onNext }: DetailsStepProps) {
  const [signalType, setSignalType] = useState<SignalType | null>(draft.signalType);
  const [seenOption, setSeenOption] = useState<SeenOption | null>(draft.seenOption);
  const [seenAt, setSeenAt] = useState(draft.seenAt);
  const [customDate, setCustomDate] = useState(draft.seenAt ? draft.seenAt.slice(0, 10) : "");
  const [photo, setPhoto] = useState(draft.photo);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [description, setDescription] = useState(draft.description);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  function handleSeenOptionChange(option: SeenOption) {
    setSeenOption(option);
    if (option === "now" || option === "today") {
      setSeenAt(new Date().toISOString());
    } else {
      setSeenAt(customDate ? new Date(`${customDate}T12:00:00`).toISOString() : null);
    }
  }

  function handleCustomDateChange(value: string) {
    setCustomDate(value);
    setSeenAt(value ? new Date(`${value}T12:00:00`).toISOString() : null);
  }

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      validateReportPhotoFile(file);
      const dataUrl = await createReportPhotoPreview(file);
      setPhoto(dataUrl);
      setPhotoError(null);
    } catch (error) {
      setPhotoError(
        error instanceof ReportPhotoError
          ? error.message
          : "No pudimos procesar la imagen. Probá con otro archivo."
      );
    }
  }

  const currentDraft: ReportDraft = {
    ...draft,
    signalType,
    seenOption,
    seenAt,
    photo,
    description,
  };
  const isValid = hasValidDetails(currentDraft);

  function getValidationMessage(): string | null {
    if (!signalType) return "Seleccioná qué querés señalizar para continuar.";
    if (!seenAt) return "Indicá cuándo lo viste para continuar.";
    return null;
  }

  function handleNext() {
    if (!isValid) return;
    onNext({
      signalType,
      seenOption,
      seenAt,
      photo,
      description: description.trim(),
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-card sm:p-7">
        <h2 className="text-h2 text-slate-950">¿Qué querés señalizar?</h2>
        <p className="mt-0.5 text-sm text-slate-500">Seleccioná una opción.</p>

        <div
          role="radiogroup"
          aria-label="¿Qué querés señalizar?"
          className="mt-5 grid gap-6 lg:grid-cols-2"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lime-500 text-white">
                <ThumbsUpIcon className="h-4 w-4" />
              </span>
              <h3 className="text-label text-lime-700">
                Ayuda de accesibilidad
              </h3>
            </div>
            <div className="mt-3 flex flex-col divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 shadow-control">
              {HELP_OPTIONS.map(({ key, label }) => (
                <SignalOptionRow
                  key={key}
                  label={label}
                  icon={SIGNAL_DETAIL_ICONS[key]}
                  isSelected={signalType === key}
                  color="lime"
                  onSelect={() => setSignalType(key)}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-600 text-white">
                <ExclamationBadgeIcon className="h-4 w-4" />
              </span>
              <h3 className="text-label text-orange-700">
                Obstáculo de accesibilidad
              </h3>
            </div>
            <div className="mt-3 flex flex-col divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 shadow-control">
              {OBSTACLE_OPTIONS.map(({ key, label }) => (
                <SignalOptionRow
                  key={key}
                  label={label}
                  icon={SIGNAL_DETAIL_ICONS[key]}
                  isSelected={signalType === key}
                  color="orange"
                  onSelect={() => setSignalType(key)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-card sm:p-7">
        <h2 className="text-h2 text-slate-950">¿Cuándo lo viste?</h2>

        <div role="radiogroup" aria-label="¿Cuándo lo viste?" className="mt-4 grid gap-3 sm:grid-cols-3">
          {SEEN_OPTIONS.map(({ key, label, icon: Icon }) => {
            const isActive = seenOption === key;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => handleSeenOptionChange(key)}
                className={`flex items-center justify-center gap-2 rounded-2xl border-2 bg-white px-4 py-3 text-sm font-semibold text-slate-950 shadow-control transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400 ${
                  isActive
                    ? "border-lime-500"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>

        {seenOption === "custom" && (
          <div className="mt-3">
            <label htmlFor="seen-custom-date" className="text-sm font-medium text-slate-700">
              Fecha en la que lo viste
            </label>
            <input
              id="seen-custom-date"
              type="date"
              value={customDate}
              max={todayIsoDate()}
              onChange={(event) => handleCustomDateChange(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-inset-control transition focus:border-lime-400 focus:outline-none focus:ring-2 focus:ring-lime-100"
            />
          </div>
        )}

        {(seenOption === "now" || seenOption === "today") && (
          <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <ClockIcon className="h-3.5 w-3.5" />
            Se registrará la fecha y hora actual.
          </p>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-card sm:p-7">
        <h2 className="text-h2 text-slate-950">Agregá una foto (opcional)</h2>
        <p className="mt-0.5 text-sm text-slate-500">Una imagen ayuda a entender mejor la situación.</p>

        {photo ? (
          <div className="mt-4 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- dataURL local (recortada/comprimida), no una URL remota optimizable todavía. */}
            <img src={photo} alt="" className="h-20 w-20 rounded-2xl object-cover" />
            <button
              type="button"
              onClick={() => setPhoto(null)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-control transition hover:bg-slate-50 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400"
            >
              <CloseIcon className="h-4 w-4" />
              Quitar foto
            </button>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              capture="environment"
              className="sr-only"
              onChange={handlePhotoChange}
            />
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center justify-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-control transition hover:bg-slate-50 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400"
            >
              <CameraIcon className="h-6 w-6 shrink-0 text-lime-800" />
              <span className="text-sm font-semibold text-slate-800">Tomar foto</span>
            </button>

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="sr-only"
              onChange={handlePhotoChange}
            />
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="flex items-center justify-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-control transition hover:bg-slate-50 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400"
            >
              <GalleryPhotoIcon className="h-6 w-6 shrink-0 text-lime-800" />
              <span className="text-sm font-semibold text-slate-800">Elegir de galería</span>
            </button>
          </div>
        )}

        {photoError && (
          <p
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-800"
          >
            <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            {photoError}
          </p>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-card sm:p-7">
        <h2 className="text-h2 text-slate-950">Contanos más (opcional)</h2>
        <p className="mt-0.5 text-sm text-slate-500">Agregá detalles que puedan ser útiles.</p>

        <label htmlFor="report-description" className="sr-only">
          Descripción de la señalización
        </label>
        <textarea
          id="report-description"
          value={description}
          maxLength={DESCRIPTION_MAX_LENGTH}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Ej: La rampa está bloqueada por materiales de construcción."
          rows={3}
          className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-inset-control placeholder:text-slate-400 transition focus:border-lime-400 focus:outline-none focus:ring-2 focus:ring-lime-100"
        />
        <p className="mt-1 text-right text-xs text-slate-400">
          {description.length}/{DESCRIPTION_MAX_LENGTH}
        </p>
      </section>

      <button
        type="button"
        onClick={handleNext}
        disabled={!isValid}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-lime-500 px-6 py-4 text-base font-semibold text-slate-950 shadow-control transition hover:bg-lime-400 hover:shadow-card active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-500"
      >
        Siguiente
      </button>
      {!isValid && (
        <p className="-mt-3 text-center text-xs text-slate-400">{getValidationMessage()}</p>
      )}
    </div>
  );
}
