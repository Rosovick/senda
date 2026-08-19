import Link from "next/link";
import UserAvatarView from "@/components/UserAvatarView";
import { CameraIcon, MapPinIcon, PencilIcon } from "@/components/icons";
import type { UserProfileData } from "@/hooks/useUserProfile";

type UserSummaryCardProps = {
  profile: UserProfileData;
  isPersonalized: boolean;
};

export default function UserSummaryCard({ profile, isPersonalized }: UserSummaryCardProps) {
  const displayName = profile.preferredName.trim() || profile.name.trim() || "Tu usuario";

  return (
    <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-card sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="relative h-20 w-20 shrink-0">
            <UserAvatarView name={profile.name} avatar={profile.avatar} className="h-20 w-20" />
            <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-teal-500 text-white shadow-control">
              <CameraIcon className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="text-h1 text-slate-950">{displayName}</h2>
            {profile.city && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                <MapPinIcon className="h-4 w-4 text-teal-600" />
                {profile.city}
              </p>
            )}
            <span
              className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                isPersonalized
                  ? "bg-teal-50 text-teal-700 ring-teal-600/10"
                  : "bg-slate-100 text-slate-500 ring-slate-900/5"
              }`}
            >
              {isPersonalized ? "Perfil personalizado" : "Todavía sin personalizar"}
            </span>
          </div>
        </div>

        <Link
          href="/perfil/editar"
          className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-full border border-teal-200 bg-white px-4 py-2 text-sm font-semibold text-teal-700 shadow-control transition hover:bg-teal-50 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
        >
          <PencilIcon className="h-4 w-4" />
          Editar perfil
        </Link>
      </div>
    </section>
  );
}
