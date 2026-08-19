import Link from "next/link";
import { ArrowLeftIcon } from "@/components/icons";

export default function RouteHeader() {
  return (
    <header className="flex items-center gap-4">
      <Link
        href="/"
        aria-label="Volver a Inicio"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-slate-950 shadow-control transition hover:bg-slate-50 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400"
      >
        <ArrowLeftIcon className="h-5 w-5" />
      </Link>

      <div className="min-w-0">
        <h1 className="truncate text-h1 text-slate-950">
          Buscar ruta accesible
        </h1>
        <p className="truncate text-body-sm text-slate-500">
          Te mostramos la mejor ruta según tu perfil.
        </p>
      </div>
    </header>
  );
}
