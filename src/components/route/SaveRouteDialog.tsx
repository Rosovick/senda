"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { BookmarkIcon, CloseIcon } from "@/components/icons";

export type SaveRouteDialogProps = {
  open: boolean;
  defaultName: string;
  onClose: () => void;
  onSave: (name: string) => void;
};

// Contenedor: solo decide si hay que mostrar el diálogo. Igual que
// SignalDetailSheet, el panel real se monta de cero cada vez que se abre
// (nunca persiste como el mismo componente entre aperturas), así el nombre
// arranca siempre en `defaultName` sin necesitar un efecto que lo resetee.
export default function SaveRouteDialog({ open, defaultName, onClose, onSave }: SaveRouteDialogProps) {
  if (!open) return null;
  return <SaveRouteDialogPanel key={defaultName} defaultName={defaultName} onClose={onClose} onSave={onSave} />;
}

// Diálogo simple para nombrar un trayecto antes de guardarlo (sección 4/5
// del pedido). Si el usuario no escribe nada, se guarda con `defaultName`
// ("Origen → Destino") — nunca se bloquea el guardado por falta de nombre.
function SaveRouteDialogPanel({
  defaultName,
  onClose,
  onSave,
}: {
  defaultName: string;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(defaultName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSave(name.trim() || defaultName);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-route-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full overflow-hidden rounded-t-5xl bg-white p-6 shadow-hero sm:max-w-sm sm:rounded-5xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lime-50 text-lime-600">
              <BookmarkIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 id="save-route-title" className="text-h2 text-slate-950">
                Guardar trayecto
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">Le vas a poder cambiar el nombre después.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 active:scale-95"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          <div>
            <label htmlFor="save-route-name" className="text-label text-slate-400">
              Nombre
            </label>
            <input
              ref={inputRef}
              id="save-route-name"
              type="text"
              value={name}
              maxLength={60}
              onChange={(event) => setName(event.target.value)}
              placeholder={defaultName}
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-inset-control placeholder:text-slate-400 focus:border-lime-400 focus:outline-none focus:ring-2 focus:ring-lime-100"
            />
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-lime-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-control transition hover:bg-lime-300 hover:shadow-card active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400"
          >
            <BookmarkIcon className="h-4 w-4" />
            Guardar trayecto
          </button>
        </form>
      </div>
    </div>
  );
}
