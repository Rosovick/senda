import Link from "next/link";
import { ChevronRightIcon } from "@/components/icons";
import { EmptyReportsIllustration } from "@/components/illustrations";

// Mismo destino que "Crear señalización" del encabezado: es intencional que
// existan ambos accesos (acción global arriba, CTA contextual del estado
// vacío acá). Copy visible en español ("señalización"); el modelo/rutas
// internas de "reportes" no cambian (ver /reportar).
export default function ReportsEmptyState() {
  return (
    <section className="rounded-3xl border border-slate-200/70 bg-white p-7 text-center shadow-card sm:p-9">
      <div className="flex justify-center">
        <EmptyReportsIllustration className="h-28 w-36 text-lime-700/70" />
      </div>

      <h2 className="mt-4 text-h1 text-slate-950">¡Sé el primero en señalizar!</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
        Toda la comunidad puede construir rutas más accesibles. Tu señalización hace la diferencia.
      </p>

      <Link
        href="/reportar"
        className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-lime-400 px-6 py-4 text-base font-semibold text-slate-950 shadow-control transition hover:bg-lime-300 hover:shadow-card active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400 sm:w-auto"
      >
        Crear primera señalización
      </Link>

      <button
        type="button"
        className="mt-4 flex w-full items-center justify-center gap-1 rounded-2xl py-1 text-sm font-semibold text-slate-700 transition hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400"
      >
        ¿Cómo señalizar correctamente?
        <ChevronRightIcon className="h-4 w-4" />
      </button>
    </section>
  );
}
