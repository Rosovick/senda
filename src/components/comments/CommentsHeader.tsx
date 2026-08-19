import Link from "next/link";
import { ArrowLeftIcon } from "@/components/icons";

// Misma forma que ReportsHeader/WizardHeader (flecha circular blanca +
// título), pero vuelve específicamente a /reportes — es la pantalla desde
// la que siempre se llega acá (ver "Ver comentarios" en ReportCard).
export default function CommentsHeader() {
  return (
    <header className="flex items-center gap-3">
      <Link
        href="/reportes"
        aria-label="Volver a Señalizaciones de la comunidad"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-950 shadow-control transition hover:bg-slate-50 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400"
      >
        <ArrowLeftIcon className="h-5 w-5" />
      </Link>
      <h1 className="text-h1 text-slate-950">Comentarios</h1>
    </header>
  );
}
