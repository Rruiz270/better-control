export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdmin, type SessionUser } from "@/lib/policy";
import Header from "@/components/layout/Header";
import UserManagement from "@/components/admin/UserManagement";
import { listUsers } from "@/lib/actions/users";
import { getAreas } from "@/lib/actions/areas";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!isAdmin(session.user as SessionUser)) redirect("/dashboard");

  const [users, areas] = await Promise.all([listUsers(), getAreas()]);

  return (
    <div className="min-h-screen">
      <Header title="Admin · Usuários" />
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <UserManagement
          users={users.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            areaId: u.areaId,
            areaName: u.areaName,
            areaIds: u.areaIds,
            status: u.status,
          }))}
          areas={areas.map((a) => ({ id: a.id, name: a.name }))}
        />
      </div>
    </div>
  );
}
