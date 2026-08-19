import AccessibilityStatus from "@/components/route/AccessibilityStatus";
import RouteHeader from "@/components/route/RouteHeader";
import RouteMapSection from "@/components/route/RouteMapSection";
import BottomNavigation from "@/components/BottomNavigation";

export default function RutaPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-40">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pt-6 sm:px-6 sm:pt-8">
        <RouteHeader />
        <RouteMapSection mapClassName="min-h-[320px] h-[50vh] max-h-[520px] sm:h-96 sm:min-h-0 sm:max-h-none" />
      </div>

      <div className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-20 mx-auto max-w-xl overflow-hidden rounded-4xl bg-slate-950 shadow-glow">
        <BottomNavigation active="mapa" />
        <AccessibilityStatus />
      </div>
    </main>
  );
}
