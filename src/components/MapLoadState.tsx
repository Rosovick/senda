"use client";

import { Component, type ReactNode } from "react";
import { RouteMapIcon } from "@/components/icons";

// "Cargando mapa…" es el fallback `loading` de `next/dynamic(() =>
// import(...), { ssr: false })` (usado por ReportsMap/MapPickerMap). Mientras
// esa promesa de import no resuelve ni rechaza, React sigue mostrando este
// fallback — es texto estático, sin timer propio.
export function MapLoadingFallback() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-lime-600 shadow-control">
        <RouteMapIcon className="h-7 w-7" />
      </span>
      <p className="mt-1 text-sm font-semibold text-slate-500">Cargando mapa…</p>
    </div>
  );
}

const IMPORT_TIMEOUT_MS = 10000;

// Cubre el caso en que el `import()` del mapa SÍ llega a ejecutarse pero
// tarda demasiado o termina rechazando: fuerza que, pasado un tiempo
// razonable, la promesa rechace igual que si el chunk hubiera fallado de
// verdad, para que `MapErrorBoundary` pueda mostrar su "Reintentar".
export function importMapWithTimeout<T>(loader: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(
        new Error(`El mapa tardó más de ${IMPORT_TIMEOUT_MS / 1000}s en cargar (import colgado).`)
      );
    }, IMPORT_TIMEOUT_MS);

    loader().then(
      (mod) => {
        window.clearTimeout(timeoutId);
        resolve(mod);
      },
      (error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

type MapErrorBoundaryState = { hasError: boolean };

// Si el mapa falla al cargar (chunk que no llega a descargarse, error de
// red, o el timeout de `importMapWithTimeout`), React lo propaga como un
// error de render. Sin este boundary, ese error no tiene dónde caer y la
// pantalla queda rota en vez de ofrecer una salida.
export class MapErrorBoundary extends Component<{ children: ReactNode }, MapErrorBoundaryState> {
  state: MapErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[SENDA] No se pudo cargar el mapa:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-control">
            <RouteMapIcon className="h-7 w-7" />
          </span>
          <p className="text-sm font-semibold text-slate-500">No pudimos cargar el mapa.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-1 rounded-full bg-lime-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-lime-300"
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
