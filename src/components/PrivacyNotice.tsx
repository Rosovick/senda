"use client";

import { useId, useState } from "react";
import AccordionContent from "./AccordionContent";
import { ChevronRightIcon, LockIcon } from "./icons";

// Fila inferior de la card "Centro de confianza" (ver InfoHighlightsCard):
// el contenedor blanco compartido, con el divisor superior, vive en
// app/page.tsx. Mismo comportamiento de accordion que los dos elementos de
// arriba, independiente de ellos.
export default function PrivacyNotice() {
  const [open, setOpen] = useState(false);
  const triggerId = useId();
  const panelId = useId();

  return (
    <div>
      <button
        type="button"
        id={triggerId}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 rounded-xl text-left transition active:scale-[0.99] sm:gap-4 sm:rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 sm:h-10 sm:w-10">
          <LockIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-950 sm:text-lg">Tu información es segura</p>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-base">No compartimos tus datos personales.</p>
        </div>
        <ChevronRightIcon
          className={`h-4 w-4 shrink-0 text-slate-300 transition-transform duration-300 sm:h-5 sm:w-5 ${
            open ? "rotate-90" : ""
          }`}
        />
      </button>

      <AccordionContent open={open}>
        <div
          id={panelId}
          role="region"
          aria-labelledby={triggerId}
          className="pl-12 pr-1 pt-2 text-[11px] leading-relaxed text-slate-600 sm:pl-[3.25rem] sm:pt-3 sm:text-sm"
        >
          <p>
            Tus preferencias de accesibilidad se utilizan para personalizar tus rutas. SENDA no
            muestra públicamente información personal de tu perfil junto a tus recorridos.
          </p>
        </div>
      </AccordionContent>
    </div>
  );
}
