// Constantes/tipos do modelo financeiro novo. Separado das actions porque arquivos
// "use server" só podem exportar funções async (const/tipos vão aqui).

export type FinEntity = "area" | "project";
export type FinLine =
  | "contratos"
  | "faturamento"
  | "cashflow"
  | "cash_actual"
  | "despesa_budget"
  | "despesa_actual";

export const REVENUE_LINES: FinLine[] = ["contratos", "faturamento", "cashflow", "cash_actual"];
export const EXPENSE_LINES: FinLine[] = ["despesa_budget", "despesa_actual"];
export const ALL_LINES: FinLine[] = [...REVENUE_LINES, ...EXPENSE_LINES];

export const LINE_LABEL: Record<FinLine, string> = {
  contratos: "Contratos",
  faturamento: "Faturamento",
  cashflow: "Cashflow",
  cash_actual: "Cash Actual",
  despesa_budget: "Despesa Budget",
  despesa_actual: "Despesa Actual",
};
