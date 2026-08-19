"use client";

import { useRouter } from "next/navigation";
import { useUserProfile } from "@/hooks/useUserProfile";
import EditProfileFields from "./EditProfileFields";

// Espera a que useLocalStorageState termine de leer el perfil guardado antes
// de montar el formulario, para que sus campos arranquen con los valores
// reales (y no con el default) sin necesitar lógica extra de sincronización.
export default function EditProfileForm() {
  const router = useRouter();
  const { profile, saveProfile, isLoaded } = useUserProfile();

  if (!isLoaded) {
    return (
      <div className="rounded-3xl border border-slate-200/70 bg-white p-8 text-center text-sm text-slate-400 shadow-card">
        Cargando tu perfil…
      </div>
    );
  }

  return (
    <EditProfileFields
      initialProfile={profile}
      onSave={(next) => {
        saveProfile(next);
        router.push("/perfil");
      }}
      onCancel={() => router.push("/perfil")}
    />
  );
}
