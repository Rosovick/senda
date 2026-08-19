import { MessageCircleIcon } from "@/components/icons";

// Sección 9: nunca un espacio en blanco. Invita a participar sin sonar
// infantil — mismo tono sobrio que ReportsEmptyState.
export default function CommentsEmptyState() {
  return (
    <section className="rounded-3xl border border-slate-200/70 bg-white p-7 text-center shadow-card sm:p-9">
      <div className="flex justify-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <MessageCircleIcon className="h-6 w-6" />
        </span>
      </div>
      <h3 className="mt-4 text-h3 text-slate-950">Sin comentarios todavía</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
        ¿Pasaste por este lugar? Compartí información que pueda ayudar a la comunidad.
      </p>
    </section>
  );
}
