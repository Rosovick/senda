import Link from "next/link";
import { MegaphoneIcon, PlusIcon } from "./icons";
import { SignalReportScene } from "./illustrations";

export default function ReportBarrierCard() {
  return (
    <section className="relative overflow-hidden rounded-[28px] bg-[#0B0C0E] sm:rounded-5xl sm:h-[287px]">
      <div className="pointer-events-none absolute right-0 top-0 aspect-[11/9] w-[42%] sm:inset-y-0 sm:top-auto sm:h-full sm:w-[52%] sm:aspect-auto">
        <SignalReportScene className="h-full w-full" />
      </div>

      <Link
        href="/reportes"
        aria-label="Crear una señalización"
        className="absolute bottom-4 right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-violet-600 text-white shadow-[0_10px_24px_rgba(124,58,237,0.5)] transition hover:bg-violet-500 active:scale-95 sm:bottom-8 sm:right-9 sm:h-[70px] sm:w-[70px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
      >
        <PlusIcon className="h-5 w-5 sm:h-7 sm:w-7" />
      </Link>

      <div className="relative z-10 flex max-w-[52%] flex-col p-5 pr-0 sm:h-full sm:max-w-[48%] sm:p-9 sm:pr-9">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#17191b] text-violet-400 ring-1 ring-white/5 sm:h-14 sm:w-14 sm:rounded-[18px]">
          <MegaphoneIcon className="h-[18px] w-[18px] sm:h-6 sm:w-6" />
        </span>

        <h2 className="mt-3 shrink-0 text-[clamp(19px,5.4vw,26px)] leading-[1.15] font-extrabold text-white sm:mt-6 sm:text-[26px]">
          Crear una
          <br />
          <span className="text-violet-400">señalización</span>
        </h2>

        <p className="mt-2 shrink-0 text-[13.5px] leading-snug text-slate-400 sm:mt-3 sm:text-base sm:leading-relaxed">
          Compartí información sobre obstáculos o ayudas de accesibilidad.
        </p>
      </div>
    </section>
  );
}
