export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import Header from "@/components/layout/Header";
import SignOutButton from "@/components/shared/SignOutButton";

export default async function SettingsPage() {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="min-h-screen">
      <Header title="Configuracoes" />

      <div className="p-4 md:p-6 max-w-lg mx-auto space-y-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full gradient-main flex items-center justify-center text-lg font-bold text-white">
              {user?.name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-navy">{user?.name}</h2>
              <p className="text-sm text-gray-400">{user?.email}</p>
              <p className="text-xs text-gray-400 capitalize mt-0.5">
                {(user as Record<string, unknown>)?.role as string}
              </p>
            </div>
          </div>
        </div>

        <SignOutButton />
      </div>
    </div>
  );
}
