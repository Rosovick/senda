import { ClockIcon, DistanceIcon, InfoIcon, SendIcon } from "@/components/icons";
import { SIGNAL_TYPE_ICONS, UNKNOWN_SIGNAL_TYPE_ICON } from "@/components/signalTypeIcons";
import type { SignalAlert } from "@/hooks/useRouteNavigation";
import type { useRouteNavigation } from "@/hooks/useRouteNavigation";
import {
  REPORT_STATUS_ICONS,
  REPORT_STATUS_LABELS,
  resolveSignal,
  SIGNAL_CATEGORY_ICON_CLASSNAMES,
} from "@/lib/reports";
import { formatDistance, formatDuration } from "@/lib/routing";

type NavigationState = ReturnType<typeof useRouteNavigation>;

type NavigationPanelProps = {
  navigation: NavigationState;
};

// Reemplaza a RouteSummary mientras hay navegación activa (sección 45):
// instrucción actual, progreso, avisos de GPS y de señalizaciones próximas.
// Nunca inventa distancia/duración/instrucción — todo sale de
// useRouteNavigation, que a su vez deriva todo de la respuesta real del
// motor de rutas.
export default function NavigationPanel({ navigation }: NavigationPanelProps) {
  return (
    <section
      className="rounded-3xl border border-teal-100 bg-teal-50/60 p-6 shadow-card sm:p-7"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-teal-700">
        <SendIcon className="h-4 w-4" />
        Navegación activa
      </div>

      {navigation.hasArrived ? (
        <p className="mt-3 text-lg font-bold text-teal-800">Llegaste a tu destino.</p>
      ) : navigation.isRecalculating ? (
        <p className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-600">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-teal-600" />
          Recalculando ruta…
        </p>
      ) : navigation.currentStep ? (
        <p className="mt-3 text-lg font-bold leading-snug text-slate-900">
          {navigation.currentStep.instruction}
        </p>
      ) : (
        <p className="mt-3 text-sm text-slate-500">Seguí el recorrido marcado en el mapa.</p>
      )}

      {!navigation.hasArrived &&
        (navigation.remainingDistanceMeters !== null ||
          navigation.remainingDurationSeconds !== null) && (
          <div className="mt-4 grid grid-cols-2 gap-3 border-y border-teal-100 py-3 text-center">
            {navigation.remainingDurationSeconds !== null && (
              <div className="flex flex-col items-center gap-1">
                <ClockIcon className="h-4 w-4 text-teal-600" />
                <p className="text-sm font-bold text-slate-900">
                  {formatDuration(navigation.remainingDurationSeconds)}
                </p>
                <p className="text-[11px] text-slate-500">Tiempo restante</p>
              </div>
            )}
            {navigation.remainingDistanceMeters !== null && (
              <div className="flex flex-col items-center gap-1">
                <DistanceIcon className="h-4 w-4 text-teal-600" />
                <p className="text-sm font-bold text-slate-900">
                  {formatDistance(navigation.remainingDistanceMeters)}
                </p>
                <p className="text-[11px] text-slate-500">Distancia restante</p>
              </div>
            )}
          </div>
        )}

      {navigation.gpsMessage && (
        <p className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
          <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          {navigation.gpsMessage}
        </p>
      )}

      {navigation.activeSignalAlert && <SignalAlertBanner alert={navigation.activeSignalAlert} />}
    </section>
  );
}

// Sección 50/51: aviso discreto, nunca presenta incertidumbre como certeza
// — siempre muestra el estado real (Esperando confirmaciones/Confirmada/
// etc.), nunca afirma "hay un pozo adelante" como si fuera un hecho.
function SignalAlertBanner({ alert }: { alert: SignalAlert }) {
  const resolved = resolveSignal(alert.signal.type);
  const Icon = resolved.type ? SIGNAL_TYPE_ICONS[resolved.type] : UNKNOWN_SIGNAL_TYPE_ICON;
  const badgeCategory = resolved.category ?? "unknown";
  const roundedDistance = Math.max(10, Math.round(alert.distanceMeters / 10) * 10);
  const StatusIcon = REPORT_STATUS_ICONS[alert.signal.status];

  return (
    <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-control">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${SIGNAL_CATEGORY_ICON_CLASSNAMES[badgeCategory]}`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800">
          {resolved.label} a {roundedDistance} m
        </p>
        <p className="flex items-center gap-1 text-xs text-slate-500">
          <StatusIcon className="h-3 w-3 shrink-0" />
          {REPORT_STATUS_LABELS[alert.signal.status]}
        </p>
      </div>
    </div>
  );
}
