import Link from "next/link";
import { ArrowLeftIcon } from "@/components/icons";

export default function EditProfileHeader() {
  return (
    <header className="relative flex items-center justify-center">
      <Link
        href="/perfil"
        aria-label="Volver a Mi perfil"
        className="absolute left-0 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-control transition hover:bg-slate-50 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
      >
        <ArrowLeftIcon className="h-5 w-5" />
      </Link>

      <div className="px-14 text-center sm:px-16">
        <h1 className="text-h1 text-slate-950">Editar perfil</h1>
        <p className="text-body-sm text-slate-500">Actualizá tu información personal.</p>
      </div>
    </header>
  );
}
