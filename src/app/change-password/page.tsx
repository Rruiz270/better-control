export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import ChangePasswordForm from "@/components/auth/ChangePasswordForm";

export default async function ChangePasswordPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
        <div className="text-lg font-extrabold tracking-tight text-navy mb-1">Better<span className="text-cyan">Control</span></div>
        <p className="text-xs text-gray-400 mb-4">Trocar senha</p>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
