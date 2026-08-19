"use client";

import { useCallback, useMemo } from "react";
import { COMMENT_MAX_LENGTH, normalizeComment, type SignalComment } from "@/lib/comments";
import { generateLocalId } from "@/lib/localId";
import { useLocalStorageState } from "./useLocalStorageState";
import type { UserAvatar } from "./useUserProfile";

const COMMENTS_KEY = "senda:signal-comments";

type AddCommentParams = {
  signalId: string;
  userId: string;
  userName: string;
  avatar: UserAvatar;
  text: string;
  parentCommentId?: string | null;
};

// Colección centralizada de comentarios, separada de useReports — misma
// arquitectura que useSignalVerifications.ts (una señalización real puede
// tener muchos comentarios de muchos usuarios). Los consumidores filtran
// por signalId con los helpers de lib/comments.ts.
export function useComments() {
  const [rawComments, setComments, isLoaded] = useLocalStorageState<SignalComment[]>(COMMENTS_KEY, []);

  const comments = useMemo(
    () => rawComments.map(normalizeComment).filter((comment): comment is SignalComment => comment !== null),
    [rawComments]
  );

  const addComment = useCallback(
    (params: AddCommentParams) => {
      const trimmed = params.text.trim().slice(0, COMMENT_MAX_LENGTH);
      if (!trimmed) return null;

      const now = new Date().toISOString();
      const created: SignalComment = {
        id: generateLocalId(),
        signalId: params.signalId,
        userId: params.userId,
        userName: params.userName,
        avatar: params.avatar,
        text: trimmed,
        createdAt: now,
        updatedAt: now,
        parentCommentId: params.parentCommentId ?? null,
        helpfulVotes: [],
        reportedBy: [],
        deletedAt: null,
      };
      setComments((current) => [...current, created]);
      return created;
    },
    [setComments]
  );

  // Solo quien lo escribió puede editar/eliminar el suyo (mismo criterio de
  // ownership por userId que useSignals().editSignal/deleteSignal): se
  // valida acá, en el único lugar que escribe, no solo ocultando el botón.
  const editComment = useCallback(
    (commentId: string, userId: string, text: string) => {
      const trimmed = text.trim().slice(0, COMMENT_MAX_LENGTH);
      if (!trimmed) return;
      setComments((current) =>
        current.map((comment) =>
          comment.id === commentId && comment.userId === userId
            ? { ...comment, text: trimmed, updatedAt: new Date().toISOString() }
            : comment
        )
      );
    },
    [setComments]
  );

  const deleteComment = useCallback(
    (commentId: string, userId: string) => {
      setComments((current) =>
        current.map((comment) =>
          comment.id === commentId && comment.userId === userId
            ? { ...comment, deletedAt: new Date().toISOString() }
            : comment
        )
      );
    },
    [setComments]
  );

  // Toggle simple (no es una validación comunitaria con umbrales como
  // SignalVerification: acá cada persona solo dice "esto me sirvió", sin
  // pesos ni estados intermedios).
  const toggleHelpful = useCallback(
    (commentId: string, userId: string) => {
      setComments((current) =>
        current.map((comment) => {
          if (comment.id !== commentId) return comment;
          const alreadyVoted = comment.helpfulVotes.includes(userId);
          return {
            ...comment,
            helpfulVotes: alreadyVoted
              ? comment.helpfulVotes.filter((id) => id !== userId)
              : [...comment.helpfulVotes, userId],
          };
        })
      );
    },
    [setComments]
  );

  const reportComment = useCallback(
    (commentId: string, userId: string) => {
      setComments((current) =>
        current.map((comment) =>
          comment.id === commentId && !comment.reportedBy.includes(userId)
            ? { ...comment, reportedBy: [...comment.reportedBy, userId] }
            : comment
        )
      );
    },
    [setComments]
  );

  return { comments, addComment, editComment, deleteComment, toggleHelpful, reportComment, isLoaded };
}
