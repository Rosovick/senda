import Link from "next/link";
import { ArrowLeftIcon, PlusCircleIcon } from "@/components/icons";

// Copy visible: "Señalizaciones"/"Crear señalización". Internamente esto
// sigue siendo /reportar y el resto del modelo de "reportes" (ver AGENTS):
// solo cambia el texto que ve la persona usuaria, no rutas ni nombres.
export default function ReportsHeader() {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <Link
          href="/"
          aria-label="Volver a Inicio"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-950 shadow-control transition hover:bg-slate-50 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>

        <div>
          <h1 className="text-h1 text-slate-950 sm:text-[1.9rem]">
            Señalizaciones de la comunidad
          </h1>
          <p className="mt-1 text-body-sm text-slate-500 sm:text-body">
            Barreras que afectan la accesibilidad
          </p>
        </div>
      </div>

      <Link
        href="/reportar"
        className="inline-flex items-center gap-2 rounded-full bg-lime-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-control transition hover:bg-lime-300 hover:shadow-card active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400"
      >
        <PlusCircleIcon className="h-5 w-5" />
        Crear señalización
      </Link>
    </header>
  );
}
