"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVerticalIcon, PencilIcon, ThumbsUpIcon, TrashIcon } from "@/components/icons";
import UserAvatarView from "@/components/UserAvatarView";
import type { SignalComment } from "@/lib/comments";
import { formatReportAge } from "@/lib/reports";

type CommentItemProps = {
  comment: SignalComment;
  currentUserId: string | null;
  isReply?: boolean;
  onReply?: () => void;
  onToggleHelpful: () => void;
  onEdit: (text: string) => void;
  onDelete: () => void;
  onReport: () => void;
};

// Una fila de comentario (sección 4/5): sin card propia, separada del
// resto por un divide-y en el contenedor padre (CommentsScreen). El mismo
// componente sirve para el comentario de nivel superior y para cada
// respuesta (isReply oculta "Responder" — máximo 1 nivel, sección 5).
export default function CommentItem({
  comment,
  currentUserId,
  isReply = false,
  onReply,
  onToggleHelpful,
  onEdit,
  onDelete,
  onReport,
}: CommentItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(comment.text);
  const [reported, setReported] = useState(false);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing) editInputRef.current?.focus();
  }, [isEditing]);

  const isDeleted = comment.deletedAt !== null;
  const isOwner = currentUserId !== null && comment.userId === currentUserId;
  const hasVotedHelpful = currentUserId !== null && comment.helpfulVotes.includes(currentUserId);

  function handleSaveEdit() {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    onEdit(trimmed);
    setIsEditing(false);
  }

  function handleReport() {
    setReported(true);
    setMenuOpen(false);
    onReport();
  }

  if (isDeleted) {
    return (
      <div className="flex gap-3 py-4">
        <span className="h-9 w-9 shrink-0 rounded-full bg-slate-100" aria-hidden="true" />
        <p className="mt-1.5 text-sm italic text-slate-400">Comentario eliminado</p>
      </div>
    );
  }

  return (
    <div className="flex gap-3 py-4">
      <UserAvatarView name={comment.userName} avatar={comment.avatar} className="h-9 w-9 shrink-0" />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="truncate text-sm font-semibold text-slate-950">{comment.userName}</span>
            <span className="shrink-0 text-xs text-slate-400">
              {formatReportAge(comment.createdAt)}
              {comment.updatedAt !== comment.createdAt ? " · editado" : ""}
            </span>
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Más opciones del comentario"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400"
            >
              <MoreVerticalIcon className="h-4 w-4" />
            </button>

            {menuOpen && (
              <>
                <button
                  type="button"
                  aria-hidden="true"
                  tabIndex={-1}
                  onClick={() => setMenuOpen(false)}
                  className="fixed inset-0 z-30 cursor-default"
                />
                <div
                  role="menu"
                  aria-label="Opciones del comentario"
                  className="absolute right-0 z-40 mt-1 w-44 overflow-hidden rounded-2xl bg-white py-1.5 shadow-hero ring-1 ring-slate-200/70"
                >
                  {isOwner ? (
                    <>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          setEditValue(comment.text);
                          setIsEditing(true);
                        }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        <PencilIcon className="h-4 w-4 shrink-0" />
                        Editar
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          onDelete();
                        }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                      >
                        <TrashIcon className="h-4 w-4 shrink-0" />
                        Eliminar
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      role="menuitem"
                      disabled={reported}
                      onClick={handleReport}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:text-slate-400"
                    >
                      {reported ? "Comentario reportado" : "Reportar comentario"}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="mt-2 flex flex-col gap-2">
            <textarea
              ref={editInputRef}
              value={editValue}
              onChange={(event) => setEditValue(event.target.value)}
              rows={2}
              maxLength={500}
              className="w-full resize-none rounded-2xl bg-slate-100 px-3.5 py-2.5 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-lime-300"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={!editValue.trim()}
                className="rounded-full bg-lime-400 px-3.5 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                Guardar
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">
            {comment.text}
          </p>
        )}

        {!isEditing && (
          <div className="mt-2 flex items-center gap-4">
            <button
              type="button"
              onClick={onToggleHelpful}
              aria-pressed={hasVotedHelpful}
              className={`flex items-center gap-1.5 text-xs font-semibold transition ${
                hasVotedHelpful ? "text-lime-600" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <ThumbsUpIcon className="h-3.5 w-3.5" />
              Útil{comment.helpfulVotes.length > 0 ? ` · ${comment.helpfulVotes.length}` : ""}
            </button>

            {!isReply && onReply && (
              <button
                type="button"
                onClick={onReply}
                className="text-xs font-semibold text-slate-500 transition hover:text-slate-700"
              >
                Responder
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
