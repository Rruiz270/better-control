"use server";

import { db } from "@/db";
import { financialLines, financialLineLog, projects, users, collaboratorCost, allocations, expenses, costCenters } from "@/db/schema";
import { and, eq, desc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  requireSession,
  requireAreaAccess,
  requireProjectAccess,
  AuthorizationError,
  isAdmin,
  userAreaIds,
  type SessionUser,
} from "@/lib/authorization";
import { ALL_LINES, LIVE_LINES, type FinEntity, type FinLine } from "@/lib/financialLines.constants";

const MONTH_KEYS = Array.from({ length: 12 }, (_, i) => `m${i + 1}` as const);
const zeros = () => Array(12).fill(0) as number[];

async function areaIdForProject(projectId: string): Promise<string | null> {
  const [row] = await db.select({ areaId: projects.areaId }).from(projects).where(eq(projects.id, projectId)).limit(1);
  return row?.areaId ?? null;
}

async function assertCanView(entityType: FinEntity, entityId: string) {
  const session = await requireSession();
  const user = session.user as SessionUser;
  if (isAdmin(user)) return session;
  const areaId = entityType === "area" ? entityId : await areaIdForProject(entityId);
  if (!areaId || !(await userAreaIds(user.id)).includes(areaId)) throw new AuthorizationError();
  return session;
}

/** Editar é ação de gestão: admin ou HEAD da área (member = leitura). */
async function assertCanEdit(entityType: FinEntity, entityId: string) {
  return entityType === "area" ? requireAreaAccess(entityId) : requireProjectAccess(entityId);
}

/** Salários Actual: custo de pessoal rateado via allocations.
 *  Custo efetivo por pessoa×mês = collaborator_cost (manual) → expenses (despesa-com-pessoal via taxId) → 0.
 *  - Projeto: custo proporcional de quem tem allocation neste projeto.
 *  - Área: soma projetos da área + fallback (área home) para quem não tem allocation. */
async function computeSalariosActual(entityType: FinEntity, entityId: string, year: number): Promise<number[]> {
  // 1. Manual costs
  const manualRows = await db
    .select({ userId: collaboratorCost.userId, month: collaboratorCost.month, monthlyCost: collaboratorCost.monthlyCost })
    .from(collaboratorCost)
    .where(eq(collaboratorCost.year, year));
  const manualByUserMonth = new Map<string, number>();
  for (const c of manualRows) manualByUserMonth.set(`${c.userId}:${c.month}`, Number(c.monthlyCost));

  // 2. Real costs from expenses (people-cost categories: pessoal, PJ, prestador)
  const peopleSlugs = ["despesa-com-pessoal", "serv-terceiros-pj", "prestador-de-servico"];
  const peopleCcs = await db
    .select({ id: costCenters.id })
    .from(costCenters)
    .where(inArray(costCenters.slug, peopleSlugs));
  const ccIds = peopleCcs.map((c) => c.id);
  const expRows = ccIds.length > 0
    ? await db
        .select({ entityKey: expenses.entityKey, month: expenses.month, value: expenses.value })
        .from(expenses)
        .where(and(eq(expenses.year, year), inArray(expenses.costCenterId, ccIds)))
    : [];
  // entityKey = taxId (CPF/CNPJ), group by taxId+month
  const realByEntityMonth = new Map<string, number>();
  for (const e of expRows) {
    const key = `${e.entityKey}:${e.month}`;
    realByEntityMonth.set(key, (realByEntityMonth.get(key) ?? 0) + Number(e.value));
  }

  // 3. User taxIds → bridge expenses to users
  const userTaxRows = await db.select({ id: users.id, taxId: users.taxId }).from(users);
  const userTaxMap = new Map(userTaxRows.map((u) => [u.id, u.taxId]));

  // 4. Effective cost per user×month: manual ?? real(taxId) ?? 0
  const costMap = new Map<string, number>();
  const allUserIds = new Set([
    ...manualRows.map((c) => c.userId),
    ...userTaxRows.filter((u) => u.taxId && realByEntityMonth.has(`${u.taxId}:1`)).map((u) => u.id),
  ]);
  // Expand: include any user that has a real expense in any month
  for (const u of userTaxRows) {
    if (!u.taxId) continue;
    for (let m = 1; m <= 12; m++) {
      if (realByEntityMonth.has(`${u.taxId}:${m}`)) { allUserIds.add(u.id); break; }
    }
  }

  for (const userId of allUserIds) {
    const taxId = userTaxMap.get(userId);
    for (let m = 1; m <= 12; m++) {
      const manual = manualByUserMonth.get(`${userId}:${m}`);
      const real = taxId ? realByEntityMonth.get(`${taxId}:${m}`) : undefined;
      const cost = manual ?? real ?? 0;
      if (cost > 0) costMap.set(`${userId}:${m}`, cost);
    }
  }

  if (costMap.size === 0) return zeros();

  // 5. Allocations
  const allocs = await db
    .select({ userId: allocations.userId, month: allocations.month, projectId: allocations.projectId, percent: allocations.percent })
    .from(allocations)
    .where(eq(allocations.year, year));

  const allocMap = new Map<string, Map<string, number>>();
  for (const a of allocs) {
    const key = `${a.userId}:${a.month}`;
    if (!allocMap.has(key)) allocMap.set(key, new Map());
    allocMap.get(key)!.set(a.projectId, Number(a.percent));
  }

  if (entityType === "project") {
    return computeForProject(entityId, allUserIds, costMap, allocMap);
  }

  // Area: need project IDs + user home areas for fallback
  const projRows = await db.select({ id: projects.id }).from(projects).where(eq(projects.areaId, entityId));
  const areaProjectIds = new Set(projRows.map((p) => p.id));
  const userRows = await db.select({ id: users.id, areaId: users.areaId }).from(users);
  const userAreaMap = new Map(userRows.map((u) => [u.id, u.areaId]));

  return computeForArea(entityId, areaProjectIds, userAreaMap, allUserIds, costMap, allocMap);
}

function computeForProject(
  projectId: string, userIds: Set<string>,
  costMap: Map<string, number>, allocMap: Map<string, Map<string, number>>,
): number[] {
  const result = zeros();
  for (let month = 1; month <= 12; month++) {
    let total = 0;
    for (const userId of userIds) {
      const cost = costMap.get(`${userId}:${month}`);
      if (!cost || cost <= 0) continue;
      const ua = allocMap.get(`${userId}:${month}`);
      if (!ua || ua.size === 0) continue;
      const projPct = ua.get(projectId);
      if (!projPct || projPct <= 0) continue;
      const totalPct = [...ua.values()].reduce((a, b) => a + b, 0);
      if (totalPct > 0) total += cost * (projPct / totalPct);
    }
    result[month - 1] = Math.round(total * 100) / 100;
  }
  return result;
}

function computeForArea(
  areaId: string, areaProjectIds: Set<string>, userAreaMap: Map<string, string | null>,
  userIds: Set<string>, costMap: Map<string, number>, allocMap: Map<string, Map<string, number>>,
): number[] {
  const result = zeros();
  for (let month = 1; month <= 12; month++) {
    let total = 0;
    for (const userId of userIds) {
      const cost = costMap.get(`${userId}:${month}`);
      if (!cost || cost <= 0) continue;
      const ua = allocMap.get(`${userId}:${month}`);
      if (!ua || ua.size === 0) {
        if (userAreaMap.get(userId) === areaId) total += cost;
        continue;
      }
      const totalPct = [...ua.values()].reduce((a, b) => a + b, 0);
      if (totalPct === 0) continue;
      let areaPct = 0;
      for (const [projId, pct] of ua) {
        if (areaProjectIds.has(projId)) areaPct += pct;
      }
      if (areaPct > 0) total += cost * (areaPct / totalPct);
    }
    result[month - 1] = Math.round(total * 100) / 100;
  }
  return result;
}

/** Todas as linhas de uma entidade+ano → { line: number[12] }. */
export async function getFinancialLines(
  entityType: FinEntity,
  entityId: string,
  year: number
): Promise<Record<FinLine, number[]>> {
  await assertCanView(entityType, entityId);
  const rows = await db
    .select()
    .from(financialLines)
    .where(and(eq(financialLines.entityType, entityType), eq(financialLines.entityId, entityId), eq(financialLines.year, year)));
  const out = Object.fromEntries(ALL_LINES.map((l) => [l, zeros()])) as Record<FinLine, number[]>;
  for (const r of rows) {
    out[r.line as FinLine] = MONTH_KEYS.map((k) => Number(r[k as keyof typeof r] ?? 0));
  }
  out.salarios_actual = await computeSalariosActual(entityType, entityId, year);
  return out;
}

/** Roll-up da VERTICAL: p/ cada linha, soma o nível ÁREA + TODOS os projetos da
 * área. É o que a página da área mostra (read-only) — o head edita nos PRODUTOS
 * e a vertical reflete a soma. Linhas Live (Vindi/OMIE) ficam no nível área. */
export async function getAreaRollupLines(areaId: string, year: number): Promise<Record<FinLine, number[]>> {
  await assertCanView("area", areaId);
  const projIds = (await db.select({ id: projects.id }).from(projects).where(eq(projects.areaId, areaId))).map((p) => p.id);
  const ids = [areaId, ...projIds];
  const rows = await db
    .select()
    .from(financialLines)
    .where(and(eq(financialLines.year, year), inArray(financialLines.entityId, ids)));
  const out = Object.fromEntries(ALL_LINES.map((l) => [l, zeros()])) as Record<FinLine, number[]>;
  for (const r of rows) {
    const cur = out[r.line as FinLine];
    MONTH_KEYS.forEach((k, i) => { cur[i] += Number(r[k as keyof typeof r] ?? 0); });
  }
  out.salarios_actual = await computeSalariosActual("area", areaId, year);
  return out;
}

function monthFields(months: number[]): Record<string, string> {
  return Object.fromEntries(MONTH_KEYS.map((k, i) => [k, String(Number(months[i] ?? 0))]));
}

/** Salva 1 linha (12 meses) + registra no log por campo cada mês alterado. */
export async function saveFinancialLine(input: {
  entityType: FinEntity;
  entityId: string;
  year: number;
  line: FinLine;
  months: number[]; // length 12
  note?: string;
}) {
  if (!ALL_LINES.includes(input.line)) throw new AuthorizationError("Linha inválida.");
  if (LIVE_LINES.includes(input.line)) throw new AuthorizationError("Linha Live é preenchida pela API (somente leitura).");
  const session = await assertCanEdit(input.entityType, input.entityId);
  const userId = session.user.id;
  // After LIVE_LINES guard, the line is guaranteed to be a stored DB enum value.
  const dbLine = input.line as typeof financialLines.$inferInsert.line;

  // valores antigos p/ o diff do log
  const [prev] = await db
    .select()
    .from(financialLines)
    .where(and(eq(financialLines.entityType, input.entityType), eq(financialLines.entityId, input.entityId), eq(financialLines.year, input.year), eq(financialLines.line, dbLine)))
    .limit(1);
  const old = prev ? MONTH_KEYS.map((k) => Number(prev[k as keyof typeof prev] ?? 0)) : zeros();

  const fields = monthFields(input.months);
  await db
    .insert(financialLines)
    .values({ entityType: input.entityType, entityId: input.entityId, year: input.year, line: dbLine, updatedBy: userId, updatedAt: new Date(), ...fields } as typeof financialLines.$inferInsert)
    .onConflictDoUpdate({
      target: [financialLines.entityType, financialLines.entityId, financialLines.year, financialLines.line],
      set: { ...fields, updatedBy: userId, updatedAt: new Date() },
    });

  // log por campo (mês a mês) — base do freeze + auditoria
  const logs: (typeof financialLineLog.$inferInsert)[] = [];
  for (let i = 0; i < 12; i++) {
    if (Number(old[i]) !== Number(input.months[i] ?? 0)) {
      logs.push({
        entityType: input.entityType, entityId: input.entityId, year: input.year, line: dbLine,
        month: i + 1, oldValue: String(old[i]), newValue: String(input.months[i] ?? 0),
        note: input.note ?? null, changedBy: userId,
      });
    }
  }
  if (logs.length) await db.insert(financialLineLog).values(logs);

  revalidatePath("/", "layout");
  return { changed: logs.length };
}

/** Log de alterações por campo (🅖) + base do freeze (🅕): o que mudou, de→para, quem, quando. */
export async function getFinancialLineLog(entityType: FinEntity, entityId: string, year: number) {
  await assertCanView(entityType, entityId);
  return db
    .select({
      line: financialLineLog.line, month: financialLineLog.month,
      oldValue: financialLineLog.oldValue, newValue: financialLineLog.newValue,
      note: financialLineLog.note, changedAt: financialLineLog.changedAt, by: users.name,
    })
    .from(financialLineLog)
    .leftJoin(users, eq(financialLineLog.changedBy, users.id))
    .where(and(eq(financialLineLog.entityType, entityType), eq(financialLineLog.entityId, entityId), eq(financialLineLog.year, year)))
    .orderBy(desc(financialLineLog.changedAt))
    .limit(300);
}

/** Freeze mês-a-mês (🅕): p/ cada linha×mês, o 1º valor projetado e o atual + quanto mudou. */
export async function getFinancialFreeze(entityType: FinEntity, entityId: string, year: number) {
  await assertCanView(entityType, entityId);
  const logs = await db
    .select()
    .from(financialLineLog)
    .where(and(eq(financialLineLog.entityType, entityType), eq(financialLineLog.entityId, entityId), eq(financialLineLog.year, year)))
    .orderBy(financialLineLog.changedAt);
  // 1º oldValue registrado = a projeção original; current = getFinancialLines
  const original = new Map<string, number>();
  for (const l of logs) {
    const k = `${l.line}:${l.month}`;
    if (!original.has(k)) original.set(k, Number(l.oldValue ?? 0));
  }
  const current = await getFinancialLines(entityType, entityId, year);
  const out: { line: FinLine; month: number; original: number; current: number; delta: number }[] = [];
  for (const [k, orig] of original) {
    const [line, m] = k.split(":");
    const cur = current[line as FinLine]?.[Number(m) - 1] ?? 0;
    if (orig !== cur) out.push({ line: line as FinLine, month: Number(m), original: orig, current: cur, delta: cur - orig });
  }
  return out;
}

/** Anos com dados (sempre inclui o ano atual). */
export async function getFinancialLineYears(entityType: FinEntity, entityId: string): Promise<number[]> {
  await assertCanView(entityType, entityId);
  const rows = await db
    .selectDistinct({ year: financialLines.year })
    .from(financialLines)
    .where(and(eq(financialLines.entityType, entityType), eq(financialLines.entityId, entityId)));
  const years = new Set(rows.map((r) => r.year));
  years.add(new Date().getFullYear());
  return [...years].sort((a, b) => a - b);
}
