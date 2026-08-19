"use client";

import { useProfilePreferences } from "@/hooks/useProfilePreferences";
import { useSignals } from "@/hooks/useSignals";
import { useUserProfile } from "@/hooks/useUserProfile";
import MyReportsCard from "./MyReportsCard";
import NavigationPreferencesSection from "./NavigationPreferencesSection";
import RoutePreferencesSection from "./RoutePreferencesSection";
import SavedPlacesCard from "./SavedPlacesCard";
import UserSummaryCard from "./UserSummaryCard";

// Dueño único del estado de /perfil (perfil básico + preferencias, ambos
// persistidos en localStorage). Todo lo que depende de ese estado vive acá
// para no tener que levantarlo hasta la página.
export default function ProfileScreen() {
  const { profile } = useUserProfile();
  const {
    routeNeedPreferences,
    toggleRouteNeedPreference,
    routeAvoidPreferences,
    toggleRouteAvoidPreference,
    navigationPreferences,
    toggleNavigationPreference,
  } = useProfilePreferences();
  // Misma colección centralizada que usa /reportes (useSignals): "Mis
  // señalizaciones" no es una fuente de datos separada. Solo las propias y
  // activas (no retiradas) participan de la card.
  const { signals } = useSignals();
  const mySignals = signals.filter((signal) => signal.isOwner && signal.isActive);

  const isPersonalized =
    Object.values(routeNeedPreferences).some(Boolean) ||
    Object.values(routeAvoidPreferences).some(Boolean) ||
    Object.values(navigationPreferences).some(Boolean);

  return (
    <>
      <UserSummaryCard profile={profile} isPersonalized={isPersonalized} />
      <RoutePreferencesSection
        needPreferences={routeNeedPreferences}
        onToggleNeed={toggleRouteNeedPreference}
        avoidPreferences={routeAvoidPreferences}
        onToggleAvoid={toggleRouteAvoidPreference}
      />
      <NavigationPreferencesSection
        preferences={navigationPreferences}
        onToggle={toggleNavigationPreference}
      />
      <SavedPlacesCard />
      <MyReportsCard signals={mySignals} />
    </>
  );
}
