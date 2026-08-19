type StepIndicatorProps = {
  step: 1 | 2 | 3;
};

const STEPS: { step: 1 | 2 | 3; label: string }[] = [
  { step: 1, label: "Ubicación" },
  { step: 2, label: "Detalles" },
  { step: 3, label: "Confirmar" },
];

// El paso actual y los completados no dependen solo del color: el
// completado muestra un check y el actual queda marcado con aria-current.
export default function StepIndicator({ step }: StepIndicatorProps) {
  return (
    <ol className="flex items-start" aria-label="Progreso del reporte">
      {STEPS.map(({ step: itemStep, label }, index) => {
        const isCompleted = itemStep < step;
        const isCurrent = itemStep === step;

        return (
          <li key={itemStep} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex w-full items-center">
              {index > 0 && (
                <span
                  className={`h-0.5 flex-1 ${isCompleted || isCurrent ? "bg-lime-400" : "bg-slate-200"}`}
                  aria-hidden="true"
                />
              )}
              <span
                aria-current={isCurrent ? "step" : undefined}
                className={`grid h-8 w-8 shrink-0 aspect-square place-items-center rounded-full border-2 p-0 shadow-control transition ${
                  isCompleted
                    ? "border-lime-500 bg-lime-500 text-white"
                    : isCurrent
                      ? "border-lime-500 bg-white text-lime-700"
                      : "border-slate-200 bg-white text-slate-400"
                }`}
              >
                {isCompleted ? (
                  <svg viewBox="0 0 24 24" className="block h-4 w-4" fill="none" aria-hidden="true">
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <span className="block text-sm leading-none font-bold tabular-nums">
                    {itemStep}
                  </span>
                )}
              </span>
              {index < STEPS.length - 1 && (
                <span
                  className={`h-0.5 flex-1 ${isCompleted ? "bg-lime-500" : "bg-slate-200"}`}
                  aria-hidden="true"
                />
              )}
            </div>
            <span
              className={`text-xs font-semibold ${isCurrent ? "text-lime-700" : "text-slate-400"}`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
