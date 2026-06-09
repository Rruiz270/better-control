"use server";

import { db } from "@/db";
import {
  areas, financialLines, tasks, projects, allocations, users,
  areaTargets, appSettings, initiatives,
} from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireSession, requireFinanceiroAccess, isAdmin, type SessionUser } from "@/lib/authorization";
import { getNotas, getVendas, getAlunos, getDespesaMensal, getReceitas } from "@/lib/financeiroData";

const MONTH_KEYS = Array.from({ length: 12 }, (_, i) => `m${i + 1}` as const);
const sumRow = (r: Record<string, unknown>) => MONTH_KEYS.reduce((s, k) => s + Number(r[k] ?? 0), 0);

async function assertAdmin() {
  const s = await requireSession();
  if (!isAdmin(s.user as SessionUser)) throw new Error("Apenas admin.");
  return s;
}

/** Receita/custo actual por área (financial_plans) — fonte única do P&L de topo. */
async function areaActuals(year: number) {
  // Modelo NOVO: Cockpit/DRE leem FATURAMENTO (receita) + DESPESA ACTUAL (custo)
  // do financial_lines — números que os heads preenchem. As linhas Live (Vindi/
  // OMIE) ficam só como referência e NÃO alimentam o cockpit.
  const rows = await db.select().from(financialLines).where(and(eq(financialLines.entityType, "area"), eq(financialLines.year, year)));
  const m = new Map<string, { receita: number; custo: number }>();
  for (const r of rows) {
    const cur = m.get(r.entityId) ?? { receita: 0, custo: 0 };
    if (r.line === "faturamento") cur.receita += sumRow(r as unknown as Record<string, unknown>);
    if (r.line === "despesa_actual") cur.custo += sumRow(r as unknown as Record<string, unknown>);
    m.set(r.entityId, cur);
  }
  return m;
}

async function getCash(): Promise<{ cash: number; date: string | null }> {
  const rows = await db.select().from(appSettings);
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return { cash: Number(map.get("cash_balance") ?? 0), date: map.get("cash_date") ?? null };
}

export async function setCash(cash: number, date: string) {
  await assertAdmin();
  for (const [key, value] of [["cash_balance", String(cash)], ["cash_date", date]] as const) {
    await db.insert(appSettings).values({ key, value }).onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
  }
  revalidatePath("/", "layout");
}

export async function getAreaTargets(year: number) {
  await requireSession();
  return db.select().from(areaTargets).where(eq(areaTargets.year, year));
}

export async function getCashView(): Promise<{ cash: number; date: string | null }> {
  await requireSession();
  return getCash();
}

export async function setAreaTarget(areaId: string, year: number, revenueTarget: number, multiplierTarget: number) {
  await assertAdmin();
  await db.insert(areaTargets).values({ areaId, year, revenueTarget: String(revenueTarget), multiplierTarget: String(multiplierTarget) })
    .onConflictDoUpdate({ target: [areaTargets.areaId, areaTargets.year], set: { revenueTarget: String(revenueTarget), multiplierTarget: String(multiplierTarget), updatedAt: new Date() } });
  revalidatePath("/", "layout");
}

// --- CEO Cockpit -------------------------------------------------------------
export type CockpitVertical = {
  id: string; name: string; color: string;
  receita: number; custo: number; resultado: number; ratio: number | null;
  target: number; pctMeta: number; health: "green" | "amber" | "red";
  overdue: number; allocPct: number;
};
export type CeoCockpit = {
  verticais: CockpitVertical[];
  totalReceita: number; totalCusto: number; totalResultado: number;
  burn: number; runway: number | null; cash: number;
  overdueTotal: number; risks: { level: "red" | "amber"; tag: string; text: string }[];
};

export async function getCeoCockpit(year: number): Promise<CeoCockpit> {
  await assertAdmin();
  const month = new Date().getMonth() + 1;
  const ars = await db.select().from(areas);
  const actuals = await areaActuals(year);
  const targets = new Map((await db.select().from(areaTargets).where(eq(areaTargets.year, year))).map((t) => [t.areaId, t]));
  const allTasks = await db.select({ id: tasks.id, status: tasks.status, dueDate: tasks.dueDate, areaId: projects.areaId })
    .from(tasks).innerJoin(projects, eq(tasks.projectId, projects.id));
  const allUsers = await db.select({ id: users.id, areaId: users.areaId }).from(users);
  const allocs = await db.select({ userId: allocations.userId }).from(allocations).where(and(eq(allocations.year, year), eq(allocations.month, month)));
  const allocUsers = new Set(allocs.map((a) => a.userId));

  const today = new Date();
  const overdueByArea = new Map<string, number>();
  for (const t of allTasks) {
    if (t.dueDate && new Date(t.dueDate) < today && t.status !== "concluida" && t.status !== "cancelada" && t.areaId)
      overdueByArea.set(t.areaId, (overdueByArea.get(t.areaId) ?? 0) + 1);
  }
  const peopleByArea = new Map<string, string[]>();
  for (const u of allUsers) if (u.areaId) (peopleByArea.get(u.areaId) ?? peopleByArea.set(u.areaId, []).get(u.areaId)!).push(u.id);

  const verticais: CockpitVertical[] = ars.map((a) => {
    const act = actuals.get(a.id) ?? { receita: 0, custo: 0 };
    const tgt = targets.get(a.id);
    const target = tgt ? Number(tgt.revenueTarget) : 0;
    const mult = tgt ? Number(tgt.multiplierTarget) : 30;
    const ratio = act.custo > 0 ? act.receita / act.custo : null;
    const resultado = act.receita - act.custo;
    const ppl = peopleByArea.get(a.id) ?? [];
    const allocPct = ppl.length ? Math.round((ppl.filter((id) => allocUsers.has(id)).length / ppl.length) * 100) : 0;
    const overdue = overdueByArea.get(a.id) ?? 0;
    // Saúde: vermelho se prejuízo grande ou ratio bem abaixo da meta; amarelo se abaixo; verde se ≥ meta.
    let health: "green" | "amber" | "red" = "amber";
    if (ratio != null && ratio >= mult) health = "green";
    else if (resultado < 0 && (ratio == null || ratio < mult * 0.5)) health = "red";
    return { id: a.id, name: a.name, color: a.color, receita: act.receita, custo: act.custo, resultado, ratio, target, pctMeta: target ? Math.round((act.receita / target) * 100) : 0, health, overdue, allocPct };
  }).sort((x, y) => y.custo - x.custo);

  const totalReceita = verticais.reduce((s, v) => s + v.receita, 0);
  const totalCusto = verticais.reduce((s, v) => s + v.custo, 0);
  const totalResultado = totalReceita - totalCusto;
  const burn = totalResultado < 0 ? Math.round(Math.abs(totalResultado) / 5) : 0; // ~Jan-Mai
  const { cash } = await getCash();
  const runway = burn > 0 ? Math.round((cash / burn) * 10) / 10 : null;

  // Riscos automáticos
  const notas = await getNotas().catch(() => null);
  const risks: CeoCockpit["risks"] = [];
  if (notas && notas.semNota > 0) risks.push({ level: "red", tag: "FISCAL", text: `R$ ${Math.round(notas.semNota).toLocaleString("pt-BR")} faturado SEM nota fiscal.` });
  for (const v of verticais) {
    if (v.receita === 0 && v.custo > 0) risks.push({ level: "red", tag: "CAIXA", text: `${v.name} sem receita e custo de R$ ${Math.round(v.custo).toLocaleString("pt-BR")}.` });
    else if (v.resultado < 0) risks.push({ level: "amber", tag: "MARGEM", text: `${v.name} no vermelho: −R$ ${Math.round(Math.abs(v.resultado)).toLocaleString("pt-BR")}.` });
  }
  if (runway != null && runway < 6) risks.push({ level: "red", tag: "RUNWAY", text: `Runway ~${runway} meses (caixa ÷ burn).` });

  return { verticais, totalReceita, totalCusto, totalResultado, burn, runway, cash, overdueTotal: [...overdueByArea.values()].reduce((s, n) => s + n, 0), risks };
}

// --- CFO Cockpit -------------------------------------------------------------
export type CfoCockpit = {
  cash: number; cashDate: string | null; burn: number; runway: number | null;
  dre: { id: string; name: string; color: string; receita: number; custo: number; resultado: number; margem: number | null; ratio: number | null }[];
  group: { receita: number; custo: number; resultado: number };
  semNota: number; chargeback: number; refund: number; arFalta: number;
  anomalia: { mes: string; pct: number } | null;
};

export async function getCfoCockpit(year: number): Promise<CfoCockpit> {
  await requireFinanceiroAccess();
  const ars = await db.select().from(areas);
  const actuals = await areaActuals(year);
  const dre = ars.map((a) => {
    const act = actuals.get(a.id) ?? { receita: 0, custo: 0 };
    const resultado = act.receita - act.custo;
    return { id: a.id, name: a.name, color: a.color, receita: act.receita, custo: act.custo, resultado, margem: act.receita > 0 ? Math.round((resultado / act.receita) * 100) : null, ratio: act.custo > 0 ? Math.round((act.receita / act.custo) * 10) / 10 : null };
  }).sort((x, y) => y.custo - x.custo);
  const group = { receita: dre.reduce((s, d) => s + d.receita, 0), custo: dre.reduce((s, d) => s + d.custo, 0), resultado: 0 };
  group.resultado = group.receita - group.custo;

  const { cash, date } = await getCash();
  const burn = group.resultado < 0 ? Math.round(Math.abs(group.resultado) / 5) : 0;
  const runway = burn > 0 ? Math.round((cash / burn) * 10) / 10 : null;

  const [notas, vendas, desp] = await Promise.all([getNotas().catch(() => null), getVendas().catch(() => null), getDespesaMensal(year).catch(() => [])]);
  // Anomalia MoM (maior salto de despesa)
  let anomalia: CfoCockpit["anomalia"] = null;
  const MN = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  for (let i = 1; i < desp.length; i++) {
    if (desp[i - 1] > 0 && desp[i] > 0) {
      const pct = Math.round(((desp[i] - desp[i - 1]) / desp[i - 1]) * 100);
      if (!anomalia || Math.abs(pct) > Math.abs(anomalia.pct)) anomalia = { mes: MN[i], pct };
    }
  }
  return {
    cash, cashDate: date, burn, runway, dre, group,
    semNota: notas?.semNota ?? 0, chargeback: notas?.chargeback ?? 0, refund: notas?.refund ?? 0,
    arFalta: vendas?.recFalta ?? 0, anomalia,
  };
}

// --- Unit economics (Idiomas) ------------------------------------------------
export async function getUnitEconomics(year: number) {
  await requireFinanceiroAccess();
  const [alunos, vendas, receitas] = await Promise.all([getAlunos(), getVendas(), getReceitas(year)]);
  const ativos = alunos.ativos || 1;
  const churnRate = alunos.total ? Math.round((alunos.cancelados / alunos.total) * 100) : 0;
  const ticketMedio = vendas.count ? Math.round(vendas.total / vendas.count) : 0;
  const receitaPorAluno = ativos ? Math.round(receitas.total / ativos) : 0;
  return { totalAlunos: alunos.total, ativos: alunos.ativos, cancelados: alunos.cancelados, churnRate, ticketMedio, receitaPorAluno, byModalidade: alunos.byModalidade };
}

// --- Iniciativas -------------------------------------------------------------
export async function getInitiatives() {
  await requireSession();
  return db.select({ i: initiatives, areaName: areas.name, owner: users.name })
    .from(initiatives).leftJoin(areas, eq(initiatives.areaId, areas.id)).leftJoin(users, eq(initiatives.ownerId, users.id))
    .orderBy(desc(initiatives.createdAt));
}
export async function createInitiative(input: { name: string; areaId?: string; ownerId?: string; status?: "ideacao" | "em_andamento" | "em_risco" | "concluida" | "pausada"; nextMilestone?: string; impact?: string }) {
  const s = await assertAdmin();
  await db.insert(initiatives).values({ ...input, createdBy: s.user.id });
  revalidatePath("/", "layout");
}
export async function updateInitiativeStatus(id: string, status: "ideacao" | "em_andamento" | "em_risco" | "concluida" | "pausada") {
  await assertAdmin();
  await db.update(initiatives).set({ status, updatedAt: new Date() }).where(eq(initiatives.id, id));
  revalidatePath("/", "layout");
}

// --- NF backlog (sem nota) + AR — usa expenses só p/ gate ---------------------
export async function getNfBacklog() {
  await requireFinanceiroAccess();
  return getNotas();
}
export async function getArAging() {
  await requireFinanceiroAccess();
  return getVendas();
}
