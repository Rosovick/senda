"use client";

import { useId, useRef, useState } from "react";
import UserAvatarView from "@/components/UserAvatarView";
import { InfoIcon, UploadIcon, UserIcon } from "@/components/icons";
import { PRESET_AVATARS, type UserAvatar } from "@/hooks/useUserProfile";
import {
  AvatarUploadError,
  createAvatarPreview,
  validateAvatarFile,
} from "@/lib/avatarImage";

type AvatarEditorProps = {
  name: string;
  avatar: UserAvatar;
  onChangeAvatar: (avatar: UserAvatar) => void;
};

export default function AvatarEditor({ name, avatar, onChangeAvatar }: AvatarEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const pickerId = useId();

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Permite volver a elegir el mismo archivo más adelante.
    event.target.value = "";
    if (!file) return;

    try {
      validateAvatarFile(file);
      const dataUrl = await createAvatarPreview(file);
      onChangeAvatar({ type: "upload", dataUrl });
      setUploadError(null);
    } catch (error) {
      setUploadError(
        error instanceof AvatarUploadError
          ? error.message
          : "No pudimos procesar la imagen. Probá con otro archivo."
      );
    }
  }

  return (
    <div>
      <div className="mt-4 flex justify-center">
        <UserAvatarView name={name} avatar={avatar} className="h-32 w-32" />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          className="sr-only"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-3 text-left shadow-control transition hover:bg-slate-100 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-teal-600 shadow-control">
            <UploadIcon className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-800">
              Subir desde dispositivo
            </span>
            <span className="block text-xs text-slate-500">JPG, PNG. Máx. 5 MB</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setIsPickerOpen((open) => !open)}
          aria-expanded={isPickerOpen}
          aria-controls={pickerId}
          className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-3 text-left shadow-control transition hover:bg-slate-100 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-teal-600 shadow-control">
            <UserIcon className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-800">
              Usar avatar predeterminado
            </span>
            <span className="block text-xs text-slate-500">Elegí entre varias opciones</span>
          </span>
        </button>
      </div>

      {uploadError && (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-2xl bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-800"
        >
          <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          {uploadError}
        </p>
      )}

      {isPickerOpen && (
        <div id={pickerId} className="mt-4 rounded-2xl border border-slate-200/70 bg-slate-50 p-4 shadow-inset-control">
          <p className="text-sm font-medium text-slate-700">Elegí un avatar predeterminado</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {PRESET_AVATARS.map((preset) => {
              const isSelected = avatar.type === "preset" && avatar.id === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    onChangeAvatar({ type: "preset", id: preset.id });
                    setIsPickerOpen(false);
                  }}
                  aria-pressed={isSelected}
                  aria-label={`${preset.label}${isSelected ? " (seleccionado)" : ""}`}
                  className={`relative flex h-14 w-14 items-center justify-center rounded-full text-white shadow-control transition active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
                    isSelected ? "ring-2 ring-slate-900 ring-offset-2" : ""
                  }`}
                  style={{ backgroundColor: preset.color }}
                >
                  <UserIcon className="h-6 w-6" />
                  {isSelected && (
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-white">
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" aria-hidden="true">
                        <path
                          d="M5 13l4 4L19 7"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
