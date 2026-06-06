// Leitura dos dados publicados pelo better-financeiro (OMIE/BMA/Vindi/Pagar.me,
// cron 2x/dia) — fonte pública, sem credencial. NÃO escreve no BD (só lê), então
// a integridade do banco do better-control é preservada. A coleta original fica
// 100% intacta (só consumimos o resultado).
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { eq } from "drizzle-orm";

const BASE = "https://www.institutoi10.com.br/better-financeiro";
const MES_TO_COL: Record<string, number> = { Jan: 1, Fev: 2, Mar: 3, Abr: 4, Mai: 5, Jun: 6, Jul: 7, Ago: 8, Set: 9, Out: 10, Nov: 11, Dez: 12 };

async function fetchArray(file: string): Promise<Record<string, string | number>[]> {
  const r = await fetch(`${BASE}/${file}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`fetch ${file} → ${r.status}`);
  const raw = await r.text();
  return JSON.parse(raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1));
}

export type ReceitaData = {
  monthly: number[]; // m1..m12
  total: number;
  byClient: { name: string; total: number }[];
  byCategoria: { name: string; total: number }[];
};

/** Receitas (Vindi/OMIE) do ano, pagas. */
export async function getReceitas(year: number): Promise<ReceitaData> {
  const rows = await fetchArray("receitas_all_data.js");
  const monthly = Array(12).fill(0) as number[];
  const cli = new Map<string, number>();
  const cat = new Map<string, number>();
  let total = 0;
  for (const r of rows) {
    if (String(r.ano) !== String(year)) continue;
    if (String(r.situacao) !== "Pago") continue;
    const col = MES_TO_COL[String(r.mes).split("/")[0]];
    const v = Number(r.valor) || 0;
    if (col) monthly[col - 1] += v;
    total += v;
    const c = String(r.cliente || "—");
    cli.set(c, (cli.get(c) ?? 0) + v);
    const g = String(r.categoria || "—");
    cat.set(g, (cat.get(g) ?? 0) + v);
  }
  const top = (m: Map<string, number>, n: number) =>
    [...m.entries()].map(([name, t]) => ({ name, total: t })).sort((a, b) => b.total - a.total).slice(0, n);
  return { monthly, total, byClient: top(cli, 15), byCategoria: top(cat, 10) };
}

/** Despesa mensal DEDUPLICADA — vem da tabela `expenses` do better-control
 *  (já consolidada OMIE+BMA sem dupla contagem). Mantém tudo consistente. */
export async function getDespesaMensal(year: number): Promise<number[]> {
  const rows = await db.select().from(expenses).where(eq(expenses.year, year));
  const monthly = Array(12).fill(0) as number[];
  for (const r of rows) if (r.month >= 1 && r.month <= 12) monthly[r.month - 1] += Number(r.value);
  return monthly;
}

const truthy = (v: unknown) => v === true || v === 1 || v === "true" || v === "Sim" || v === "sim";
const topN = (m: Map<string, number>, n: number) =>
  [...m.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, n);

export type AlunosData = {
  total: number; ativos: number; cancelados: number; pf: number; pj: number;
  byModalidade: { name: string; count: number; total: number }[];
  top: { nome: string; modalidade: string; total: number }[];
};

/** Base de alunos/clientes (Vindi + planilha). Cumulativo. */
export async function getAlunos(): Promise<AlunosData> {
  const rows = await fetchArray("alunos_data.js");
  let ativos = 0, cancelados = 0, pf = 0, pj = 0;
  const modCount = new Map<string, number>();
  const modTotal = new Map<string, number>();
  const all: { nome: string; modalidade: string; total: number }[] = [];
  for (const r of rows) {
    const gasto = Number(r.total_gasto ?? r.vindi_total ?? 0) || 0;
    const mod = String(r.modalidade || "—");
    if (truthy(r.cancelou) || truthy(r.cancelamento)) cancelados++;
    else if (truthy(r.contrato_ativo)) ativos++;
    if (String(r.tipo_cliente) === "PJ") pj++; else pf++;
    modCount.set(mod, (modCount.get(mod) ?? 0) + 1);
    modTotal.set(mod, (modTotal.get(mod) ?? 0) + gasto);
    all.push({ nome: String(r.nome || "—"), modalidade: mod, total: gasto });
  }
  const byModalidade = [...modCount.entries()]
    .map(([name, count]) => ({ name, count, total: modTotal.get(name) ?? 0 }))
    .sort((a, b) => b.total - a.total);
  const top = all.sort((a, b) => b.total - a.total).slice(0, 15);
  return { total: rows.length, ativos, cancelados, pf, pj, byModalidade, top };
}

export type VendasData = {
  total: number; count: number;
  b2b: { count: number; total: number }; b2c: { count: number; total: number };
  byVendedor: { name: string; total: number }[];
  byProduto: { name: string; total: number }[];
  recEsperado: number; recPago: number; recFalta: number;
};

/** Vendas/contratos (B2B CNPJ + B2C CPF), com cobrança. Cumulativo. */
export async function getVendas(): Promise<VendasData> {
  const rows = await fetchArray("vendas_cross_data.js");
  let total = 0, b2bC = 0, b2bT = 0, b2cC = 0, b2cT = 0, recEsperado = 0, recPago = 0, recFalta = 0;
  const vend = new Map<string, number>();
  const prod = new Map<string, number>();
  for (const r of rows) {
    const vt = Number(r.vt) || 0;
    total += vt;
    if (String(r.td) === "CNPJ") { b2bC++; b2bT += vt; } else { b2cC++; b2cT += vt; }
    recEsperado += Number(r.rec_esperado) || 0;
    recPago += Number(r.rec_pago) || 0;
    recFalta += Number(r.rec_falta) || 0;
    vend.set(String(r.vd || "—"), (vend.get(String(r.vd || "—")) ?? 0) + vt);
    prod.set(String(r.p || "—"), (prod.get(String(r.p || "—")) ?? 0) + vt);
  }
  return {
    total, count: rows.length,
    b2b: { count: b2bC, total: b2bT }, b2c: { count: b2cC, total: b2cT },
    byVendedor: topN(vend, 12), byProduto: topN(prod, 12),
    recEsperado, recPago, recFalta,
  };
}
