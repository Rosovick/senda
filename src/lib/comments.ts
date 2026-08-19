// Modelo de comentarios comunitarios de una señalización. Arquitectura
// paralela a src/lib/signalVerifications.ts (misma idea: colección aparte,
// relacionada por signalId, nunca mezclada con la señalización en sí) —
// una señalización puede tener muchos comentarios, igual que puede tener
// muchas verificaciones.
//
// SENDA no tiene todavía cuentas reales ni un directorio de usuarios (ver
// useLocalIdentity.ts): cada dispositivo es "un" usuario anónimo. Por eso
// userName/avatar se guardan como una FOTO al momento de comentar (mismo
// dato que ya expone useUserProfile().displayName/profile.avatar), en vez
// de un id que habría que resolver contra un directorio que no existe.
import type { UserAvatar } from "@/hooks/useUserProfile";

export const COMMENT_MAX_LENGTH = 500;

export type SignalComment = {
  id: string;
  signalId: string;
  userId: string;
  userName: string;
  avatar: UserAvatar;
  text: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO: cuándo se editó por última vez (igual a createdAt si nunca se editó)
  // Máximo 1 nivel (sección 5): una respuesta siempre apunta a un
  // comentario de nivel superior, nunca a otra respuesta — se garantiza en
  // la UI (CommentItem no ofrece "Responder" dentro de una respuesta), no
  // hace falta validarlo acá.
  parentCommentId: string | null;
  // Usuarios distintos que marcaron "Útil" — un array (no un contador
  // suelto) para poder saber si YA lo marcó el usuario actual después de
  // recargar, mismo criterio que confirmedCount/SignalVerification.
  helpfulVotes: string[];
  // Moderación mínima (sección 12): reportar solo registra quién lo marcó,
  // no hay umbral de auto-ocultamiento — eso sería inventar una política de
  // moderación que nadie pidió todavía.
  reportedBy: string[];
  // Soft delete, mismo criterio que Report.deletedAt (lib/reports.ts):
  // nunca se borra la fila. Si tenía respuestas, esas siguen existiendo —
  // se muestra un placeholder en su lugar (ver CommentItem) en vez de
  // perder la conversación.
  deletedAt: string | null;
};

const FALLBACK_USER_NAME = "Vecino/a de la comunidad";

function isUserAvatar(value: unknown): value is UserAvatar {
  if (!value || typeof value !== "object") return false;
  const avatar = value as { type?: unknown };
  if (avatar.type === "initials") return true;
  if (avatar.type === "preset") return typeof (avatar as { id?: unknown }).id === "string";
  if (avatar.type === "upload") return typeof (avatar as { dataUrl?: unknown }).dataUrl === "string";
  return false;
}

// Única vía para leer un SignalComment que puede venir de localStorage
// (dato corrupto, o de una fila incompleta): un comentario sin
// id/signalId/userId/texto real no puede mostrarse ni participar del
// conteo — se descarta acá en vez de dejarlo pasar con valores inventados
// (mismo criterio que normalizeVerification en lib/signalVerifications.ts).
export function normalizeComment(raw: SignalComment): SignalComment | null {
  if (
    !raw ||
    typeof raw.id !== "string" ||
    typeof raw.signalId !== "string" ||
    typeof raw.userId !== "string" ||
    typeof raw.text !== "string" ||
    raw.text.trim().length === 0
  ) {
    return null;
  }

  return {
    id: raw.id,
    signalId: raw.signalId,
    userId: raw.userId,
    userName: typeof raw.userName === "string" && raw.userName.trim() ? raw.userName : FALLBACK_USER_NAME,
    avatar: isUserAvatar(raw.avatar) ? raw.avatar : { type: "initials" },
    text: raw.text,
    createdAt: raw.createdAt ?? raw.updatedAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? raw.createdAt ?? new Date().toISOString(),
    parentCommentId: typeof raw.parentCommentId === "string" ? raw.parentCommentId : null,
    helpfulVotes: Array.isArray(raw.helpfulVotes) ? raw.helpfulVotes.filter((id) => typeof id === "string") : [],
    reportedBy: Array.isArray(raw.reportedBy) ? raw.reportedBy.filter((id) => typeof id === "string") : [],
    deletedAt: typeof raw.deletedAt === "string" ? raw.deletedAt : null,
  };
}

export function getCommentsForSignal(comments: SignalComment[], signalId: string): SignalComment[] {
  return comments.filter((comment) => comment.signalId === signalId);
}

// Cantidad mostrada en "Ver comentarios (N)" (sección 13): solo cuenta
// comentarios activos, igual que un reporte retirado no cuenta como
// señalización activa en ningún otro lado de la app.
export function countActiveComments(comments: SignalComment[], signalId: string): number {
  return comments.filter((comment) => comment.signalId === signalId && !comment.deletedAt).length;
}

// Estructura en 2 niveles para renderizar: comentarios de nivel superior,
// cada uno con sus respuestas (si las tiene) ya agrupadas. Pura
// presentación — no decide qué se ve o no, eso lo sigue decidiendo
// deletedAt en el componente.
export type CommentThread = {
  comment: SignalComment;
  replies: SignalComment[];
};

// Una respuesta eliminada nunca tiene hijos propios (máximo 1 nivel): se
// puede ocultar del todo sin huérfanos. Un comentario de nivel superior
// eliminado SOLO se mantiene (como placeholder "Comentario eliminado") si
// todavía tiene alguna respuesta activa debajo — si no le queda ninguna,
// también se oculta. Así, cuando ya no queda nada activo en un hilo, el
// hilo entero desaparece y puede volver a mostrarse el empty state
// (sección 9) en vez de dos tombstones vacíos.
export function buildCommentThreads(comments: SignalComment[]): CommentThread[] {
  const topLevel = comments
    .filter((comment) => !comment.parentCommentId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return topLevel
    .map((comment) => ({
      comment,
      replies: comments
        .filter((reply) => reply.parentCommentId === comment.id && !reply.deletedAt)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    }))
    .filter((thread) => !thread.comment.deletedAt || thread.replies.length > 0);
}
