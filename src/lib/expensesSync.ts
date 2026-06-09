// Sync server-side do ledger de despesas/pessoas. Busca os arquivos públicos do
// better-financeiro (já consolidam OMIE + BMA + Vindi + Pagar.me, cron 2x/dia) e
// faz upsert em `expenses`. Sem credencial. Usado pela rota de cron e por triggers
// manuais. Upsert em lote (poucos statements) p/ caber no tempo do serverless.
import { db } from "@/db";
import { expenses, supplierCostCenter, entityTax, areas, financialPlans, financialLines } from "@/db/schema";
import { sql, and, eq } from "drizzle-orm";
import { getReceitas } from "@/lib/financeiroData";

const BASE = "https://www.institutoi10.com.br/better-financeiro";
const DESP_URL = `${BASE}/despesas_all_data.js`;
const PESSOAS_URL = `${BASE}/pessoas_consolidado.json`;
const MES_TO_COL: Record<string, number> = { Jan: 1, Fev: 2, Mar: 3, Abr: 4, Mai: 5, Jun: 6, Jul: 7, Ago: 8, Set: 9, Out: 10, Nov: 11, Dez: 12 };

async function fetchText(url: string) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`fetch ${url} → ${r.status}`);
  return r.text();
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

export async function runExpensesSync(year = 2026): Promise<{ count: number; total: number }> {
  // Centros de custo vêm do seed do Excel (scripts/seed-cost-centers). Aqui só
  // aplicamos: diretório nome→CNPJ + regra CNPJ→centro.
  // 1) diretório nome→CNPJ (entityTax)
  const dir = await db.select().from(entityTax);
  const taxByName = new Map(dir.map((d) => [d.nameUpper, d.taxId]));

  // 2) regras entityKey(CNPJ/nome)→{categoria, vertical}
  const rules = await db.select().from(supplierCostCenter);
  const ruleMap = new Map(rules.map((r) => [r.name, { cc: r.costCenterId, area: r.areaId }]));

  // 3) pessoas (nomes PESSOA + cpf/cnpj)
  const pj = JSON.parse(await fetchText(PESSOAS_URL));
  const pessoaNames = new Set<string>();
  const taxIds = new Map<string, string>();
  for (const p of pj.pessoas ?? []) {
    const nome = String(p.nome || "").trim().toUpperCase();
    if (!nome) continue;
    if (p._tipo === "PESSOA") pessoaNames.add(nome);
    const doc = String(p.cpf_cnpj ?? "").replace(/\D/g, "");
    if (doc) taxIds.set(nome, doc);
  }

  // 4) despesas (dedup NF-lump da BMA), agrega por (source,name,categoria,mês)
  const raw = await fetchText(DESP_URL);
  const rows = JSON.parse(raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1)) as Record<string, string | number>[];
  type Agg = { externalKey: string; source: string; kind: "fornecedor" | "pessoa"; name: string; taxId: string | null; entityKey: string; category: string; bucket: string; year: number; month: number; value: number };
  const agg = new Map<string, Agg>();
  for (const r of rows) {
    if (String(r.ano) !== String(year)) continue;
    const name = String(r.fornecedor || "").trim();
    if (!name || name.toUpperCase().includes("BMA")) continue;
    const col = MES_TO_COL[String(r.mes).split("/")[0]];
    if (!col) continue;
    const category = String(r.categoria || "—");
    const source = String(r.grupo || "").trim() === "" || String(r.fonte || "").toUpperCase().includes("BMA") ? "bma" : "omie";
    const key = `${source}|${name}|${category}|${year}-${col}`;
    // taxId: diretório do Excel (CNPJ de fornecedores) tem prioridade; senão CPF de pessoa.
    const taxId = taxByName.get(name.toUpperCase()) ?? taxIds.get(name.toUpperCase()) ?? null;
    const entityKey = taxId ?? name.toUpperCase();
    const cur = agg.get(key) ?? { externalKey: key, source, kind: pessoaNames.has(name.toUpperCase()) ? "pessoa" : "fornecedor", name, taxId, entityKey, category, bucket: String(r.projeto || ""), year, month: col, value: 0 };
    cur.value += Number(r.valor_pago) || 0;
    agg.set(key, cur);
  }

  // 5) upsert em lote (aplica categoria + vertical da regra)
  const values = [...agg.values()].filter((e) => e.value !== 0).map((e) => {
    const rule = ruleMap.get(e.entityKey);
    return {
      externalKey: e.externalKey, source: e.source, kind: e.kind, name: e.name, taxId: e.taxId,
      entityKey: e.entityKey, category: e.category, bucket: e.bucket, year: e.year, month: e.month,
      value: e.value.toFixed(2), costCenterId: rule?.cc ?? null, areaId: rule?.area ?? null, syncedAt: new Date(),
    };
  });

  for (const part of chunk(values, 300)) {
    await db.insert(expenses).values(part).onConflictDoUpdate({
      target: expenses.externalKey,
      set: {
        kind: sql`excluded.kind`, name: sql`excluded.name`, taxId: sql`excluded.tax_id`,
        entityKey: sql`excluded.entity_key`, category: sql`excluded.category`, bucket: sql`excluded.bucket`,
        value: sql`excluded.value`, costCenterId: sql`excluded.cost_center_id`, areaId: sql`excluded.area_id`, syncedAt: sql`excluded.synced_at`,
      },
    });
  }

  // 6) atualiza os ACTUALS de Idiomas (financial_plans) que alimentam cockpits/DRE:
  //    receita = Vindi (live) por mês; custo = despesas (dedup) por mês. i10 = manual.
  await syncIdiomasActuals(year, values);

  return { count: values.length, total: values.reduce((s, e) => s + Number(e.value), 0) };
}

async function syncIdiomasActuals(year: number, expValues: { month: number; value: string }[]) {
  const [idiomas] = await db.select({ id: areas.id }).from(areas).where(eq(areas.slug, "idiomas")).limit(1);
  if (!idiomas) return;
  // custo mensal (a partir das despesas recém-sincronizadas)
  const custo = Array(12).fill(0) as number[];
  for (const e of expValues) if (e.month >= 1 && e.month <= 12) custo[e.month - 1] += Number(e.value);
  // receita mensal (Vindi, live)
  let receita = Array(12).fill(0) as number[];
  try { receita = (await getReceitas(year)).monthly; } catch { /* mantém zeros se a fonte falhar */ }

  const fields = (arr: number[]) => Object.fromEntries(arr.map((v, i) => [`m${i + 1}`, String(Math.round(v))]));
  for (const [stream, arr] of [["receita", receita], ["custo", custo]] as const) {
    const f = fields(arr);
    await db.insert(financialPlans)
      .values({ entityType: "area", entityId: idiomas.id, year, stream, metric: "actual", ...f } as typeof financialPlans.$inferInsert)
      .onConflictDoUpdate({
        target: [financialPlans.entityType, financialPlans.entityId, financialPlans.year, financialPlans.stream, financialPlans.metric],
        set: { ...f, updatedAt: new Date() },
      });
  }

  // Modelo NOVO: linhas LIVE (read-only) — receita (Vindi) + despesa (OMIE) por mês.
  for (const [line, arr] of [["receita_live", receita], ["despesa_live", custo]] as const) {
    const f = fields(arr);
    await db.insert(financialLines)
      .values({ entityType: "area", entityId: idiomas.id, year, line, ...f } as typeof financialLines.$inferInsert)
      .onConflictDoUpdate({
        target: [financialLines.entityType, financialLines.entityId, financialLines.year, financialLines.line],
        set: { ...f, updatedAt: new Date() },
      });
  }
  void and;
}
