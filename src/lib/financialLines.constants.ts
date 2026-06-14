// Constantes/tipos do modelo financeiro novo. Separado das actions porque arquivos
// "use server" só podem exportar funções async (const/tipos vão aqui).

export type FinEntity = "area" | "project";
export type FinLine =
  | "contratos"
  | "faturamento"
  | "cashflow"
  | "cash_actual"
  | "receita_live"
  | "despesa_budget"
  | "despesa_actual"
  | "despesa_live"
  | "salarios_budget"
  | "salarios_actual";

export const REVENUE_LINES: FinLine[] = ["contratos", "faturamento", "cashflow", "cash_actual"];
export const EXPENSE_LINES: FinLine[] = ["despesa_budget", "despesa_actual", "salarios_budget"];
// Linhas LIVE = preenchidas pela API (Vindi/OMIE) ou computadas (rateio). Read-only no grid.
export const LIVE_LINES: FinLine[] = ["receita_live", "despesa_live", "salarios_actual"];
export const ALL_LINES: FinLine[] = [...REVENUE_LINES, "receita_live", ...EXPENSE_LINES, "despesa_live", "salarios_actual"];

export const LINE_LABEL: Record<FinLine, string> = {
  contratos: "Contratos",
  faturamento: "Faturamento",
  cashflow: "Cashflow",
  cash_actual: "Cash Actual",
  receita_live: "Live (Vindi)",
  despesa_budget: "Despesa Budget",
  despesa_actual: "Despesa Actual",
  despesa_live: "Live (OMIE)",
  salarios_budget: "Salários Budget",
  salarios_actual: "Salários (Rateio)",
};
