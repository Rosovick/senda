"use client";

import Link from "next/link";
import { useState } from "react";
import { BookmarkIcon, MapPinIcon, PencilIcon, RouteMapIcon, TrashIcon } from "@/components/icons";
import { useSavedRoutes, type SavedRoute } from "@/hooks/useSavedRoutes";

// Administra la MISMA colección que Mapa → "Guardados"/"Guardar trayecto"
// (useSavedRoutes): nada de datos mock ni de un segundo sistema llamado
// "Favoritos" — guardar un trayecto acá o en Mapa lo hace aparecer en
// ambos lugares, porque es literalmente el mismo estado (localStorage).
export default function SavedPlacesCard() {
  const { savedRoutes, renameSavedRoute, deleteSavedRoute, isLoaded } = useSavedRoutes();

  return (
    <section className="rounded-3xl border border-teal-100 bg-teal-50/60 p-6 shadow-card sm:p-7">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-500 text-white shadow-control">
          <BookmarkIcon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-h2 text-slate-950">Lugares guardados</h2>
          <p className="mt-0.5 text-sm text-slate-500">Tus trayectos frecuentes.</p>
        </div>
      </div>

      {!isLoaded ? null : savedRoutes.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {savedRoutes.map((route) => (
            <SavedRouteRow
              key={route.id}
              route={route}
              onRename={(name) => renameSavedRoute(route.id, name)}
              onDelete={() => deleteSavedRoute(route.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-teal-200 bg-white/60 px-4 py-6 text-center">
      <p className="text-sm font-semibold text-slate-700">Todavía no guardaste ningún trayecto</p>
      <p className="text-xs text-slate-500">
        Calculá una ruta en Mapa y tocá &ldquo;Guardar trayecto&rdquo; para verla acá.
      </p>
      <Link
        href="/ruta"
        className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-teal-700 active:scale-95"
      >
        <RouteMapIcon className="h-3.5 w-3.5" />
        Ir al mapa
      </Link>
    </div>
  );
}

function SavedRouteRow({
  route,
  onRename,
  onDelete,
}: {
  route: SavedRoute;
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

  if (isEditing) {
    return (
      <li className="rounded-2xl border border-teal-100 bg-white px-3 py-2.5 shadow-control">
        <label htmlFor={`saved-place-rename-${route.id}`} className="text-label text-slate-400">
          Nombre del trayecto
        </label>
        <input
          id={`saved-place-rename-${route.id}`}
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
          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-inset-control focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
        />
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={handleSaveName}
            className="flex-1 rounded-xl bg-teal-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-700 active:scale-[0.99]"
          >
            Guardar nombre
          </button>
          <button
            type="button"
            onClick={() => {
              setDraftName(route.name);
              setIsEditing(false);
            }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 active:scale-[0.99]"
          >
            Cancelar
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex w-full items-center gap-3 rounded-2xl border border-transparent bg-white px-3 py-2.5 shadow-control transition hover:border-teal-100 hover:bg-teal-50/60">
      <Link
        href={`/ruta?savedRouteId=${route.id}`}
        className="flex min-w-0 flex-1 items-center gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 focus-visible:rounded-xl"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-600">
          <MapPinIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">{route.name}</p>
          <p className="truncate text-xs text-slate-500">
            {route.origin.label} → {route.destination.label}
          </p>
        </div>
      </Link>

      {confirmingDelete ? (
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg bg-rose-600 px-2 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 active:scale-95"
          >
            Eliminar
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(false)}
            className="rounded-lg px-2 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 active:scale-95"
          >
            Cancelar
          </button>
        </div>
      ) : (
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
            onClick={() => setConfirmingDelete(true)}
            aria-label={`Eliminar trayecto "${route.name}"`}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 active:scale-95"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      )}
    </li>
  );
}
