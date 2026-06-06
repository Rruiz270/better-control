"use server";

import { db } from "@/db";
import { expenses, costCenters, supplierCostCenter } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireSession, isAdmin, AuthorizationError, type SessionUser } from "@/lib/authorization";

// Dados financeiros sensíveis → só admin.
async function assertAdmin() {
  const s = await requireSession();
  if (!isAdmin(s.user as SessionUser)) throw new AuthorizationError("Apenas admin acessa despesas.");
  return s;
}

export async function getCostCenters() {
  await assertAdmin();
  return db.select().from(costCenters).orderBy(costCenters.name);
}

export type SupplierRow = {
  name: string;
  kind: "fornecedor" | "pessoa";
  total: number;
  costCenterId: string | null;
};

/** Ledger agregado por fornecedor/pessoa + resumo por centro de custo. */
export async function getExpenseLedger(year: number): Promise<{
  suppliers: SupplierRow[];
  byCostCenter: { costCenterId: string | null; total: number }[];
  total: number;
}> {
  await assertAdmin();
  const rows = await db.select().from(expenses).where(eq(expenses.year, year));

  const bySupplier = new Map<string, SupplierRow>();
  const byCC = new Map<string | null, number>();
  let total = 0;
  for (const r of rows) {
    const v = Number(r.value);
    total += v;
    const cur = bySupplier.get(r.name) ?? { name: r.name, kind: r.kind, total: 0, costCenterId: r.costCenterId };
    cur.total += v;
    if (r.costCenterId) cur.costCenterId = r.costCenterId;
    bySupplier.set(r.name, cur);
    byCC.set(r.costCenterId, (byCC.get(r.costCenterId) ?? 0) + v);
  }

  return {
    suppliers: [...bySupplier.values()].sort((a, b) => b.total - a.total),
    byCostCenter: [...byCC.entries()].map(([costCenterId, t]) => ({ costCenterId, total: t })),
    total,
  };
}

/**
 * Categoriza um fornecedor/pessoa num centro de custo. Persiste a regra (sobrevive
 * ao re-sync) E aplica retroativamente a todos os lançamentos desse nome.
 */
export async function assignSupplierCostCenter(name: string, costCenterId: string | null) {
  await assertAdmin();
  if (costCenterId) {
    await db.insert(supplierCostCenter)
      .values({ name, costCenterId })
      .onConflictDoUpdate({ target: supplierCostCenter.name, set: { costCenterId, updatedAt: new Date() } });
  } else {
    await db.delete(supplierCostCenter).where(eq(supplierCostCenter.name, name));
  }
  await db.update(expenses).set({ costCenterId }).where(eq(expenses.name, name));
  revalidatePath("/", "layout");
}
