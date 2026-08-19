import type { ReactNode } from "react";

type AccordionContentProps = {
  open: boolean;
  children: ReactNode;
  className?: string;
};

// Despliegue suave sin medir alturas con JS ni Estado adicional: truco de
// CSS Grid (grid-template-rows 0fr → 1fr) que transiciona de forma fluida
// y funciona con contenido de altura variable — usado por el "Centro de
// confianza" (InfoHighlightsCard/PrivacyNotice) para que cada elemento se
// expanda dentro de la misma card, sin abrir una página ni un modal.
export default function AccordionContent({ open, children, className }: AccordionContentProps) {
  return (
    <div
      className={`grid transition-[grid-template-rows] duration-300 ease-out ${
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      }`}
    >
      <div className={`overflow-hidden ${className ?? ""}`} aria-hidden={!open}>
        {children}
      </div>
    </div>
  );
}
