import Link from "next/link";
import type { ComponentType } from "react";
import { FlagIcon, HomeIcon, RouteMapIcon, UserIcon } from "@/components/icons";

export type BottomNavKey = "inicio" | "mapa" | "reportes" | "perfil";

type Tab = {
  key: BottomNavKey;
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

// "Favoritos" ya no es una pestaña propia: los trayectos guardados viven
// dentro de Mapa ("Guardados"/"Guardar trayecto") y Perfil ("Lugares
// guardados"), ambos sobre la misma fuente de datos (useSavedRoutes) — ver
// components/route/SavedRoutesSheet.tsx y components/profile/SavedPlacesCard.tsx.
const TABS: Tab[] = [
  { key: "inicio", label: "Inicio", href: "/", icon: HomeIcon },
  { key: "mapa", label: "Mapa", href: "/ruta", icon: RouteMapIcon },
  { key: "reportes", label: "Señalizaciones", href: "/reportes", icon: FlagIcon },
  { key: "perfil", label: "Perfil", href: "/perfil", icon: UserIcon },
];

export default function BottomNavigation({ active }: { active?: BottomNavKey }) {
  return (
    <nav className="flex items-stretch justify-around px-2 py-3.5 sm:px-3 sm:py-6">
      {TABS.map(({ key, label, href, icon: Icon }) => {
        const isActive = key === active;
        const colorClass = isActive ? "text-lime-400" : "text-slate-400";

        if (isActive) {
          return (
            <span key={key} aria-current="page" className="flex flex-1 flex-col items-center gap-1 sm:gap-2">
              <span aria-hidden="true" className="h-[3px] w-5 rounded-full bg-lime-400 sm:h-1 sm:w-6" />
              <Icon className={`h-[22px] w-[22px] sm:h-6 sm:w-6 ${colorClass}`} />
              <span className={`text-[11px] font-semibold sm:text-xs ${colorClass}`}>{label}</span>
            </span>
          );
        }

        return (
          <Link
            key={key}
            href={href}
            className="flex flex-1 flex-col items-center gap-1 pt-1.5 text-slate-400 transition hover:text-lime-400 active:scale-95 sm:gap-2 sm:pt-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400"
          >
            <Icon className="h-[22px] w-[22px] sm:h-6 sm:w-6" />
            <span className="text-[11px] font-medium sm:text-xs">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
