import CommentItem from "./CommentItem";
import type { CommentThread as CommentThreadData } from "@/lib/comments";

type CommentThreadProps = {
  thread: CommentThreadData;
  currentUserId: string | null;
  onReply: (commentId: string, userName: string) => void;
  onToggleHelpful: (commentId: string) => void;
  onEdit: (commentId: string, text: string) => void;
  onDelete: (commentId: string) => void;
  onReport: (commentId: string) => void;
};

// Comentario de nivel superior + sus respuestas, ligeramente indentadas
// (sección 5) con un borde fino en vez de una card propia — "lista limpia
// y natural", no una card gigante por comentario.
export default function CommentThread({
  thread,
  currentUserId,
  onReply,
  onToggleHelpful,
  onEdit,
  onDelete,
  onReport,
}: CommentThreadProps) {
  const { comment, replies } = thread;

  return (
    <div>
      <CommentItem
        comment={comment}
        currentUserId={currentUserId}
        onReply={() => onReply(comment.id, comment.userName)}
        onToggleHelpful={() => onToggleHelpful(comment.id)}
        onEdit={(text) => onEdit(comment.id, text)}
        onDelete={() => onDelete(comment.id)}
        onReport={() => onReport(comment.id)}
      />

      {replies.length > 0 && (
        <div className="ml-4 flex flex-col divide-y divide-slate-100 border-l-2 border-slate-100 pl-4 sm:ml-6 sm:pl-5">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              isReply
              onToggleHelpful={() => onToggleHelpful(reply.id)}
              onEdit={(text) => onEdit(reply.id, text)}
              onDelete={() => onDelete(reply.id)}
              onReport={() => onReport(reply.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
