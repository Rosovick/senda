"use client";

import { useCallback } from "react";
import { useLocalStorageState } from "./useLocalStorageState";

export type PresetAvatarId = "teal" | "violet" | "orange" | "blue" | "rose" | "amber";

export const PRESET_AVATARS: { id: PresetAvatarId; color: string; label: string }[] = [
  { id: "teal", color: "#0c8a45", label: "Avatar turquesa" },
  { id: "violet", color: "#7c3aed", label: "Avatar violeta" },
  { id: "orange", color: "#f97316", label: "Avatar naranja" },
  { id: "blue", color: "#2563eb", label: "Avatar azul" },
  { id: "rose", color: "#e11d48", label: "Avatar rosa" },
  { id: "amber", color: "#d97706", label: "Avatar ámbar" },
];

// Un único modelo de avatar para toda la app: iniciales (por defecto), uno de
// los predeterminados de SENDA, o una imagen subida por el usuario (ya
// redimensionada/comprimida — ver src/lib/avatarImage.ts).
export type UserAvatar =
  | { type: "initials" }
  | { type: "preset"; id: PresetAvatarId }
  | { type: "upload"; dataUrl: string };

// Modelo de perfil básico de la persona usuaria. Es el único lugar donde se
// define esta forma de datos: Inicio y /perfil (y su edición) lo consumen
// desde acá en lugar de tener cada uno su propia versión.
export type UserProfileData = {
  name: string;
  preferredName: string;
  city: string;
  avatar: UserAvatar;
};

// Mock/local temporal para poder visualizar el diseño: no es un dato fijo de
// la app, es solo el valor inicial hasta que haya cuenta y base de datos.
export const DEFAULT_USER_PROFILE: UserProfileData = {
  name: "Sofía Rojas",
  preferredName: "Sofía",
  city: "Salta, Argentina",
  avatar: { type: "initials" },
};

const USER_PROFILE_KEY = "senda:user-profile";

// Persistencia temporal en localStorage detrás de una interfaz de hook: el
// día que haya autenticación y base de datos, esto se reemplaza sin tocar
// los componentes que lo consumen (Inicio, /perfil, /perfil/editar).
export function useUserProfile() {
  const [profile, setProfile, isLoaded] = useLocalStorageState<UserProfileData>(
    USER_PROFILE_KEY,
    DEFAULT_USER_PROFILE
  );

  const saveProfile = useCallback(
    (next: UserProfileData) => {
      setProfile(next);
    },
    [setProfile]
  );

  const displayName = profile.preferredName.trim() || profile.name.trim() || "Tu usuario";

  return { profile, saveProfile, displayName, isLoaded };
}
