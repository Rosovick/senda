import {
  BookmarkIcon,
  ChevronDownIcon,
  ClockIcon,
  DistanceIcon,
  InfoIcon,
  MapPinIcon,
} from "@/components/icons";
import { RouteMapScene } from "@/components/illustrations";
import { formatDistance, formatDuration, type RouteData } from "@/lib/routing";
import type { RouteStatus } from "@/hooks/useRoute";

type RouteSummaryProps = {
  status: RouteStatus;
  route: RouteData | null;
  errorMessage: string | null;
  // "Guardar trayecto" (sección 4 del pedido): solo tiene sentido una vez
  // que hay una ruta calculada — opcional para no romper otros usos de
  // RouteSummary que no necesiten esta acción.
  onSaveRoute?: () => void;
};

// Sin datos mock: mientras no haya una ruta real calculada, no se muestra
// duración/distancia/dificultad inventadas.
export default function RouteSummary({ status, route, errorMessage, onSaveRoute }: RouteSummaryProps) {
  const showIllustration = status === "idle" || status === "loading";

  return (
    <section
      className="relative overflow-hidden rounded-[28px] bg-slate-950 p-6 shadow-card sm:p-7"
      aria-live="polite"
    >
      {showIllustration && (
        <div className="pointer-events-none absolute bottom-0 right-0 aspect-[11/10] w-[42%]">
          <RouteMapScene className="h-full w-full" />
        </div>
      )}

      <div className={`relative z-10 ${showIllustration ? "max-w-[56%]" : ""}`}>
        <h2 className="text-h2 font-extrabold text-white">Ruta recomendada</h2>

        {status === "idle" && (
          <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-slate-300">
            <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-lime-400" />
            Elegí un destino para calcular la ruta.
          </p>
        )}

        {status === "loading" && (
          <p className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-300">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-lime-400" />
            Calculando ruta…
          </p>
        )}

        {status === "error" && (
          <p className="mt-3 flex items-start gap-2 rounded-2xl bg-amber-400/10 px-3 py-2 text-sm leading-relaxed text-amber-300">
            <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            {errorMessage ?? "No pudimos calcular la ruta. Probá de nuevo."}
          </p>
        )}

        {status === "success" && route && (
          <>
            <p className="mt-0.5 text-sm text-slate-400">Recorrido a pie</p>

            <div className="mt-5 grid grid-cols-2 gap-3 border-y border-white/10 py-4 text-center">
              <div className="flex flex-col items-center gap-1">
                <ClockIcon className="h-5 w-5 text-lime-400" />
                <p className="text-sm font-bold text-white">
                  {formatDuration(route.durationSeconds)}
                </p>
                <p className="text-[11px] text-slate-400">Tiempo estimado</p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <DistanceIcon className="h-5 w-5 text-lime-400" />
                <p className="text-sm font-bold text-white">
                  {formatDistance(route.distanceMeters)}
                </p>
                <p className="text-[11px] text-slate-400">Distancia</p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-start gap-2 text-sm leading-relaxed text-slate-300">
                <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-lime-400" />
                Ruta calculada con calles y caminos reales de OpenStreetMap.
              </p>
              <div className="flex shrink-0 gap-2 self-start sm:self-auto">
                {onSaveRoute && (
                  <button
                    type="button"
                    onClick={onSaveRoute}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400"
                  >
                    <BookmarkIcon className="h-4 w-4" />
                    Guardar trayecto
                  </button>
                )}
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-1 rounded-full bg-lime-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-lime-300 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400"
                >
                  Ver detalles
                  <ChevronDownIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
