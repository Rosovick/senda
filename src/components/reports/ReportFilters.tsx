import { REPORT_FILTERS, type ReportFilterKey } from "@/lib/reports";

type ReportFiltersProps = {
  active: ReportFilterKey;
  onChange: (key: ReportFilterKey) => void;
};

// Solo se renderiza cuando ya existe al menos un reporte (ver
// ReportsScreen): con la lista vacía no aportan nada y generan ruido visual.
export default function ReportFilters({ active, onChange }: ReportFiltersProps) {
  return (
    <div role="group" aria-label="Filtrar reportes" className="flex flex-wrap gap-2">
      {REPORT_FILTERS.map(({ key, label }) => {
        const isActive = key === active;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold shadow-control transition active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400 ${
              isActive
                ? "bg-lime-400 text-slate-950 hover:bg-lime-300"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
