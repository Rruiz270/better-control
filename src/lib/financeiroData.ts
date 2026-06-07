// Leitura dos dados publicados pelo better-financeiro (OMIE/BMA/Vindi/Pagar.me,
// cron 2x/dia) — fonte pública, sem credencial. NÃO escreve no BD (só lê), então
// a integridade do banco do better-control é preservada. A coleta original fica
// 100% intacta (só consumimos o resultado).
import { db } from "@/db";
import { expenses, costCenters } from "@/db/schema";
import { eq } from "drizzle-orm";

const BASE = "https://www.institutoi10.com.br/better-financeiro";
const MES_TO_COL: Record<string, number> = { Jan: 1, Fev: 2, Mar: 3, Abr: 4, Mai: 5, Jun: 6, Jul: 7, Ago: 8, Set: 9, Out: 10, Nov: 11, Dez: 12 };

async function fetchArray(file: string): Promise<Record<string, string | number>[]> {
  const r = await fetch(`${BASE}/${file}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`fetch ${file} → ${r.status}`);
  const raw = await r.text();
  return JSON.parse(raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1));
}

// Extrai um array nomeado (arquivos com vários `var X = [...]`, ex.: bma_data.js).
async function fetchNamedArray(file: string, varName: string): Promise<Record<string, string | number>[]> {
  const r = await fetch(`${BASE}/${file}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`fetch ${file} → ${r.status}`);
  const raw = await r.text();
  const i = raw.indexOf(varName);
  const start = raw.indexOf("[", i);
  const end = raw.indexOf("]", start); // arrays flat (objetos sem arrays aninhados)
  return JSON.parse(raw.slice(start, end + 1));
}

async function fetchObject(file: string): Promise<Record<string, unknown>> {
  const r = await fetch(`${BASE}/${file}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`fetch ${file} → ${r.status}`);
  const raw = await r.text();
  return JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
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

// --- BMA (folha) ---
export type BMAData = { monthly: number[]; counts: number[]; total: number; headcountMax: number };
export async function getBMA(year: number): Promise<BMAData> {
  const rows = await fetchNamedArray("bma_data.js", "bmaDesp");
  const monthly = Array(12).fill(0) as number[]; const counts = Array(12).fill(0) as number[];
  for (const r of rows) {
    const [mes, ano] = String(r.m).split("/");
    if (Number(ano) !== year) continue;
    const col = MES_TO_COL[mes]; if (!col) continue;
    monthly[col - 1] = Number(r.total) || 0; counts[col - 1] = Number(r.count) || 0;
  }
  return { monthly, counts, total: monthly.reduce((s, v) => s + v, 0), headcountMax: Math.max(0, ...counts) };
}

// --- Veículos ---
export type VeiculosData = { total: number; count: number; byFornecedor: { name: string; total: number }[]; monthly: number[] };
export async function getVeiculos(year: number): Promise<VeiculosData> {
  const rows = await fetchArray("veiculos_data.js");
  let total = 0, count = 0; const forn = new Map<string, number>(); const monthly = Array(12).fill(0) as number[];
  for (const r of rows) {
    if (String(r.ano) !== String(year)) continue;
    const v = Number(r.valor_pago) || 0; total += v; count++;
    forn.set(String(r.fornecedor || "—"), (forn.get(String(r.fornecedor || "—")) ?? 0) + v);
    const col = MES_TO_COL[String(r.mes).split("/")[0]]; if (col) monthly[col - 1] += v;
  }
  return { total, count, monthly, byFornecedor: [...forn.entries()].map(([name, t]) => ({ name, total: t })).sort((a, b) => b.total - a.total).slice(0, 12) };
}

// --- Bizplan (projeção mensal) ---
export type BizplanRow = { m: string; subs: number; new_total: number; churn: number; receita: number; despesa: number; resultado: number; mrr: number; new_mrr: number; churn_mrr: number };
export async function getBizplan(): Promise<BizplanRow[]> {
  return (await fetchArray("bizplan_data.js")) as unknown as BizplanRow[];
}

// --- Turnaround (cenário) ---
export type TurnaroundData = {
  total_cuts: number; net_savings: number; despesa_atual: number; despesa_pos: number;
  resultado_atual: number; resultado_pos: number;
  cuts: { item: string; value: number }[]; new_costs: { item: string; value: number }[];
};
export async function getTurnaround(): Promise<TurnaroundData> {
  const d = await fetchObject("turnaround_full_data.js");
  const norm = (arr: unknown): { item: string; value: number }[] =>
    Array.isArray(arr) ? arr.map((x) => ({ item: String((x as Record<string, unknown>).item ?? (x as Record<string, unknown>).nome ?? (x as Record<string, unknown>).label ?? "—"), value: Number((x as Record<string, unknown>).value ?? (x as Record<string, unknown>).valor ?? 0) || 0 })) : [];
  return {
    total_cuts: Number(d.total_cuts) || 0, net_savings: Number(d.net_savings) || 0,
    despesa_atual: Number(d.despesa_atual) || 0, despesa_pos: Number(d.despesa_pos) || 0,
    resultado_atual: Number(d.resultado_atual) || 0, resultado_pos: Number(d.resultado_pos) || 0,
    cuts: norm(d.cuts), new_costs: norm(d.new_costs),
  };
}

/** Despesa mensal DEDUPLICADA — vem da tabela `expenses` do better-control
 *  (já consolidada OMIE+BMA sem dupla contagem). Mantém tudo consistente. */
export async function getDespesaMensal(year: number): Promise<number[]> {
  const rows = await db.select().from(expenses).where(eq(expenses.year, year));
  const monthly = Array(12).fill(0) as number[];
  for (const r of rows) if (r.month >= 1 && r.month <= 12) monthly[r.month - 1] += Number(r.value);
  return monthly;
}

// --- Contabilidade (folha BMA + obrigações: tributos/contábil/jurídico) ---
export type ContabilidadeData = {
  folha: number[]; folhaTotal: number;
  obrigacoes: { name: string; total: number }[];
};
export async function getContabilidade(year: number): Promise<ContabilidadeData> {
  const bma = await getBMA(year);
  const ccs = await db.select().from(costCenters);
  const wanted = new Set(["Serv. Terceiro - Contábil", "Serv. Terceiro - Jurídico", "Tributos e Taxas"]);
  const wantedIds = new Map(ccs.filter((c) => wanted.has(c.name)).map((c) => [c.id, c.name]));
  const rows = await db.select().from(expenses).where(eq(expenses.year, year));
  const m = new Map<string, number>();
  for (const r of rows) {
    if (!r.costCenterId || !wantedIds.has(r.costCenterId)) continue;
    const name = wantedIds.get(r.costCenterId)!;
    m.set(name, (m.get(name) ?? 0) + Number(r.value));
  }
  return {
    folha: bma.monthly, folhaTotal: bma.total,
    obrigacoes: [...m.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total),
  };
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

export type NotasData = {
  total: number; comNota: number; semNota: number; chargeback: number; refund: number;
  problemas: { nome: string; doc: string; chargeback: number; refund: number }[];
};

/** Notas fiscais / status de pagamento por cliente (com nota × sem nota,
 *  chargebacks e refunds). Cumulativo. */
export async function getNotas(): Promise<NotasData> {
  const rows = await fetchArray("notas_data.js");
  let total = 0, comNota = 0, semNota = 0, chargeback = 0, refund = 0;
  const problemas: { nome: string; doc: string; chargeback: number; refund: number }[] = [];
  for (const r of rows) {
    total += Number(r.tot) || 0;
    comNota += Number(r.pv) || 0;
    semNota += Number(r.sv) || 0;
    const cb = Number(r.ct) || 0, rf = Number(r.rt) || 0;
    chargeback += cb; refund += rf;
    if (cb > 0 || rf > 0) problemas.push({ nome: String(r.n || "—"), doc: String(r.d || ""), chargeback: cb, refund: rf });
  }
  problemas.sort((a, b) => (b.chargeback + b.refund) - (a.chargeback + a.refund));
  return { total, comNota, semNota, chargeback, refund, problemas: problemas.slice(0, 20) };
}

export type FiscalData = {
  nfse: number[]; nfseN: number[]; nfe: number[]; nfeN: number[];
  totalNfse: number; totalNfe: number; countNfse: number; countNfe: number;
};

/** Emissão fiscal: NFS-e (serviço) + NF-e (produto) por mês (dashboard_data). */
export async function getFiscal(year: number): Promise<FiscalData> {
  const rows = await fetchArray("dashboard_data.js");
  const nfse = Array(12).fill(0) as number[]; const nfseN = Array(12).fill(0) as number[];
  const nfe = Array(12).fill(0) as number[]; const nfeN = Array(12).fill(0) as number[];
  for (const r of rows) {
    if (String(r.y) !== String(year)) continue;
    const col = MES_TO_COL[String(r.m).split("/")[0]];
    if (!col) continue;
    nfse[col - 1] = Number(r.nfse) || 0; nfseN[col - 1] = Number(r.nfse_n) || 0;
    nfe[col - 1] = Number(r.nfe) || 0; nfeN[col - 1] = Number(r.nfe_n) || 0;
  }
  return {
    nfse, nfseN, nfe, nfeN,
    totalNfse: nfse.reduce((s, v) => s + v, 0), totalNfe: nfe.reduce((s, v) => s + v, 0),
    countNfse: nfseN.reduce((s, v) => s + v, 0), countNfe: nfeN.reduce((s, v) => s + v, 0),
  };
}

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
