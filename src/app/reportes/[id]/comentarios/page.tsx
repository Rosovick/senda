import CommentsScreen from "@/components/comments/CommentsScreen";

// El id de la señalización se lee del lado del cliente con useParams()
// (CommentsScreen), igual que ReportWizard ya lee ?edit=<id> con
// useSearchParams: la señalización real se busca en useSignals(), la
// misma colección que ya usa /reportes — nunca un segundo fetch/sistema.
export default function ComentariosPage() {
  return <CommentsScreen />;
}
