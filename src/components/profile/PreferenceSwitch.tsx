"use client";

type PreferenceSwitchProps = {
  checked: boolean;
  onChange: () => void;
  labelId: string;
  color?: "teal" | "violet" | "orange";
};

const ACTIVE_TRACK_CLASS: Record<NonNullable<PreferenceSwitchProps["color"]>, string> = {
  teal: "bg-teal-600",
  violet: "bg-violet-600",
  orange: "bg-orange-500",
};

const CHECK_COLOR_CLASS: Record<NonNullable<PreferenceSwitchProps["color"]>, string> = {
  teal: "text-teal-600",
  violet: "text-violet-600",
  orange: "text-orange-500",
};

// Switch real y accesible: role="switch" + aria-checked, operable con
// teclado (es un <button>), foco visible, y no depende solo del color para
// comunicar el estado (agrega un check dentro de la perilla cuando está
// activo, además del texto asociado vía aria-labelledby).
export default function PreferenceSwitch({
  checked,
  onChange,
  labelId,
  color = "teal",
}: PreferenceSwitchProps) {
  const activeTrack = ACTIVE_TRACK_CLASS[color];
  const checkColor = CHECK_COLOR_CLASS[color];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelId}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full shadow-inset-control transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
        checked ? activeTrack : "bg-slate-200"
      }`}
    >
      <span
        className={`flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow-control transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      >
        {checked && (
          <svg viewBox="0 0 24 24" fill="none" className={`h-3 w-3 ${checkColor}`} aria-hidden="true">
            <path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    </button>
  );
}
