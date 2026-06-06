"use server";

import { requireFinanceiroAccess } from "@/lib/authorization";
import { getReceitas, getDespesaMensal, type ReceitaData } from "@/lib/financeiroData";

export type OverviewData = {
  receita: number[];
  despesa: number[];
  resultado: number[];
  totalReceita: number;
  totalDespesa: number;
};

/** Visão geral (P&L mensal): receita (Vindi) − despesa (expenses dedup). */
export async function getFinanceiroOverview(year: number): Promise<OverviewData> {
  await requireFinanceiroAccess();
  const [{ monthly: receita, total: totalReceita }, despesa] = await Promise.all([
    getReceitas(year),
    getDespesaMensal(year),
  ]);
  const resultado = receita.map((r, i) => r - (despesa[i] ?? 0));
  return {
    receita,
    despesa,
    resultado,
    totalReceita,
    totalDespesa: despesa.reduce((s, v) => s + v, 0),
  };
}

export async function getReceitasView(year: number): Promise<ReceitaData> {
  await requireFinanceiroAccess();
  return getReceitas(year);
}
