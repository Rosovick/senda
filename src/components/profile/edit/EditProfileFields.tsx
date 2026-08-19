"use client";

import { useState, type FormEvent } from "react";
import { CheckCircleIcon, ShieldIcon } from "@/components/icons";
import type { UserAvatar, UserProfileData } from "@/hooks/useUserProfile";
import AvatarEditor from "./AvatarEditor";
import PersonalInfoForm from "./PersonalInfoForm";

type EditProfileFieldsProps = {
  initialProfile: UserProfileData;
  onSave: (profile: UserProfileData) => void;
  onCancel: () => void;
};

// Todo lo que se edita acá es un borrador local: nada se guarda en el perfil
// real hasta que se presiona "Guardar cambios" (onSave).
export default function EditProfileFields({
  initialProfile,
  onSave,
  onCancel,
}: EditProfileFieldsProps) {
  const [name, setName] = useState(initialProfile.name);
  const [preferredName, setPreferredName] = useState(initialProfile.preferredName);
  const [city, setCity] = useState(initialProfile.city);
  const [avatar, setAvatar] = useState<UserAvatar>(initialProfile.avatar);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSave({
      name: name.trim() || initialProfile.name,
      preferredName: preferredName.trim(),
      city: city.trim(),
      avatar,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-card sm:p-7">
        <h2 className="text-h2 text-slate-950">Foto de perfil</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Esta foto es opcional y se mostrará en tu perfil de SENDA.
        </p>
        <AvatarEditor name={name || initialProfile.name} avatar={avatar} onChangeAvatar={setAvatar} />
      </section>

      <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-card sm:p-7">
        <h2 className="text-h2 text-slate-950">Información personal</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Estos datos se mostrarán en tu perfil de SENDA.
        </p>

        <PersonalInfoForm
          name={name}
          preferredName={preferredName}
          city={city}
          onChangeName={setName}
          onChangePreferredName={setPreferredName}
          onChangeCity={setCity}
        />

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-500 text-white shadow-control">
            <ShieldIcon className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-teal-800">Tu privacidad es importante</p>
            <p className="mt-0.5 text-sm leading-relaxed text-teal-700">
              Esta información se utiliza para personalizar tu experiencia en SENDA.
            </p>
          </div>
        </div>
      </section>

      <button
        type="submit"
        className="flex items-center justify-center gap-2 rounded-full bg-teal-500 px-6 py-4 text-base font-semibold text-slate-950 shadow-control transition hover:bg-teal-400 hover:shadow-card active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
      >
        <CheckCircleIcon className="h-5 w-5" />
        Guardar cambios
      </button>

      <button
        type="button"
        onClick={onCancel}
        className="rounded-full border border-slate-200 bg-white px-6 py-4 text-base font-semibold text-slate-700 shadow-control transition hover:bg-slate-50 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
      >
        Cancelar
      </button>
    </form>
  );
}
