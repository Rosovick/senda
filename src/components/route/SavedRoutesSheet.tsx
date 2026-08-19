"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookmarkIcon,
  CloseIcon,
  MapPinIcon,
  PencilIcon,
  SearchIcon,
  TrashIcon,
} from "@/components/icons";
import type { SavedRoute } from "@/hooks/useSavedRoutes";

export type SavedRoutesSheetProps = {
  open: boolean;
  savedRoutes: SavedRoute[];
  onClose: () => void;
  onUse: (route: SavedRoute) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
};

// Contenedor: solo decide si hay que mostrar el panel. Igual que
// SignalDetailSheet, el panel real se monta de cero cada vez que se abre
// (nunca persiste como el mismo componente entre aperturas), así el buscador
// arranca siempre vacío sin necesitar un efecto que lo resetee.
export default function SavedRoutesSheet({ open, ...panelProps }: SavedRoutesSheetProps) {
  if (!open) return null;
  return <SavedRoutesPanel {...panelProps} />;
}

// Bottom sheet de trayectos guardados, accesible desde Mapa → "Guardados".
// Misma fuente de datos que Perfil → "Lugares guardados" (useSavedRoutes):
// esta pantalla no guarda ni borra nada por su cuenta, solo usa las
// acciones que le pasan.
function SavedRoutesPanel({
  savedRoutes,
  onClose,
  onUse,
  onRename,
  onDelete,
}: Omit<SavedRoutesSheetProps, "open">) {
  const [query, setQuery] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return savedRoutes;
    return savedRoutes.filter(
      (route) =>
        route.name.toLowerCase().includes(trimmed) ||
        route.origin.label.toLowerCase().includes(trimmed) ||
        route.destination.label.toLowerCase().includes(trimmed)
    );
  }, [savedRoutes, query]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="saved-routes-title"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-5xl bg-white shadow-hero sm:max-h-[80vh] sm:max-w-lg sm:rounded-5xl"
      >
        <div className="flex justify-center pt-3 sm:hidden">
          <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-slate-200" />
        </div>

        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 pb-4 pt-4 sm:px-6 sm:pt-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lime-50 text-lime-600">
              <BookmarkIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 id="saved-routes-title" className="truncate text-h2 text-slate-950">
                Tus trayectos guardados
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Se recalculan siempre con tus preferencias y señalizaciones actuales.
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-slate-100 px-5 py-3 sm:px-6">
          <label htmlFor="saved-routes-search" className="sr-only">
            Buscar trayecto guardado
          </label>
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
            <SearchIcon className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              id="saved-routes-search"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar trayecto guardado…"
              className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {savedRoutes.length === 0 ? (
            <EmptyState />
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No encontramos ningún trayecto guardado con ese nombre.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {filtered.map((route) => (
                <SavedRouteRow
                  key={route.id}
                  route={route}
                  onUse={() => onUse(route)}
                  onRename={(name) => onRename(route.id, name)}
                  onDelete={() => onDelete(route.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <BookmarkIcon className="h-5 w-5" />
      </span>
      <p className="text-sm font-semibold text-slate-700">Todavía no guardaste ningún trayecto</p>
      <p className="max-w-xs text-sm text-slate-500">
        Calculá una ruta y tocá &ldquo;Guardar trayecto&rdquo; para encontrarla acá la próxima vez.
      </p>
    </div>
  );
}

function SavedRouteRow({
  route,
  onUse,
  onRename,
  onDelete,
}: {
  route: SavedRoute;
  onUse: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(route.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function handleSaveName() {
    const trimmed = draftName.trim();
    if (trimmed) onRename(trimmed);
    setIsEditing(false);
  }

  return (
    <li className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-control">
      {isEditing ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={`rename-${route.id}`} className="text-label text-slate-400">
            Nombre del trayecto
          </label>
          <input
            id={`rename-${route.id}`}
            type="text"
            value={draftName}
            autoFocus
            maxLength={60}
            onChange={(event) => setDraftName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSaveName();
              if (event.key === "Escape") {
                setDraftName(route.name);
                setIsEditing(false);
              }
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-inset-control focus:border-lime-400 focus:outline-none focus:ring-2 focus:ring-lime-100"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveName}
              className="flex-1 rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-lime-400 transition hover:bg-slate-800 active:scale-[0.99]"
            >
              Guardar nombre
            </button>
            <button
              type="button"
              onClick={() => {
                setDraftName(route.name);
                setIsEditing(false);
              }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 active:scale-[0.99]"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 truncate text-sm font-bold text-slate-900">{route.name}</p>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                aria-label={`Cambiar nombre a "${route.name}"`}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:scale-95"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete((current) => !current)}
                aria-label={`Eliminar trayecto "${route.name}"`}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 active:scale-95"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-2 flex flex-col gap-1 text-xs text-slate-500">
            <p className="flex items-center gap-1.5">
              <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-lime-500" />
              <span className="truncate">{route.origin.label}</span>
            </p>
            <p className="flex items-center gap-1.5">
              <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-violet-600" />
              <span className="truncate">{route.destination.label}</span>
            </p>
          </div>

          {confirmingDelete ? (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 p-2">
              <p className="flex-1 text-xs font-medium text-rose-700">¿Eliminar este trayecto?</p>
              <button
                type="button"
                onClick={onDelete}
                className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 active:scale-95"
              >
                Eliminar
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 active:scale-95"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onUse}
              className="mt-3 flex w-full items-center justify-center rounded-xl bg-lime-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-lime-300 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400"
            >
              Usar trayecto
            </button>
          )}
        </>
      )}
    </li>
  );
}
