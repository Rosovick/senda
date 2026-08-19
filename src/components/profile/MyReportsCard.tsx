import Link from "next/link";
import { ChevronRightIcon, ClipboardIcon, FlagIcon } from "@/components/icons";
import { SIGNAL_TYPE_ICONS, UNKNOWN_SIGNAL_TYPE_ICON } from "@/components/signalTypeIcons";
import type { SignalWithTrust } from "@/hooks/useSignals";
import { REPORT_STATUS_LABELS, resolveSignal } from "@/lib/reports";

const RECENT_SIGNALS_LIMIT = 3;

type MyReportsCardProps = {
  // Señalizaciones ACTIVAS creadas por el usuario actual (ver ProfileScreen:
  // signals.filter(isOwner && isActive) sobre useSignals(), la misma
  // colección centralizada que lee /reportes). [] es un estado real
  // ("todavía no creaste ninguna"), nunca un placeholder inventado.
  signals: SignalWithTrust[];
};

export default function MyReportsCard({ signals }: MyReportsCardProps) {
  const hasSignals = signals.length > 0;
  const recentSignals = [...signals]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, RECENT_SIGNALS_LIMIT);

  return (
    <section className="rounded-3xl border border-orange-100 bg-orange-50/60 p-6 shadow-card sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white shadow-control">
            <FlagIcon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-h2 text-slate-950">Mis señalizaciones</h2>
            <p className="mt-0.5 text-sm text-slate-500">Tus señalizaciones y su estado.</p>
          </div>
        </div>
        {!hasSignals && <ChevronRightIcon className="mt-2 h-4 w-4 shrink-0 text-slate-300" />}
      </div>

      {hasSignals ? (
        <div className="mt-4">
          <p className="text-sm font-semibold text-slate-700">
            {signals.length} {signals.length === 1 ? "señalización" : "señalizaciones"}
          </p>

          <ul className="mt-3 flex flex-col gap-2">
            {recentSignals.map((signal) => {
              const resolved = resolveSignal(signal.type);
              const SignalIcon = resolved.type
                ? SIGNAL_TYPE_ICONS[resolved.type]
                : UNKNOWN_SIGNAL_TYPE_ICON;
              return (
                <li
                  key={signal.id}
                  className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2.5 shadow-control"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-500">
                    <SignalIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {resolved.label}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {REPORT_STATUS_LABELS[signal.status]}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          <Link
            href="/reportes"
            className="mt-3 flex items-center justify-center gap-1 rounded-2xl py-1 text-sm font-semibold text-orange-600 transition hover:text-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
          >
            Ver todas
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white px-4 py-4 shadow-control">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-500">
            <ClipboardIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800">
              Todavía no creaste ninguna señalización
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Cuando crees una señalización, aparecerá acá el estado.
            </p>
          </div>
          <Link
            href="/reportar"
            className="inline-flex shrink-0 items-center gap-1 rounded-2xl py-1 text-sm font-semibold text-orange-600 transition hover:text-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
          >
            Crear señalización
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  );
}
