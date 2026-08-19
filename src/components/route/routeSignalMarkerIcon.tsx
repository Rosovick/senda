import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { SIGNAL_TYPE_ICONS, UNKNOWN_SIGNAL_TYPE_ICON } from "@/components/signalTypeIcons";
import { REPORT_STATUS_LABELS, resolveSignal, type ReportStatus } from "@/lib/reports";
import type { SignalWithTrust } from "@/hooks/useSignals";

// Color del marcador = categoría (sección 14/17): SIEMPRE representa
// ayuda/obstáculo, nunca la confianza. Mismos tonos que ya usa /perfil y
// /reportar para AYUDA (verde/teal) y OBSTÁCULO (naranja).
const CATEGORY_MARKER_COLOR = {
  help: "#0c8a45",
  obstacle: "#f97316",
  unknown: "#52524c",
} as const;

// Indicador SECUNDARIO de estado (sección 17): un badge pequeño sobre el
// marcador, nunca el color principal. NEW y RESOLVED/WITHDRAWN no llevan
// badge (NEW es el estado por defecto; RESOLVED/WITHDRAWN ni siquiera
// llegan a dibujarse — ver routeSignalRelevance/MAP_VISIBLE_STATUSES).
const STATUS_INDICATOR: Partial<Record<ReportStatus, { background: string; label: string }>> = {
  confirmed: { background: "#0c8a45", label: "✓" },
  under_review: { background: "#f59e0b", label: "!" },
  possibly_resolved: { background: "#8a8a82", label: "?" },
};

// Atenuación visual por estado (sección 9): confirmada/nueva se ven
// normales, en revisión algo atenuada, posiblemente resuelta muy atenuada.
// Nunca cambia el color, solo la opacidad del marcador completo.
function opacityForStatus(status: ReportStatus): number {
  if (status === "possibly_resolved") return 0.5;
  if (status === "under_review") return 0.75;
  return 1;
}

// Convierte el ícono REAL de la señalización (el mismo componente React que
// usa /perfil, la card y el detalle) a un string SVG para poder incrustarlo
// en un marcador de Leaflet, que no renderiza React. Ningún ícono nuevo:
// se reutiliza exactamente SIGNAL_TYPE_ICONS/UNKNOWN_SIGNAL_TYPE_ICON.
export function buildRouteSignalMarkerIcon(
  signal: SignalWithTrust,
  isSelected: boolean
): L.DivIcon {
  const resolved = resolveSignal(signal.type);
  const Icon = resolved.type ? SIGNAL_TYPE_ICONS[resolved.type] : UNKNOWN_SIGNAL_TYPE_ICON;
  const color = CATEGORY_MARKER_COLOR[resolved.category ?? "unknown"];
  const indicator = STATUS_INDICATOR[signal.status];
  const opacity = opacityForStatus(signal.status);
  const size = isSelected ? 42 : 34;

  const iconSvg = renderToStaticMarkup(<Icon className="h-full w-full text-white" />);
  // Sección 72: nombre accesible directo sobre el marcador (no solo un
  // ícono de color) — "Bache o pozo, esperando confirmaciones."
  const accessibleLabel = `${resolved.label}, ${REPORT_STATUS_LABELS[signal.status].toLowerCase()}`;

  const html = `
    <span role="img" aria-label="${accessibleLabel.replace(/"/g, "&quot;")}" style="
      position:relative;display:flex;align-items:center;justify-content:center;
      width:${size}px;height:${size}px;border-radius:9999px;
      background:${color};border:3px solid white;opacity:${opacity};
      box-shadow:0 2px 8px rgba(15,23,42,0.35)${
        isSelected ? ",0 0 0 4px rgba(20,184,92,0.4)" : ""
      };
    ">
      <span style="width:58%;height:58%;display:flex;">${iconSvg}</span>
      ${
        indicator
          ? `<span aria-hidden="true" style="
              position:absolute;bottom:-2px;right:-2px;width:16px;height:16px;border-radius:9999px;
              background:${indicator.background};border:2px solid white;display:flex;
              align-items:center;justify-content:center;font-size:10px;font-weight:700;
              color:white;line-height:1;
            ">${indicator.label}</span>`
          : ""
      }
    </span>
  `;

  return L.divIcon({
    className: "",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
