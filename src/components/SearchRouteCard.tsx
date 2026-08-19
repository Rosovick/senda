import Link from "next/link";
import { ChevronRightIcon, RouteMapIcon } from "./icons";
import { RouteMapScene } from "./illustrations";

export default function SearchRouteCard() {
  return (
    <section className="relative overflow-hidden rounded-[28px] bg-[#0B0C0E] sm:rounded-5xl sm:h-[472px]">
      <div className="pointer-events-none absolute bottom-0 right-0 aspect-[11/10] w-[44%] sm:inset-y-0 sm:bottom-auto sm:h-full sm:w-[58%] sm:aspect-auto">
        <RouteMapScene className="h-full w-full" />
      </div>

      <div className="relative z-10 flex max-w-[54%] flex-col p-5 pr-0 sm:h-full sm:max-w-[44%] sm:p-9 sm:pr-9">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#17191b] text-lime-400 ring-1 ring-white/5 sm:h-[68px] sm:w-[68px] sm:rounded-[20px]">
          <RouteMapIcon className="h-[18px] w-[18px] sm:h-7 sm:w-7" />
        </span>

        <h2 className="mt-3 shrink-0 text-[clamp(21px,6.2vw,32px)] leading-[1.1] font-extrabold text-white sm:mt-[35px] sm:text-[44px] sm:leading-[1.1]">
          Buscar una
          <br />
          ruta <span className="text-lime-400">accesible</span>
        </h2>

        <p className="mt-2.5 shrink-0 text-[13.5px] leading-snug text-slate-400 sm:mt-[35px] sm:text-lg sm:leading-relaxed">
          Encontrá el mejor camino según tus preferencias y necesidades.
        </p>

        <Link
          href="/ruta"
          className="mt-4 inline-flex h-12 w-fit shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-lime-400 pl-4 pr-1.5 text-sm font-bold text-slate-950 transition hover:bg-lime-300 active:scale-[0.98] sm:mt-[51px] sm:h-auto sm:gap-6 sm:py-[11px] sm:pl-9 sm:pr-[11px] sm:text-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400"
        >
          Buscar ruta
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-lime-400 sm:h-[50px] sm:w-[50px]">
            <ChevronRightIcon className="h-4 w-4 sm:h-6 sm:w-6" />
          </span>
        </Link>
      </div>
    </section>
  );
}
