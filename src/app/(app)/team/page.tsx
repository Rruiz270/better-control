import { db } from "@/db";
import { users, areas } from "@/db/schema";
import { eq } from "drizzle-orm";
import Header from "@/components/layout/Header";

export default async function TeamPage() {
  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      areaId: users.areaId,
      phone: users.phone,
      areaName: areas.name,
    })
    .from(users)
    .leftJoin(areas, eq(users.areaId, areas.id));

  const admins = allUsers.filter((u) => u.role === "admin");
  const heads = allUsers.filter((u) => u.role === "head");
  const members = allUsers.filter((u) => u.role === "member");

  function UserCard({ user }: { user: (typeof allUsers)[0] }) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full gradient-main flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
          {user.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-navy truncate">
            {user.name}
          </p>
          <p className="text-xs text-gray-400 truncate">{user.email}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs font-medium text-gray-500 capitalize">
            {user.role}
          </p>
          {user.areaName && (
            <p className="text-xs text-gray-400">{user.areaName}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title="Equipe" />
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
        {admins.length > 0 && (
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Board / Socios ({admins.length})
            </h3>
            <div className="space-y-2">
              {admins.map((u) => (
                <UserCard key={u.id} user={u} />
              ))}
            </div>
          </section>
        )}

        {heads.length > 0 && (
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Heads de Area ({heads.length})
            </h3>
            <div className="space-y-2">
              {heads.map((u) => (
                <UserCard key={u.id} user={u} />
              ))}
            </div>
          </section>
        )}

        {members.length > 0 && (
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Membros ({members.length})
            </h3>
            <div className="space-y-2">
              {members.map((u) => (
                <UserCard key={u.id} user={u} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
