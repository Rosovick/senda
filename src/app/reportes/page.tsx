import BottomNavigation from "@/components/BottomNavigation";
import ReportsHeader from "@/components/reports/ReportsHeader";
import ReportsScreen from "@/components/reports/ReportsScreen";

export default function ReportesPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-28">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pt-6 sm:px-6 sm:pt-8">
        <ReportsHeader />
        <ReportsScreen />
      </div>

      <div className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-20 mx-auto max-w-xl overflow-hidden rounded-4xl bg-slate-950 shadow-glow">
        <BottomNavigation active="reportes" />
      </div>
    </main>
  );
}
