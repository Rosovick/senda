type IllustrationProps = {
  className?: string;
};

type CityBlock = { x: number; y: number; w: number; h: number; o: number };

const CITY_BLOCKS: CityBlock[] = [
  { x: -6, y: 186, w: 16, h: 11, o: 0.85 },
  { x: 18, y: 182, w: 16, h: 12, o: 0.9 },
  { x: 40, y: 178, w: 20, h: 15, o: 0.95 },
  { x: 68, y: 162, w: 18, h: 24, o: 0.9 },
  { x: 26, y: 142, w: 18, h: 18, o: 0.75 },
  { x: 4, y: 168, w: 14, h: 14, o: 0.8 },
  { x: 96, y: 178, w: 24, h: 13, o: 0.95 },
  { x: 60, y: 136, w: 16, h: 16, o: 0.65 },
  { x: 122, y: 144, w: 18, h: 30, o: 0.85 },
  { x: 152, y: 170, w: 22, h: 17, o: 0.9 },
  { x: 8, y: 150, w: 13, h: 13, o: 0.6 },
  { x: 44, y: 110, w: 16, h: 20, o: 0.62 },
  { x: 84, y: 106, w: 18, h: 17, o: 0.58 },
  { x: 100, y: 140, w: 14, h: 15, o: 0.52 },
  { x: 142, y: 118, w: 16, h: 23, o: 0.68 },
  { x: 172, y: 134, w: 18, h: 19, o: 0.72 },
  { x: 196, y: 158, w: 16, h: 16, o: 0.78 },
  { x: 176, y: 88, w: 15, h: 15, o: 0.5 },
  { x: 24, y: 98, w: 12, h: 12, o: 0.42 },
  { x: 118, y: 88, w: 13, h: 13, o: 0.44 },
  { x: 150, y: 100, w: 14, h: 14, o: 0.46 },
  { x: 66, y: 80, w: 12, h: 12, o: 0.36 },
  { x: 204, y: 118, w: 13, h: 13, o: 0.5 },
  { x: 214, y: 156, w: 14, h: 15, o: 0.6 },
  { x: 6, y: 122, w: 11, h: 11, o: 0.38 },
  { x: 38, y: 90, w: 11, h: 11, o: 0.32 },
  { x: 92, y: 74, w: 11, h: 11, o: 0.3 },
  { x: 132, y: 82, w: 11, h: 11, o: 0.32 },
  { x: 162, y: 100, w: 12, h: 12, o: 0.36 },
  { x: 108, y: 162, w: 14, h: 12, o: 0.7 },
  { x: 156, y: 64, w: 10, h: 10, o: 0.3 },
  { x: 182, y: 50, w: 10, h: 10, o: 0.32 },
  { x: 208, y: 74, w: 11, h: 11, o: 0.4 },
  { x: 130, y: 58, w: 10, h: 10, o: 0.26 },
  { x: 74, y: 56, w: 10, h: 10, o: 0.24 },
  { x: 46, y: 68, w: 10, h: 10, o: 0.26 },
  { x: 14, y: 100, w: 10, h: 10, o: 0.3 },
  { x: 188, y: 128, w: 10, h: 12, o: 0.55 },
  { x: 78, y: 130, w: 12, h: 13, o: 0.5 },
  { x: -2, y: 140, w: 11, h: 11, o: 0.45 },
];

// Bloque pseudo-isométrico (base romboidal + 2 caras + techo) construido con
// polígonos simples: no busca un render 3D real, solo la silueta de "ciudad
// oscura vista en isométrico" del mockup de referencia de Inicio.
function CityBlockShape({ block }: { block: CityBlock }) {
  const { x, y, w, h, o } = block;
  const hw = w / 2;
  const bottom: [number, number] = [x, y];
  const right: [number, number] = [x + w, y - hw];
  const top: [number, number] = [x, y - w];
  const left: [number, number] = [x - w, y - hw];
  const lift = (p: [number, number]): [number, number] => [p[0], p[1] - h];
  const pts = (arr: [number, number][]) => arr.map((p) => p.join(",")).join(" ");

  return (
    <g opacity={o}>
      <polygon points={pts([bottom, right, lift(right), lift(bottom)])} fill="#1c2023" />
      <polygon points={pts([bottom, left, lift(left), lift(bottom)])} fill="#111315" />
      <polygon points={pts([lift(bottom), lift(right), lift(top), lift(left)])} fill="#282d31" />
    </g>
  );
}

// Escena de la card "Buscar una ruta accesible" en Inicio: ciudad oscura en
// isométrico con una ruta lima brillante entre un origen y un destino. Uso
// exclusivo de esa card (mockup senda-home-reference.png).
export function RouteMapScene({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 220 200"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
    >
      <rect x="0" y="0" width="220" height="200" fill="#0B0C0E" />
      <ellipse cx="150" cy="70" rx="90" ry="70" fill="#B7ED16" opacity="0.06" style={{ filter: "blur(10px)" }} />

      <g>
        {CITY_BLOCKS.map((block, index) => (
          <CityBlockShape key={index} block={block} />
        ))}
      </g>

      <path
        d="M24 174 C 64 174, 70 132, 98 120 S 150 96, 152 62 S 178 32, 196 22"
        stroke="#B7ED16"
        strokeWidth="14"
        strokeLinecap="round"
        opacity="0.16"
        style={{ filter: "blur(7px)" }}
      />
      <path
        d="M24 174 C 64 174, 70 132, 98 120 S 150 96, 152 62 S 178 32, 196 22"
        stroke="#B7ED16"
        strokeWidth="4.5"
        strokeLinecap="round"
      />

      <ellipse cx="24" cy="180" rx="15" ry="4.5" fill="#B7ED16" opacity="0.25" />
      <circle cx="24" cy="174" r="8" fill="#B7ED16" />
      <circle cx="24" cy="174" r="3" fill="#0B0C0E" />

      <path
        d="M196 4c-8.8 0-16 7.2-16 16 0 12 16 27.5 16 27.5s16-15.5 16-27.5c0-8.8-7.2-16-16-16z"
        fill="#B7ED16"
      />
      <circle cx="196" cy="20" r="6" fill="#0B0C0E" />
    </svg>
  );
}

// Escena de la card "Crear una señalización" en Inicio: panel de alerta
// violeta sobre un pie, con un pin de ubicación al costado. Uso exclusivo de
// esa card (mockup senda-home-reference.png). El botón "+" es un elemento
// real aparte (no forma parte de esta ilustración).
export function SignalReportScene({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 220 180"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
    >
      <rect x="0" y="0" width="220" height="180" fill="#0B0C0E" />
      <ellipse cx="120" cy="90" rx="100" ry="80" fill="#7C3AED" opacity="0.08" style={{ filter: "blur(12px)" }} />

      {/* Panel/tablet oscuro de fondo: arriba a la derecha, sin invadir la
          zona inferior donde se posiciona el pin ni la esquina donde va el
          botón real "+". */}
      <rect x="126" y="18" width="84" height="84" rx="16" fill="#141619" stroke="#2a2d32" strokeWidth="2" />
      <rect x="138" y="30" width="60" height="60" rx="6" fill="#1c1f24" />
      <rect x="138" y="30" width="60" height="60" rx="6" fill="url(#signal-panel-sheen)" opacity="0.7" />
      <path
        d="M144 78l11-14 10 9 12-17 17 22"
        stroke="#3d434b"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Pie / soporte del cartel: poste delgado + base chica */}
      <ellipse cx="58" cy="160" rx="20" ry="5" fill="#000000" opacity="0.35" />
      <rect x="54" y="116" width="8" height="44" rx="3" fill="#1d2024" />
      <rect x="42" y="155" width="32" height="7" rx="3.5" fill="#111316" />

      {/* Cartel de alerta violeta */}
      <g transform="rotate(-6 58 82)">
        <rect x="14" y="34" width="88" height="88" rx="20" fill="#6D28D9" />
        <rect x="14" y="34" width="88" height="88" rx="20" fill="url(#signal-sheen)" opacity="0.55" />
        <rect x="14" y="34" width="88" height="88" rx="20" fill="none" stroke="#a78bfa" strokeOpacity="0.25" strokeWidth="1.5" />
        <rect x="52" y="58" width="9" height="38" rx="4.5" fill="white" />
        <circle cx="56.5" cy="108" r="5.5" fill="white" />
      </g>

      {/* Pin de ubicación violeta: debajo del panel, sin superponerse. */}
      <g transform="translate(146 106)">
        <ellipse cx="18" cy="46" rx="14" ry="4" fill="#000000" opacity="0.3" />
        <path
          d="M18 2C7.5 2 0 10 0 20c0 14 18 30 18 30s18-16 18-30C36 10 28.5 2 18 2z"
          fill="#8B5CF6"
        />
        <path
          d="M18 2C7.5 2 0 10 0 20c0 14 18 30 18 30s18-16 18-30C36 10 28.5 2 18 2z"
          fill="url(#signal-pin-sheen)"
          opacity="0.5"
        />
        <circle cx="18" cy="20" r="7.5" fill="white" />
      </g>

      <defs>
        <linearGradient id="signal-sheen" x1="22" y1="34" x2="110" y2="122" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.22" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="signal-panel-sheen" x1="133" y1="33" x2="203" y2="115" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.08" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="signal-pin-sheen" x1="0" y1="2" x2="40" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.3" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function RouteIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 160 120" fill="none" className={className} aria-hidden="true">
      <g opacity="0.35" fill="currentColor">
        <rect x="14" y="46" width="16" height="46" rx="2" />
        <rect x="36" y="30" width="14" height="62" rx="2" />
        <rect x="118" y="34" width="16" height="58" rx="2" />
        <rect x="138" y="50" width="12" height="42" rx="2" />
      </g>
      <path
        d="M20 100 C 55 100, 55 65, 80 65 S 110 40, 132 40"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
        opacity="0.45"
      />
      <path
        d="M20 100 C 55 100, 55 65, 80 65 S 110 40, 132 40"
        stroke="white"
        strokeWidth="2"
        strokeDasharray="1 9"
        strokeLinecap="round"
      />
      <circle cx="132" cy="40" r="8" fill="currentColor" />
      <circle cx="132" cy="40" r="3" fill="white" />
    </svg>
  );
}

export function BarrierIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 160 120" fill="none" className={className} aria-hidden="true">
      <path
        d="M45 100 L60 60 M115 100 L100 60"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.55"
      />
      <g transform="rotate(-4 80 59)">
        <rect
          x="35"
          y="48"
          width="90"
          height="22"
          rx="5"
          fill="white"
          stroke="currentColor"
          strokeWidth="3"
        />
        <rect x="38" y="50" width="16" height="18" rx="2" fill="currentColor" opacity="0.85" />
        <rect x="72" y="50" width="16" height="18" rx="2" fill="currentColor" opacity="0.85" />
        <rect x="106" y="50" width="16" height="18" rx="2" fill="currentColor" opacity="0.85" />
      </g>
      <path
        d="M80 78 L98 108 L62 108 Z"
        fill="white"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M80 89v9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="80" cy="101.5" r="1.7" fill="currentColor" />
    </svg>
  );
}

export function EmptyReportsIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 160 120" fill="none" className={className} aria-hidden="true">
      <g opacity="0.3" fill="currentColor">
        <rect x="66" y="42" width="16" height="48" rx="2" />
        <rect x="86" y="32" width="14" height="58" rx="2" />
      </g>
      <circle cx="36" cy="56" r="14" fill="currentColor" opacity="0.22" />
      <path d="M36 62v28" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
      <circle cx="122" cy="50" r="12" fill="currentColor" opacity="0.22" />
      <path d="M122 55v33" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
      <path
        d="M54 96h52M60 96v8M106 96v8M60 89h46"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.45"
      />
      <rect x="66" y="8" width="26" height="19" rx="4" stroke="currentColor" strokeWidth="2" />
      <path d="M74 27l5 6 5-6" fill="currentColor" opacity="0.9" />
      <path d="M79 13.5v6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="79" cy="23.5" r="1.1" fill="currentColor" />
    </svg>
  );
}
