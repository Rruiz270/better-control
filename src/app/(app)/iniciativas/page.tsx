export const dynamic = "force-dynamic";

import Header from "@/components/layout/Header";
import { db } from "@/db";
import { areas, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { isAdmin, type SessionUser } from "@/lib/policy";
import { getInitiatives } from "@/lib/actions/executive";
import IniciativasList from "@/components/executive/IniciativasList";

export default async function IniciativasPage() {
  const session = await auth();
  const canEdit = session?.user ? isAdmin(session.user as SessionUser) : false;
  const [rows, ars, us] = await Promise.all([
    getInitiatives(),
    db.select({ id: areas.id, name: areas.name }).from(areas),
    db.select({ id: users.id, name: users.name }).from(users),
  ]);

  return (
    <div className="min-h-screen">
      <Header title="Iniciativas Estratégicas" />
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <p className="text-xs text-gray-400 mb-4">As apostas do board, acima da operação. Cada uma com dono, status e próximo marco.</p>
        <IniciativasList
          rows={rows.map((r) => ({ i: { id: r.i.id, name: r.i.name, status: r.i.status, nextMilestone: r.i.nextMilestone, impact: r.i.impact }, areaName: r.areaName, owner: r.owner }))}
          areas={ars}
          users={us}
          canEdit={canEdit}
        />
      </div>
    </div>
  );
}
