import type { ComponentType } from "react";
import type { SignalType } from "@/lib/reports";

type IconProps = {
  className?: string;
};

// Set de pictogramas EXCLUSIVO del paso "Detalles" de Crear señalización,
// construido para reproducir fielmente
// /public/crear-senalizacion-detalles-reference.png. Deliberadamente
// separado de SIGNAL_TYPE_ICONS (components/signalTypeIcons.tsx): esos
// íconos se comparten con /perfil, las cards de /reportes, los popups y
// markers del mapa y ConfirmStep — cambiarlos ahí afectaría pantallas fuera
// del alcance de este rediseño. Estos son locales a este paso únicamente.

function RampAccessDetailIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M2 20h5l8.5-11.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 20h20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="14.5" cy="4.3" r="1.6" fill="currentColor" />
      <path d="M14.5 7v4h4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.5 11l-2.3 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="16.8" cy="15.5" r="4.3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16.8" cy="15.5" r="0.9" fill="currentColor" />
    </svg>
  );
}

function SafeCrossingDetailIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="15" cy="4.3" r="1.6" fill="currentColor" />
      <path d="M15 6.8v4.2l-3 5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 11l3 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 8.3l3.2-1.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M15 9.5l-3-.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M2 19.3h3.3M5.6 17.6h3.3M9.2 15.9h3.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function TrafficLightThreeDots({ className, extra }: IconProps & { extra?: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="8.5" y="3" width="7" height="17" rx="3.2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="7.3" r="1.3" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="11.5" r="1.3" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="15.7" r="1.3" stroke="currentColor" strokeWidth="1.4" />
      {extra}
    </svg>
  );
}

function TrafficLightCrossingDetailIcon({ className }: IconProps) {
  return <TrafficLightThreeDots className={className} />;
}

function AudibleTrafficLightDetailIcon({ className }: IconProps) {
  return (
    <TrafficLightThreeDots
      className={className}
      extra={
        <path
          d="M17.3 8.3a4.6 4.6 0 0 1 0 6.4M19.8 6.2a8 8 0 0 1 0 10.6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      }
    />
  );
}

function NoTrafficLightCrossingDetailIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="8.5" y="3" width="7" height="17" rx="3.2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="7.3" r="1.3" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="11.5" r="1.3" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="15.7" r="1.3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4 4l16 16" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}

// Sección 15: patrón de grietas ramificadas (no una simple línea quebrada ni
// una grieta diminuta) para que se reconozca de inmediato como pavimento
// agrietado.
function CrackedSidewalkDetailIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M3.5 19.5L9 13.5 7.3 10.3 13 7 11.5 3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 13.5l6.5 2 4.5-3.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M7.3 10.3L3 8.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M13 7l4.5-1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function StairsDetailIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 20v-4h4v-4h4v-4h4V4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4 20h4v-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NarrowPathDetailIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M1.5 12h3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M3.3 9.8L5.8 12l-2.5 2.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 5.5q3.2 6.5 0 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M15 5.5q-3.2 6.5 0 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M22.5 12h-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M20.7 9.8L18.2 12l2.5 2.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SteepSlopeDetailIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M3 19h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M4 19L17 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M17 6h-4M17 6v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Sección 19: silueta orgánica irregular (nunca un círculo perfecto), vista
// desde arriba — distinta de la grieta de "Vereda en mal estado".
function PotholeDetailIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 13c-.2-1.7 1.7-2.8 3.6-3.1.9-1.2 3.4-1.9 5.4-1.3 2.4-.6 5 .3 5.7 1.9 1.3.6 1.6 2 .5 2.9.2 1.5-1.8 2.4-3.6 2.3-1.3 1.1-4.2 1.2-5.9.2-2.3.2-5.4-.9-5.7-2.9z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ObstructedSidewalkDetailIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="8" width="18" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M4.5 13l3-5M9.5 13l3-5M14.5 13l3-5M19 13l1.3-2.2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.65"
      />
      <path d="M6 13v6M18 13v6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M4 19h4M16 19h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ConstructionConeDetailIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 3l4.5 15h-9L12 3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9.3 11.5h5.4M8.4 15h7.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <rect x="4.5" y="18" width="15" height="3" rx="1" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

// Badge "OBSTÁCULO DE ACCESIBILIDAD": círculo sólido con "!", no una
// reinterpretación con AlertTriangleIcon (que es un triángulo distinto en
// la referencia).
export function ExclamationBadgeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 5.5v9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="12" cy="18" r="1.4" fill="currentColor" />
    </svg>
  );
}

// Botón "Elegir de galería": cuadrado sólido con montaña + sol en negativo,
// distinto del ícono de "subir archivo" (flecha hacia una bandeja) que se
// usa en otras pantallas.
export function GalleryPhotoIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="4" fill="currentColor" />
      <circle cx="9" cy="10" r="1.6" fill="white" />
      <path
        d="M4.5 17.5l5-5.5 3.8 4 2.3-2.7 4 4.4"
        stroke="white"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export const SIGNAL_DETAIL_ICONS: Record<SignalType, ComponentType<IconProps>> = {
  rampsRequired: RampAccessDetailIcon,
  prioritizeSafeCrossings: SafeCrossingDetailIcon,
  trafficLightCrossings: TrafficLightCrossingDetailIcon,
  audibleTrafficLights: AudibleTrafficLightDetailIcon,
  avoidBadSidewalks: CrackedSidewalkDetailIcon,
  avoidStairs: StairsDetailIcon,
  avoidNarrowPaths: NarrowPathDetailIcon,
  avoidSteepSlopes: SteepSlopeDetailIcon,
  potholes: PotholeDetailIcon,
  obstructedSidewalks: ObstructedSidewalkDetailIcon,
  constructionZones: ConstructionConeDetailIcon,
  crossingsWithoutTrafficLights: NoTrafficLightCrossingDetailIcon,
};
