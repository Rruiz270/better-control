export const dynamic = "force-dynamic";

import Header from "@/components/layout/Header";
import { db } from "@/db";
import { areas } from "@/db/schema";
import { auth } from "@/lib/auth";
import { isAdmin, type SessionUser } from "@/lib/policy";
import { getAreaTargets, getCashView } from "@/lib/actions/executive";
import MetasEditor from "@/components/executive/MetasEditor";

export default async function MetasPage() {
  const year = new Date().getFullYear();
  const session = await auth();
  if (!session?.user || !isAdmin(session.user as SessionUser)) {
    return <div className="min-h-screen"><Header title="Metas & Caixa" /><p className="p-8 text-sm text-gray-400 text-center">Apenas admin define metas e caixa.</p></div>;
  }
  const [ars, targets, cash] = await Promise.all([
    db.select().from(areas),
    getAreaTargets(year),
    getCashView(),
  ]);

  return (
    <div className="min-h-screen">
      <Header title="Metas & Caixa" />
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <p className="text-xs text-gray-400 mb-4">Defina a meta de receita e o múltiplo (30x) por vertical e o caixa do grupo. Alimenta o runway e o % de meta nos cockpits.</p>
        <MetasEditor
          areas={ars.map((a) => ({ id: a.id, name: a.name, color: a.color }))}
          targets={targets.map((t) => ({ areaId: t.areaId, revenueTarget: t.revenueTarget, multiplierTarget: t.multiplierTarget }))}
          cash={cash.cash}
          cashDate={cash.date}
          year={year}
        />
      </div>
    </div>
  );
}
