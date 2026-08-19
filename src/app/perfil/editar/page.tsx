import EditProfileForm from "@/components/profile/edit/EditProfileForm";
import EditProfileHeader from "@/components/profile/edit/EditProfileHeader";

export default function EditarPerfilPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-12">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pt-6 sm:px-6 sm:pt-8">
        <EditProfileHeader />
        <EditProfileForm />
      </div>
    </main>
  );
}
