import Link from "next/link";
import { ArrowLeftIcon, SettingsIcon } from "@/components/icons";

export default function ProfileHeader() {
  return (
    <header className="flex items-center justify-between gap-3">
      <Link
        href="/"
        aria-label="Volver a Inicio"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-control transition hover:bg-slate-50 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
      >
        <ArrowLeftIcon className="h-5 w-5" />
      </Link>

      <div className="min-w-0 flex-1 text-center">
        <h1 className="truncate text-h1 text-slate-950">Mi perfil</h1>
        <p className="truncate text-body-sm text-slate-500">
          Personalizá tu experiencia en SENDA.
        </p>
      </div>

      <button
        type="button"
        aria-label="Configuración"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-control transition hover:bg-slate-50 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
      >
        <SettingsIcon className="h-5 w-5" />
      </button>
    </header>
  );
}
