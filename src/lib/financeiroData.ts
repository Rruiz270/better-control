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
