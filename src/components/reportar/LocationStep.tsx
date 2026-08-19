"use client";

import { useState } from "react";
import PlaceSearchCombobox from "@/components/PlaceSearchCombobox";
import { InfoIcon, LocateIcon, MapPinIcon, SearchIcon } from "@/components/icons";
import { useGeolocation } from "@/hooks/useGeolocation";
import type { PlaceResult } from "@/hooks/usePlaceSearch";
import { reverseGeocode } from "@/lib/geocoding";
import type { LocationMethod, ReportDraft } from "./types";
import MapPickerMap from "./MapPickerMap";

type LocationStepProps = {
  draft: ReportDraft;
  onNext: (patch: Pick<ReportDraft, "latitude" | "longitude" | "address" | "locationMethod">) => void;
};

const METHODS: { key: LocationMethod; label: string; subtitle: string; icon: typeof LocateIcon }[] = [
  { key: "current", label: "Mi ubicación", subtitle: "Usar ubicación actual", icon: LocateIcon },
  { key: "search", label: "Buscar dirección", subtitle: "Escribir o buscar", icon: SearchIcon },
  { key: "map", label: "Marcar en mapa", subtitle: "Elegir en el mapa", icon: MapPinIcon },
];

// Reutiliza useGeolocation (misma implementación que /ruta) y el combobox de
// búsqueda compartido: no hay una segunda geolocalización ni una segunda API
// de geocodificación acá.
export default function LocationStep({ draft, onNext }: LocationStepProps) {
  const [activeMethod, setActiveMethod] = useState<LocationMethod | null>(draft.locationMethod);
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(
    draft.latitude !== null && draft.longitude !== null
      ? { lat: draft.latitude, lng: draft.longitude }
      : null
  );
  const [address, setAddress] = useState<string | null>(draft.address);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [focusToken, setFocusToken] = useState(0);

  const { status: geoStatus, errorMessage: geoError, requestLocation } = useGeolocation();

  async function resolveAddress(lat: number, lng: number, knownAddress?: string) {
    if (knownAddress) {
      setAddress(knownAddress);
      return;
    }
    setIsResolvingAddress(true);
    const resolved = await reverseGeocode(lat, lng);
    setAddress(resolved);
    setIsResolvingAddress(false);
  }

  async function handleUseCurrentLocation() {
    setActiveMethod("current");
    const result = await requestLocation();
    if (result) {
      setPoint(result);
      setFocusToken((token) => token + 1);
      await resolveAddress(result.lat, result.lng);
    }
  }

  function handleSelectSearchPlace(place: PlaceResult) {
    setActiveMethod("search");
    setPoint({ lat: place.lat, lng: place.lng });
    setFocusToken((token) => token + 1);
    void resolveAddress(
      place.lat,
      place.lng,
      place.address ? `${place.name}, ${place.address}` : place.name
    );
  }

  function handleMapClick(lat: number, lng: number) {
    setActiveMethod("map");
    setPoint({ lat, lng });
    void resolveAddress(lat, lng);
  }

  function handleChangeLocation() {
    setActiveMethod(null);
    setPoint(null);
    setAddress(null);
  }

  function handleNext() {
    if (!point) return;
    onNext({
      latitude: point.lat,
      longitude: point.lng,
      address,
      locationMethod: activeMethod,
    });
  }

  return (
    <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-card sm:p-7">
      <h2 className="text-h2 text-slate-950">¿Dónde está la barrera?</h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {METHODS.map(({ key, label, subtitle, icon: Icon }) => {
          const isActive = activeMethod === key;
          return (
            <button
              key={key}
              type="button"
              onClick={key === "current" ? handleUseCurrentLocation : () => setActiveMethod(key)}
              aria-pressed={isActive}
              disabled={key === "current" && geoStatus === "loading"}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border px-4 py-4 text-center shadow-control transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
                isActive
                  ? "border-teal-400 bg-teal-50"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  isActive ? "bg-teal-600 text-white shadow-control" : "bg-slate-100 text-slate-500"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${
                    key === "current" && geoStatus === "loading" ? "animate-spin" : ""
                  }`}
                />
              </span>
              <span className="text-sm font-semibold text-slate-800">{label}</span>
              <span className="text-xs text-slate-500">{subtitle}</span>
            </button>
          );
        })}
      </div>

      {activeMethod === "current" && geoStatus === "loading" && (
        <p className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-500">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-teal-600" />
          Obteniendo tu ubicación…
        </p>
      )}

      {activeMethod === "current" &&
        (geoStatus === "denied" || geoStatus === "error" || geoStatus === "unsupported") &&
        geoError && (
          <p className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
            <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            {geoError}
          </p>
        )}

      {activeMethod === "search" && (
        <div className="mt-4">
          <PlaceSearchCombobox
            placeholder="Escribir dirección o lugar"
            onSelectPlace={handleSelectSearchPlace}
            emptyStateAction={{
              label: "Marcar en el mapa",
              onClick: () => setActiveMethod("map"),
            }}
          />
        </div>
      )}

      {activeMethod === "map" && !point && (
        <p className="mt-3 text-xs font-medium text-slate-500">
          Tocá el mapa para marcar el punto exacto.
        </p>
      )}

      <div className="mt-4">
        <MapPickerMap point={point} focusToken={focusToken} onMapClick={handleMapClick} />
      </div>

      {point && (
        <div className="mt-4 flex items-start justify-between gap-3 rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3">
          <div className="flex items-start gap-2 min-w-0">
            <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
            <div className="min-w-0">
              {activeMethod === "search" && !isResolvingAddress && (
                <p className="text-xs font-semibold text-teal-600">¿Es este el lugar?</p>
              )}
              {isResolvingAddress ? (
                <p className="text-sm text-teal-800">Buscando dirección…</p>
              ) : (
                <p className="text-sm font-medium text-teal-900">
                  {address ?? "Ubicación seleccionada"}
                </p>
              )}
              <p className="mt-0.5 text-xs text-teal-700">
                Lat {point.lat.toFixed(4)}, Long {point.lng.toFixed(4)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleChangeLocation}
            className="shrink-0 text-sm font-semibold text-teal-700 underline-offset-2 hover:underline"
          >
            Cambiar
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handleNext}
        disabled={!point}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-teal-500 px-6 py-4 text-base font-semibold text-slate-950 shadow-control transition hover:bg-teal-400 hover:shadow-card active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
      >
        Siguiente
      </button>
      {!point && (
        <p className="mt-2 text-center text-xs text-slate-400">
          Elegí una ubicación para continuar.
        </p>
      )}
    </section>
  );
}
