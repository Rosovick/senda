import BottomNavigation from "@/components/BottomNavigation";
import InfoHighlightsCard from "@/components/InfoHighlightsCard";
import PrivacyNotice from "@/components/PrivacyNotice";
import ProfileCard from "@/components/ProfileCard";
import ReportBarrierCard from "@/components/ReportBarrierCard";
import SearchRouteCard from "@/components/SearchRouteCard";
import SendaHeader from "@/components/SendaHeader";

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 pb-28 sm:pb-32">
      <div className="mx-auto flex w-full max-w-5xl flex-col px-4 pt-5 sm:px-9 sm:pt-9">
        <SendaHeader />

        <div className="mt-5 sm:mt-[76px]">
          <ProfileCard />
        </div>

        <div className="mt-4 sm:mt-10">
          <SearchRouteCard />
        </div>

        <div className="mt-4">
          <ReportBarrierCard />
        </div>

        {/* "Centro de confianza": InfoHighlightsCard (título + 2 columnas) y
            PrivacyNotice (fila inferior) son componentes separados que ya
            existían en Inicio; comparten esta única superficie blanca tal
            como en el mockup aprobado, en vez de ser dos cards sueltas. */}
        <div className="mt-4 rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:mt-6 sm:rounded-[32px] sm:p-7">
          <InfoHighlightsCard />
          <div className="mt-5 border-t border-slate-100 pt-5 sm:mt-6 sm:pt-6">
            <PrivacyNotice />
          </div>
        </div>
      </div>

      <div className="fixed inset-x-4 z-20 mx-auto max-w-5xl overflow-hidden rounded-[24px] bg-slate-950 shadow-glow [bottom:max(8px,env(safe-area-inset-bottom))] sm:rounded-[32px] sm:inset-x-9 sm:[bottom:max(1rem,env(safe-area-inset-bottom))]">
        <BottomNavigation active="inicio" />
      </div>
    </main>
  );
}
