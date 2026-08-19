import { UserIcon } from "@/components/icons";
import { PRESET_AVATARS, type UserAvatar } from "@/hooks/useUserProfile";

type UserAvatarViewProps = {
  name: string;
  avatar: UserAvatar;
  className?: string;
};

// Única fuente de verdad para "cómo se dibuja un avatar" en toda la app
// (Inicio, /perfil, /perfil/editar): evita que cada pantalla reimplemente su
// propia lógica de iniciales/preset/imagen subida.
export default function UserAvatarView({ name, avatar, className = "h-20 w-20" }: UserAvatarViewProps) {
  if (avatar.type === "upload") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- dataURL local (recortada/comprimida), no una URL remota que next/image pueda optimizar.
      <img
        src={avatar.dataUrl}
        alt={`Avatar de ${name}`}
        className={`${className} rounded-full object-cover`}
      />
    );
  }

  if (avatar.type === "preset") {
    const preset = PRESET_AVATARS.find((item) => item.id === avatar.id);
    const color = preset?.color ?? "#0c8a45";
    return (
      <div
        className={`${className} flex items-center justify-center rounded-full text-white`}
        style={{ backgroundColor: color }}
        role="img"
        aria-label={`Avatar de ${name}`}
      >
        <UserIcon className="h-1/2 w-1/2" />
      </div>
    );
  }

  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className={`${className} flex items-center justify-center rounded-full bg-lime-400 font-bold text-white`}
      role="img"
      aria-label={`Avatar de ${name}`}
    >
      {initial}
    </div>
  );
}
