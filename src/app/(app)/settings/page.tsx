export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import Header from "@/components/layout/Header";
import SignOutButton from "@/components/shared/SignOutButton";
import AreaConfigPanel from "@/components/settings/AreaConfigPanel";
import { getAreas } from "@/lib/actions/areas";

export default async function SettingsPage() {
  const session = await auth();
  const user = session?.user;
  const isAdmin = (user as Record<string, unknown>)?.role === "admin";
  const areas = isAdmin ? await getAreas() : [];

  return (
    <div className="min-h-screen">
      <Header title="Configurações" />

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

        {isAdmin && (
          <a
            href="/admin/users"
            className="block bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-200 hover:shadow-md transition-all"
          >
            <h3 className="text-sm font-bold text-navy">Gerenciar Usuários</h3>
            <p className="text-xs text-gray-400">
              Criar/editar usuários, definir papéis e atribuir áreas.
            </p>
          </a>
        )}

        {isAdmin && (
          <a
            href="/admin/logs"
            className="block bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-200 hover:shadow-md transition-all"
          >
            <h3 className="text-sm font-bold text-navy">Logs de Mudanças</h3>
            <p className="text-xs text-gray-400">
              Auditoria completa: quem mudou o quê e quando.
            </p>
          </a>
        )}

        {isAdmin && areas.length > 0 && (
          <AreaConfigPanel
            areas={areas.map((a) => ({
              id: a.id,
              name: a.name,
              profile: a.profile,
              targetMultiplier: a.targetMultiplier,
            }))}
          />
        )}

        <SignOutButton />
      </div>
    </div>
  );
}
