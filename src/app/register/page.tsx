export const dynamic = "force-dynamic";

import RegisterForm from "@/components/auth/RegisterForm";
import { listAreasPublic } from "@/lib/actions/users";

export default async function RegisterPage() {
  const areas = await listAreasPublic();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
        <div className="text-lg font-extrabold tracking-tight text-navy mb-4">Better<span className="text-cyan">Control</span></div>
        <RegisterForm areas={areas} />
      </div>
    </div>
  );
}
