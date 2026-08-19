"use client";

import { useId, useState, type ReactNode } from "react";
import AccordionContent from "./AccordionContent";
import { ChevronRightIcon, ShieldCheckIcon, UsersIcon } from "./icons";

// Junto con PrivacyNotice forma la card "Centro de confianza" de Inicio; el
// contenedor blanco compartido (borde/radio/sombra) vive en app/page.tsx
// para que ambos bloques queden dentro de la MISMA superficie, tal como en
// el mockup aprobado (senda-home-reference.png). Cada elemento es un
// accordion propio (nunca navega ni abre un modal): togglear uno no afecta
// al otro.
export default function InfoHighlightsCard() {
  const [openRoutes, setOpenRoutes] = useState(false);
  const [openCommunity, setOpenCommunity] = useState(false);

  return (
    <div>
      <h2 className="text-[26px] font-extrabold leading-tight text-slate-950 sm:text-[30px]">
        Centro de confianza
      </h2>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-y-4 sm:mt-6 sm:grid sm:grid-cols-2 sm:divide-x sm:divide-slate-100">
        <TrustAccordionItem
          icon={<ShieldCheckIcon className="h-4 w-4 sm:h-5 sm:w-5" />}
          title="Rutas más seguras"
          subtitle="Según tus preferencias"
          open={openRoutes}
          onToggle={() => setOpenRoutes((current) => !current)}
          side="left"
        >
          <p>
            SENDA adapta tus recorridos según tus preferencias de accesibilidad. Tiene en cuenta las
            ayudas que querés encontrar y los obstáculos que preferís evitar para recomendarte un
            trayecto más adecuado.
          </p>
          <ul className="mt-3 flex flex-col gap-1.5">
            <li className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-500" />
              <span>
                <strong className="font-semibold text-slate-800">Buscamos:</strong> señalizaciones de
                accesibilidad que tengas activadas.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-1 h-2 w-2 shrink-0 rounded-full bg-orange-500" />
              <span>
                <strong className="font-semibold text-slate-800">Evitamos:</strong> obstáculos que
                hayas indicado que querés evitar.
              </span>
            </li>
          </ul>
        </TrustAccordionItem>

        <TrustAccordionItem
          icon={<UsersIcon className="h-4 w-4 sm:h-5 sm:w-5" />}
          title="Comunidad activa"
          subtitle={
            <>
              Juntos hacemos
              <br className="hidden sm:block" /> la diferencia
            </>
          }
          open={openCommunity}
          onToggle={() => setOpenCommunity((current) => !current)}
          side="right"
        >
          <p>
            Las señalizaciones de la comunidad ayudan a mantener las rutas actualizadas. Las personas
            pueden informar sobre rampas, obstáculos, semáforos accesibles y otros elementos que
            afectan la accesibilidad de un trayecto.
          </p>
          <p className="mt-3 font-semibold text-slate-800">
            Cada aporte ayuda a mejorar el recorrido de otras personas.
          </p>
        </TrustAccordionItem>
      </div>
    </div>
  );
}

function TrustAccordionItem({
  icon,
  title,
  subtitle,
  open,
  onToggle,
  side,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: ReactNode;
  open: boolean;
  onToggle: () => void;
  side: "left" | "right";
  children: ReactNode;
}) {
  const triggerId = useId();
  const panelId = useId();
  const sidePadding = side === "left" ? "sm:pr-6" : "sm:pl-6";

  return (
    <div className="max-w-[51%] sm:max-w-none sm:min-w-0 sm:flex-1">
      <button
        type="button"
        id={triggerId}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className={`flex w-full items-start gap-1.5 rounded-xl text-left transition active:scale-[0.99] sm:gap-4 sm:rounded-2xl ${sidePadding} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400`}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lime-100/70 text-lime-700 sm:h-11 sm:w-11">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-0.5 text-xs font-bold leading-snug text-slate-950 sm:text-lg">
            {title}
            <ChevronRightIcon
              className={`h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform duration-300 sm:hidden ${
                open ? "rotate-90" : ""
              }`}
            />
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500 sm:text-base">{subtitle}</p>
        </div>
        <ChevronRightIcon
          className={`mt-2.5 hidden h-5 w-5 shrink-0 text-slate-300 transition-transform duration-300 sm:block ${
            open ? "rotate-90" : ""
          }`}
        />
      </button>

      <AccordionContent open={open}>
        <div
          id={panelId}
          role="region"
          aria-labelledby={triggerId}
          className="pl-9 pr-1 pt-2 text-[11px] leading-relaxed text-slate-600 sm:pl-[60px] sm:pt-3 sm:text-sm"
        >
          {children}
        </div>
      </AccordionContent>
    </div>
  );
}
