"use client";

import PlaceSearchCombobox from "@/components/PlaceSearchCombobox";
import { SearchIcon } from "@/components/icons";
import type { PlaceResult } from "@/hooks/usePlaceSearch";

type ReportsSearchBarProps = {
  onSelectPlace: (place: PlaceResult) => void;
};

// Los filtros (Cerca de mí / Recientes / Confirmadas / Mis reportes) ya
// existen debajo del mapa: no hace falta un segundo control de filtros acá.
export default function ReportsSearchBar({ onSelectPlace }: ReportsSearchBarProps) {
  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-slate-400" />
      <PlaceSearchCombobox
        placeholder="Buscar dirección o lugar"
        onSelectPlace={onSelectPlace}
        inputClassName="w-full rounded-full border border-slate-200/70 bg-white py-3.5 pl-12 pr-4 text-base text-slate-900 shadow-control placeholder:text-slate-400 transition focus:border-lime-400 focus:outline-none focus:ring-2 focus:ring-lime-100"
      />
    </div>
  );
}
