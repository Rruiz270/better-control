"use server";

import { db } from "@/db";
import { expenses, costCenters, supplierCostCenter, areas } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireFinanceiroAccess } from "@/lib/authorization";

// Dados financeiros sensíveis → só Modo Financeiro (Raphael + Carlos).
const assertFinanceiro = requireFinanceiroAccess;

export async function getCostCenters() {
  await assertFinanceiro();
  return db.select().from(costCenters).orderBy(costCenters.name);
}

/** Verticais (unidades de negócio) p/ a 2ª dimensão de custo. */
export async function getVerticais() {
  await assertFinanceiro();
  return db.select({ id: areas.id, name: areas.name, color: areas.color }).from(areas).orderBy(areas.name);
}

/** Resumo por centro de custo (categoria) E por vertical (área). */
export async function getCostCenterDashboard(year: number) {
  await assertFinanceiro();
  const rows = await db.select().from(expenses).where(eq(expenses.year, year));
  const ccs = await db.select().from(costCenters);
  const ars = await db.select().from(areas);
  const ccName = new Map(ccs.map((c) => [c.id, c]));
  const arName = new Map(ars.map((a) => [a.id, a]));

  const byCC = new Map<string | null, { total: number; count: number }>();
  const byArea = new Map<string | null, number>();
  let total = 0;
  for (const r of rows) {
    const v = Number(r.value);
    total += v;
    const c = byCC.get(r.costCenterId) ?? { total: 0, count: 0 };
    c.total += v; c.count += 1;
    byCC.set(r.costCenterId, c);
    byArea.set(r.areaId, (byArea.get(r.areaId) ?? 0) + v);
  }

  const centers = [...byCC.entries()]
    .map(([id, d]) => ({ id, name: id ? ccName.get(id)?.name ?? "—" : "Sem categoria", color: id ? ccName.get(id)?.color ?? "#94A3B8" : "#F59E0B", total: d.total, count: d.count }))
    .sort((a, b) => b.total - a.total);
  const verticais = [...byArea.entries()]
    .map(([id, t]) => ({ id, name: id ? arName.get(id)?.name ?? "—" : "Sem vertical", color: id ? arName.get(id)?.color ?? "#94A3B8" : "#F59E0B", total: t }))
    .sort((a, b) => b.total - a.total);

  return { centers, verticais, total, unassignedCC: byCC.get(null)?.total ?? 0, unassignedArea: byArea.get(null) ?? 0 };
}

export type SupplierRow = {
  entityKey: string;
  name: string;
  taxId: string | null;
  kind: "fornecedor" | "pessoa";
  total: number;
  costCenterId: string | null;
  areaId: string | null;
};

export async function getExpenseLedger(year: number): Promise<{ suppliers: SupplierRow[]; total: number }> {
  await assertFinanceiro();
  const rows = await db.select().from(expenses).where(eq(expenses.year, year));

  const bySupplier = new Map<string, SupplierRow>();
  let total = 0;
  for (const r of rows) {
    const v = Number(r.value);
    total += v;
    const ek = r.entityKey || r.name;
    const cur = bySupplier.get(ek) ?? { entityKey: ek, name: r.name, taxId: r.taxId, kind: r.kind, total: 0, costCenterId: r.costCenterId, areaId: r.areaId };
    cur.total += v;
    if (r.name.length > cur.name.length) cur.name = r.name;
    if (r.costCenterId) cur.costCenterId = r.costCenterId;
    if (r.areaId) cur.areaId = r.areaId;
    bySupplier.set(ek, cur);
  }

  return { suppliers: [...bySupplier.values()].sort((a, b) => b.total - a.total), total };
}

/** Upsert da regra (mantém a outra dimensão); apaga a linha se ambas vazias. */
async function upsertRule(entityKey: string, patch: { costCenterId?: string | null; areaId?: string | null }) {
  const [ex] = await db.select().from(supplierCostCenter).where(eq(supplierCostCenter.name, entityKey)).limit(1);
  const costCenterId = patch.costCenterId !== undefined ? patch.costCenterId : ex?.costCenterId ?? null;
  const areaId = patch.areaId !== undefined ? patch.areaId : ex?.areaId ?? null;
  if (!costCenterId && !areaId) {
    if (ex) await db.delete(supplierCostCenter).where(eq(supplierCostCenter.name, entityKey));
    return;
  }
  await db.insert(supplierCostCenter)
    .values({ name: entityKey, costCenterId, areaId })
    .onConflictDoUpdate({ target: supplierCostCenter.name, set: { costCenterId, areaId, updatedAt: new Date() } });
}

/** Categoria (natureza). Persiste por entityKey e back-fill nos lançamentos. */
export async function assignSupplierCostCenter(entityKey: string, costCenterId: string | null) {
  await assertFinanceiro();
  await upsertRule(entityKey, { costCenterId });
  await db.update(expenses).set({ costCenterId }).where(eq(expenses.entityKey, entityKey));
  revalidatePath("/", "layout");
}

/** Vertical (unidade de negócio). Persiste por entityKey e back-fill. */
export async function assignSupplierArea(entityKey: string, areaId: string | null) {
  await assertFinanceiro();
  await upsertRule(entityKey, { areaId });
  await db.update(expenses).set({ areaId }).where(eq(expenses.entityKey, entityKey));
  revalidatePath("/", "layout");
}
