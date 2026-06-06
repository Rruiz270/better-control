"use server";

import { db } from "@/db";
import { expenses, costCenters, supplierCostCenter } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireFinanceiroAccess } from "@/lib/authorization";

// Dados financeiros sensíveis → só Modo Financeiro (Raphael + Carlos).
const assertFinanceiro = requireFinanceiroAccess;

export async function getCostCenters() {
  await assertFinanceiro();
  return db.select().from(costCenters).orderBy(costCenters.name);
}

/** Resumo por centro de custo (alimenta o dashboard financeiro). */
export async function getCostCenterDashboard(year: number) {
  await assertFinanceiro();
  const rows = await db.select().from(expenses).where(eq(expenses.year, year));
  const ccs = await db.select().from(costCenters);
  const ccName = new Map(ccs.map((c) => [c.id, c]));

  const byCC = new Map<string | null, { total: number; count: number; months: number[] }>();
  let total = 0;
  for (const r of rows) {
    const v = Number(r.value);
    total += v;
    const cur = byCC.get(r.costCenterId) ?? { total: 0, count: 0, months: Array(12).fill(0) };
    cur.total += v;
    cur.count += 1;
    if (r.month >= 1 && r.month <= 12) cur.months[r.month - 1] += v;
    byCC.set(r.costCenterId, cur);
  }

  const centers = [...byCC.entries()]
    .map(([id, d]) => ({
      id,
      name: id ? ccName.get(id)?.name ?? "—" : "Sem centro",
      color: id ? ccName.get(id)?.color ?? "#94A3B8" : "#F59E0B",
      total: d.total,
      count: d.count,
      months: d.months,
    }))
    .sort((a, b) => b.total - a.total);

  return { centers, total, unassigned: byCC.get(null)?.total ?? 0 };
}

export type SupplierRow = {
  entityKey: string; // CPF/CNPJ quando há, senão nome — chave de consolidação
  name: string; // rótulo exibido
  taxId: string | null;
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
  await assertFinanceiro();
  const rows = await db.select().from(expenses).where(eq(expenses.year, year));

  // Consolida por entityKey (CPF/CNPJ ou nome) — junta variações de nome.
  const bySupplier = new Map<string, SupplierRow>();
  const byCC = new Map<string | null, number>();
  let total = 0;
  for (const r of rows) {
    const v = Number(r.value);
    total += v;
    const ek = r.entityKey || r.name;
    const cur = bySupplier.get(ek) ?? { entityKey: ek, name: r.name, taxId: r.taxId, kind: r.kind, total: 0, costCenterId: r.costCenterId };
    cur.total += v;
    // mantém o nome mais completo como rótulo
    if (r.name.length > cur.name.length) cur.name = r.name;
    if (r.costCenterId) cur.costCenterId = r.costCenterId;
    bySupplier.set(ek, cur);
    byCC.set(r.costCenterId, (byCC.get(r.costCenterId) ?? 0) + v);
  }

  return {
    suppliers: [...bySupplier.values()].sort((a, b) => b.total - a.total),
    byCostCenter: [...byCC.entries()].map(([costCenterId, t]) => ({ costCenterId, total: t })),
    total,
  };
}

/**
 * Categoriza uma entidade (CPF/CNPJ ou nome) num centro de custo. A regra é
 * keyed por `entityKey`, então sobrevive ao re-sync E pega todas as variações de
 * nome do mesmo documento. Aplica retroativamente a todos os lançamentos.
 * (supplierCostCenter.name guarda o entityKey.)
 */
export async function assignSupplierCostCenter(entityKey: string, costCenterId: string | null) {
  await assertFinanceiro();
  if (costCenterId) {
    await db.insert(supplierCostCenter)
      .values({ name: entityKey, costCenterId })
      .onConflictDoUpdate({ target: supplierCostCenter.name, set: { costCenterId, updatedAt: new Date() } });
  } else {
    await db.delete(supplierCostCenter).where(eq(supplierCostCenter.name, entityKey));
  }
  await db.update(expenses).set({ costCenterId }).where(eq(expenses.entityKey, entityKey));
  revalidatePath("/", "layout");
}
