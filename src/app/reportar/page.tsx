import { Suspense } from "react";
import ReportWizard from "@/components/reportar/ReportWizard";

export default function ReportarPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-12">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pt-6 sm:px-6 sm:pt-8">
        {/* useSearchParams (modo edición, ?edit=<id>) requiere un boundary
            de Suspense para no forzar la ruta entera a renderizado dinámico. */}
        <Suspense fallback={null}>
          <ReportWizard />
        </Suspense>
      </div>
    </main>
  );
}
