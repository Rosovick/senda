"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useComments } from "@/hooks/useComments";
import { useLocalIdentity } from "@/hooks/useLocalIdentity";
import { useSignals } from "@/hooks/useSignals";
import { useUserProfile } from "@/hooks/useUserProfile";
import { buildCommentThreads, countActiveComments, getCommentsForSignal } from "@/lib/comments";
import CommentComposer from "./CommentComposer";
import CommentsEmptyState from "./CommentsEmptyState";
import CommentsHeader from "./CommentsHeader";
import CommentThread from "./CommentThread";
import SignalSummaryCard from "./SignalSummaryCard";

type ReplyTarget = { id: string; userName: string };

// Pantalla completa (sección 1/18): /reportes → card → "Ver comentarios" →
// esta pantalla → escribir → publicar → aparece al toque. Reutiliza
// exactamente la misma colección de señalizaciones (useSignals) que
// /reportes y /ruta — nunca un segundo sistema paralelo.
export default function CommentsScreen() {
  const params = useParams();
  const signalId = typeof params.id === "string" ? params.id : "";

  const { signals } = useSignals();
  const { userId: currentUserId } = useLocalIdentity();
  const { profile, displayName, isLoaded: profileLoaded } = useUserProfile();
  const {
    comments,
    addComment,
    editComment,
    deleteComment,
    toggleHelpful,
    reportComment,
    isLoaded: commentsLoaded,
  } = useComments();

  const [replyingTo, setReplyingTo] = useState<ReplyTarget | null>(null);

  const signal = signals.find((item) => item.id === signalId && item.isActive) ?? null;

  const threads = useMemo(
    () => buildCommentThreads(getCommentsForSignal(comments, signalId)),
    [comments, signalId]
  );
  const activeCount = countActiveComments(comments, signalId);

  function handleSubmit(text: string) {
    if (!currentUserId) return;
    addComment({
      signalId,
      userId: currentUserId,
      userName: displayName,
      avatar: profile.avatar,
      text,
      parentCommentId: replyingTo?.id ?? null,
    });
    setReplyingTo(null);
  }

  if (!signal) {
    return (
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pt-6 sm:px-6 sm:pt-8">
          <CommentsHeader />
          <section className="rounded-3xl border border-slate-200/70 bg-white p-7 text-center shadow-card">
            <p className="text-sm text-slate-500">
              No encontramos esta señalización. Puede haber sido retirada.
            </p>
            <Link
              href="/reportes"
              className="mt-4 inline-flex items-center justify-center rounded-full bg-lime-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-control transition hover:bg-lime-300"
            >
              Volver a Señalizaciones
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-32">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pt-6 sm:px-6 sm:pt-8">
        <CommentsHeader />
        <SignalSummaryCard report={signal} />

        <div>
          <p className="text-label text-slate-400">Comunidad</p>
          <h2 className="mt-1 text-h2 text-slate-950">
            {activeCount > 0 ? `Comentarios (${activeCount})` : "Comentarios"}
          </h2>
        </div>

        {!commentsLoaded ? null : threads.length === 0 ? (
          <CommentsEmptyState />
        ) : (
          <div className="flex flex-col divide-y divide-slate-200/70 rounded-3xl border border-slate-200/70 bg-white px-4 shadow-card sm:px-5">
            {threads.map((thread) => (
              <CommentThread
                key={thread.comment.id}
                thread={thread}
                currentUserId={currentUserId}
                onReply={(id, userName) => setReplyingTo({ id, userName })}
                onToggleHelpful={(id) => currentUserId && toggleHelpful(id, currentUserId)}
                onEdit={(id, text) => currentUserId && editComment(id, currentUserId, text)}
                onDelete={(id) => currentUserId && deleteComment(id, currentUserId)}
                onReport={(id) => currentUserId && reportComment(id, currentUserId)}
              />
            ))}
          </div>
        )}
      </div>

      <CommentComposer
        avatarName={displayName}
        avatar={profile.avatar}
        disabled={!currentUserId || !profileLoaded}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        onSubmit={handleSubmit}
      />
    </main>
  );
}
