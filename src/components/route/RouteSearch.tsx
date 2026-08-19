"use client";

import { useEffect, useRef } from "react";
import PlaceSearchCombobox, {
  type PlaceSearchComboboxHandle,
} from "@/components/PlaceSearchCombobox";
import {
  BookmarkIcon,
  CheckCircleIcon,
  InfoIcon,
  LocateIcon,
  MapPinIcon,
  MicIcon,
  SparkleIcon,
} from "@/components/icons";
import type { GeoCoordinates, GeolocationStatus } from "@/hooks/useGeolocation";
import type { PlaceResult } from "@/hooks/usePlaceSearch";
import { useVoiceInput } from "@/hooks/useVoiceInput";

type RouteSearchProps = {
  origin: GeoCoordinates | null;
  locationStatus: GeolocationStatus;
  locationError: string | null;
  onUseCurrentLocation: () => void;
  destination: PlaceResult | null;
  onSelectDestination: (place: PlaceResult) => void;
  // Acción discreta "Guardados" (sección 3 del pedido): abre el panel de
  // trayectos guardados. Opcional para no romper otros usos futuros de
  // RouteSearch que no necesiten esta acción.
  onOpenSaved?: () => void;
};

export default function RouteSearch({
  origin,
  locationStatus,
  locationError,
  onUseCurrentLocation,
  destination,
  onSelectDestination,
  onOpenSaved,
}: RouteSearchProps) {
  const isLoadingLocation = locationStatus === "loading";
  const hasLocationError =
    locationStatus === "denied" ||
    locationStatus === "error" ||
    locationStatus === "unsupported";

  const destinationRef = useRef<PlaceSearchComboboxHandle>(null);

  // El resultado dictado se escribe en el mismo input de destino y dispara
  // exactamente el mismo camino que si se hubiese tecleado (setValue del
  // combobox llama a search()): el autocompletado sigue funcionando igual.
  const voice = useVoiceInput({
    onResult: (transcript) => {
      destinationRef.current?.setValue(transcript);
      destinationRef.current?.focus();
    },
  });

  // Un destino puede llegar de afuera sin pasar por este combobox (p.ej.
  // "Usar trayecto guardado" en RouteMapSection, que llama a setDestination
  // directo) — sincroniza el texto mostrado con `destination.id` para que
  // el campo nunca quede vacío mientras el checkmark de abajo dice
  // "Destino seleccionado". Sincroniza con una prop que cambió por una
  // acción externa a este input: no es derivable en render.
  useEffect(() => {
    if (destination) destinationRef.current?.setDisplayValue(destination.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reaccionar a un destino NUEVO (id), no a cada render con la misma referencia.
  }, [destination?.id]);

  return (
    <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-card sm:p-7">
      {onOpenSaved && (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={onOpenSaved}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-lime-300 hover:bg-lime-50 hover:text-lime-700 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400"
          >
            <BookmarkIcon className="h-3.5 w-3.5" />
            Guardados
          </button>
        </div>
      )}
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center pt-1.5">
          <MapPinIcon className="h-5 w-5 shrink-0 text-lime-500" />
          <span className="my-1 h-8 w-px border-l border-dashed border-slate-300" />
          <MapPinIcon className="h-5 w-5 shrink-0 text-violet-600" />
        </div>

        <div className="min-w-0 flex-1 divide-y divide-slate-100">
          <div className="flex items-center gap-3 pb-4">
            <div className="min-w-0 flex-1">
              <p className="text-label text-lime-600">
                Desde
              </p>
              <p className="flex items-center gap-1.5 truncate text-base font-medium text-slate-950">
                Mi ubicación actual
                {origin && (
                  <CheckCircleIcon className="h-4 w-4 shrink-0 text-lime-600" />
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={onUseCurrentLocation}
              disabled={isLoadingLocation}
              aria-label="Usar mi ubicación como origen"
              aria-busy={isLoadingLocation}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-control transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400 ${
                origin
                  ? "bg-slate-950 text-lime-400 hover:bg-slate-800"
                  : "bg-slate-100 text-slate-950 hover:bg-slate-200"
              }`}
            >
              <LocateIcon className={`h-5 w-5 ${isLoadingLocation ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <div className="min-w-0 flex-1">
              <p className="text-label text-violet-600">
                Hasta
              </p>
              <PlaceSearchCombobox
                ref={destinationRef}
                placeholder="¿A dónde querés ir?"
                onSelectPlace={onSelectDestination}
                color="violet"
                inputClassName="w-full bg-transparent text-base font-medium text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none"
              />
              {destination && (
                <p className="flex items-center gap-1.5 truncate text-xs text-violet-600">
                  <CheckCircleIcon className="h-3.5 w-3.5 shrink-0" />
                  Destino seleccionado
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={voice.toggle}
              aria-label={voice.isListening ? "Detener dictado" : "Buscar por voz"}
              aria-pressed={voice.isListening}
              className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-control transition active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${
                voice.isListening
                  ? "bg-violet-600 text-white"
                  : "bg-violet-50 text-violet-600 hover:bg-violet-100"
              }`}
            >
              <MicIcon className="h-5 w-5" />
              {voice.isListening && (
                <span
                  aria-hidden="true"
                  className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500"
                />
              )}
              <span className="sr-only" role="status">
                {voice.isListening ? "Escuchando…" : ""}
              </span>
            </button>
          </div>
        </div>
      </div>

      {voice.error && (
        <p className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
          <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          {voice.error}
        </p>
      )}

      {isLoadingLocation && (
        <p className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-lime-500" />
          Obteniendo tu ubicación…
        </p>
      )}

      {hasLocationError && locationError && (
        <p className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
          <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          {locationError}
        </p>
      )}

      <p className="mt-4 flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2.5 text-xs font-medium text-slate-600 sm:text-sm">
        <SparkleIcon className="h-3.5 w-3.5 shrink-0 text-lime-500" />
        Probá diciendo: &ldquo;Quiero ir al Hospital Central&rdquo;
      </p>
    </section>
  );
}
