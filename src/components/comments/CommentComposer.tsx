"use client";

import { useEffect, useRef, useState } from "react";
import { CloseIcon, SendIcon } from "@/components/icons";
import UserAvatarView from "@/components/UserAvatarView";
import type { UserAvatar } from "@/hooks/useUserProfile";

type ReplyTarget = { id: string; userName: string };

type CommentComposerProps = {
  avatarName: string;
  avatar: UserAvatar;
  disabled?: boolean;
  replyingTo: ReplyTarget | null;
  onCancelReply: () => void;
  onSubmit: (text: string) => void;
};

const MAX_TEXTAREA_HEIGHT_PX = 120;

// Barra fija inferior (sección 7-8): reemplaza a BottomNavigation en esta
// pantalla, mismo criterio ya usado por /reportar y /perfil/editar (pantallas
// de flujo enfocado que tampoco muestran la barra de navegación). Nunca
// recarga la página: onSubmit solo llama a addComment (useComments) y el
// listado se actualiza por estado de React.
export default function CommentComposer({
  avatarName,
  avatar,
  disabled = false,
  replyingTo,
  onCancelReply,
  onSubmit,
}: CommentComposerProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Se expande levemente con el contenido (sección 7), hasta un tope
  // razonable — no un textarea que crezca sin límite.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT_PX)}px`;
  }, [text]);

  useEffect(() => {
    if (replyingTo) textareaRef.current?.focus();
  }, [replyingTo]);

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setText("");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200/70 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
        {replyingTo && (
          <div className="flex items-center justify-between gap-2 rounded-full bg-slate-100 px-4 py-1.5 text-xs font-medium text-slate-600">
            <span className="truncate">Respondiendo a {replyingTo.userName}</span>
            <button
              type="button"
              onClick={onCancelReply}
              aria-label="Cancelar respuesta"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400"
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2.5">
          <UserAvatarView name={avatarName} avatar={avatar} className="mb-1 h-9 w-9 shrink-0" />

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            rows={1}
            placeholder="Escribí un comentario..."
            aria-label={replyingTo ? `Responder a ${replyingTo.userName}` : "Escribir un comentario"}
            className="max-h-[120px] min-h-11 flex-1 resize-none rounded-3xl bg-slate-100 px-4 py-2.5 text-base text-slate-950 placeholder:text-slate-400 transition focus:outline-none focus:ring-2 focus:ring-lime-300 disabled:opacity-60"
          />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSend}
            aria-label="Publicar comentario"
            className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lime-400 text-slate-950 shadow-control transition hover:bg-lime-300 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400"
          >
            <SendIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
