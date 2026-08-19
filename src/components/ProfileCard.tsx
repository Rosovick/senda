"use client";

import Link from "next/link";
import UserAvatarView from "@/components/UserAvatarView";
import { useUserProfile } from "@/hooks/useUserProfile";
import { ChevronRightIcon, SlidersIcon } from "./icons";

// El saludo usa el perfil persistido localmente (ver useUserProfile): no hay
// un nombre fijo de la app, "Sofía" es solo el valor de referencia inicial
// hasta que exista una cuenta real.
export default function ProfileCard() {
  const { profile, displayName } = useUserProfile();

  return (
    <section className="flex flex-wrap items-center gap-4 sm:justify-between sm:gap-6">
      <div className="flex w-full items-center gap-4 sm:w-auto sm:gap-6">
        <UserAvatarView
          name={profile.name}
          avatar={profile.avatar}
          className="h-[68px] w-[68px] shrink-0 text-2xl sm:h-[124px] sm:w-[124px] sm:text-4xl"
        />

        <div className="min-w-0">
          <h1 className="text-[28px] font-extrabold leading-[1.1] text-slate-950 sm:text-[40px] sm:leading-[1.05]">
            ¡Hola, <span className="text-lime-500">{displayName}</span>!
          </h1>
          <p className="mt-1 text-base leading-snug text-slate-500 sm:mt-2 sm:text-lg">
            Tu perfil de accesibilidad
            <br />
            personaliza tus rutas.
          </p>
        </div>
      </div>

      <Link
        href="/perfil"
        className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-white px-6 text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:bg-slate-50 active:scale-[0.98] sm:h-auto sm:w-auto sm:justify-start sm:rounded-[22px] sm:py-4 sm:pl-7 sm:pr-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-500"
      >
        <SlidersIcon className="h-5 w-5 shrink-0 text-slate-700" />
        <span className="whitespace-nowrap text-base font-semibold sm:text-lg">
          Personalizar mis preferencias
        </span>
        <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-400" />
      </Link>
    </section>
  );
}
