import { ArrowLeftIcon } from "@/components/icons";

type WizardHeaderProps = {
  onBack: () => void;
  title?: string;
};

export default function WizardHeader({ onBack, title = "Crear señalización" }: WizardHeaderProps) {
  return (
    <header className="relative flex items-center justify-center">
      <button
        type="button"
        onClick={onBack}
        aria-label="Volver"
        className="absolute left-0 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-950 shadow-control transition hover:bg-slate-50 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400"
      >
        <ArrowLeftIcon className="h-5 w-5" />
      </button>

      <h1 className="px-14 text-h1 text-slate-950">{title}</h1>
    </header>
  );
}
