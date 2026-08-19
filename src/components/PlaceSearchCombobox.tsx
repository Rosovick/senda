"use client";

import { forwardRef, useId, useImperativeHandle, useRef, useState } from "react";
import { CheckCircleIcon, ChevronRightIcon, InfoIcon, MapPinIcon } from "@/components/icons";
import { usePlaceSearch, type PlaceResult } from "@/hooks/usePlaceSearch";

type PlaceSearchComboboxProps = {
  placeholder: string;
  onSelectPlace: (place: PlaceResult) => void;
  inputClassName?: string;
  /** Color de acento del panel de sugerencias. "teal" por defecto. */
  color?: "teal" | "violet";
  /** Acción extra mostrada cuando no se encuentran resultados (por ejemplo,
   * "Marcar en el mapa" en /reportar). Opcional: no todas las pantallas
   * tienen una alternativa manual. */
  emptyStateAction?: { label: string; onClick: () => void };
};

// API imperativa mínima, opcional: permite que un control EXTERNO al
// combobox (por ejemplo, un botón de dictado por voz ubicado al lado)
// escriba en el input reutilizando el mismo camino interno que usa cada
// tecla (setQuery + search), en vez de duplicar la lógica de búsqueda.
export type PlaceSearchComboboxHandle = {
  setValue: (text: string) => void;
  // A diferencia de setValue, NO dispara una búsqueda nueva: solo
  // sincroniza el texto mostrado con un lugar que ya se seleccionó por otra
  // vía (p.ej. "Usar trayecto guardado" en /ruta) — nunca reabre el panel
  // de sugerencias para algo que el usuario no está tipeando.
  setDisplayValue: (text: string) => void;
  focus: () => void;
};

const ACCENTS = {
  teal: {
    active: "bg-teal-50",
    pin: "text-teal-600",
    spinner: "border-t-teal-600",
    link: "text-teal-700 hover:text-teal-800",
  },
  violet: {
    active: "bg-violet-50",
    pin: "text-violet-600",
    spinner: "border-t-violet-600",
    link: "text-violet-700 hover:text-violet-800",
  },
} as const;

// Combobox de búsqueda de lugares reutilizable en toda la app (/ruta,
// /reportar, /reportes): envuelve usePlaceSearch (autocompletado con
// debounce + búsqueda inmediata por Enter) y toda la interacción de
// teclado/ARIA en un solo lugar, para que ninguna pantalla la reimplemente.
const PlaceSearchCombobox = forwardRef<PlaceSearchComboboxHandle, PlaceSearchComboboxProps>(
  function PlaceSearchCombobox(
    { placeholder, onSelectPlace, inputClassName, color = "teal", emptyStateAction },
    ref
  ) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const { results, status, errorMessage, search, searchNow, reset } = usePlaceSearch();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const accent = ACCENTS[color];
  const isPanelOpen = status !== "idle";
  const activeOptionId =
    activeIndex >= 0 && results[activeIndex] ? `${listboxId}-option-${activeIndex}` : undefined;

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setQuery(value);
    setActiveIndex(-1);
    search(value);
  }

  // Mismo camino que handleChange: quien dicta por voz no se salta la
  // lógica normal del campo, solo reemplaza la forma de escribir el texto.
  useImperativeHandle(
    ref,
    () => ({
      setValue: (text: string) => {
        setQuery(text);
        setActiveIndex(-1);
        search(text);
      },
      setDisplayValue: (text: string) => {
        setQuery(text);
        setActiveIndex(-1);
        reset();
      },
      focus: () => inputRef.current?.focus(),
    }),
    [search, reset]
  );

  function selectPlace(place: PlaceResult) {
    setQuery(place.name);
    setActiveIndex(-1);
    reset();
    onSelectPlace(place);
  }

  function handleRetry() {
    setQuery("");
    reset();
    inputRef.current?.focus();
  }

  async function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      if (!isPanelOpen || results.length === 0) return;
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
      return;
    }

    if (event.key === "ArrowUp") {
      if (!isPanelOpen || results.length === 0) return;
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1));
      return;
    }

    if (event.key === "Escape") {
      reset();
      setActiveIndex(-1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      // Con una sugerencia resaltada, Enter la selecciona (igual que antes).
      if (activeIndex >= 0 && activeIndex < results.length) {
        selectPlace(results[activeIndex]);
        return;
      }

      // Sin sugerencia resaltada: buscar el texto completo escrito, sin
      // depender de que haya aparecido en el autocompletado.
      const found = await searchNow(query);
      if (found.length === 1) {
        // Coincidencia única: la confirmamos directamente (el mapa la
        // muestra para que la persona la verifique visualmente).
        selectPlace(found[0]);
      }
      // Si hay varias, el mismo panel de resultados ya quedó actualizado
      // para que la persona elija. Si no hay ninguna, el estado "empty" ya
      // muestra el mensaje correspondiente.
    }
  }

  function handleBlur() {
    window.setTimeout(reset, 100);
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={isPanelOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeOptionId}
        autoComplete="off"
        className={
          inputClassName ??
          "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-inset-control transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
        }
      />

      {isPanelOpen && (
        // z-30 alcanza porque cada mapa de SENDA (AccessibleMap/ReportsMap/
        // MapPickerMap) ahora tiene su propio z-0 + stacking context: los
        // panes internos de Leaflet (z-index hasta ~1000) quedan contenidos
        // ahí adentro y no compiten contra este dropdown.
        <div className="absolute inset-x-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-slate-200/70 bg-white shadow-hero">
          {status === "searching" && (
            <p className="flex items-center gap-2 px-4 py-3 text-sm text-slate-500">
              <span
                className={`h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 ${accent.spinner}`}
              />
              Buscando…
            </p>
          )}

          {status === "empty" && (
            <div className="px-4 py-3">
              <p className="flex items-start gap-2 text-sm text-slate-600">
                <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                No encontramos esa dirección.
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={handleRetry}
                  className={`text-xs font-semibold ${accent.link}`}
                >
                  Intentar otra búsqueda
                </button>
                {emptyStateAction && (
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={emptyStateAction.onClick}
                    className={`text-xs font-semibold ${accent.link}`}
                  >
                    {emptyStateAction.label}
                  </button>
                )}
              </div>
            </div>
          )}

          {status === "error" && errorMessage && (
            <div className="px-4 py-3">
              <p className="flex items-start gap-2 text-sm text-amber-800">
                <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                {errorMessage}
              </p>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={handleRetry}
                className={`mt-2 text-xs font-semibold ${accent.link}`}
              >
                Intentar otra búsqueda
              </button>
            </div>
          )}

          {status === "success" && (
            <ul id={listboxId} role="listbox" aria-label="Resultados de búsqueda">
              {results.map((place, index) => {
                const optionId = `${listboxId}-option-${index}`;
                const isActive = index === activeIndex;
                return (
                  <li key={place.id} role="presentation">
                    <button
                      type="button"
                      id={optionId}
                      role="option"
                      aria-selected={isActive}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectPlace(place)}
                      className={`flex w-full items-start gap-2 px-4 py-3 text-left transition ${
                        isActive ? accent.active : "hover:bg-slate-50"
                      }`}
                    >
                      <MapPinIcon className={`mt-0.5 h-4 w-4 shrink-0 ${accent.pin}`} />
                      <span className="min-w-0">
                        <span
                          className={`block truncate text-sm text-slate-900 ${
                            isActive ? "font-semibold" : "font-medium"
                          }`}
                        >
                          {place.name}
                        </span>
                        {place.address && (
                          <span className="block truncate text-xs text-slate-500">
                            {place.address}
                          </span>
                        )}
                      </span>
                      {isActive ? (
                        <CheckCircleIcon className={`ml-auto mt-0.5 h-4 w-4 shrink-0 ${accent.pin}`} />
                      ) : (
                        <ChevronRightIcon className="ml-auto mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                      )}
                    </button>
                  </li>
                );
              })}
              <li className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">
                Resultados de OpenStreetMap
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
  }
);

export default PlaceSearchCombobox;
