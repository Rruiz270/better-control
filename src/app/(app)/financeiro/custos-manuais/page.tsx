export const dynamic = "force-dynamic";

import Header from "@/components/layout/Header";
import { getCollaboratorCosts } from "@/lib/actions/rateio";
import ManualCostGrid from "@/components/financials/ManualCostGrid";
import MonthSelector from "@/components/shared/MonthSelector";

const MN = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default async function CustosManuaisPage({ searchParams }: { searchParams: Promise<{ y?: string; m?: string }> }) {
  const sp = await searchParams;
  const now = new Date();
  const year = sp.y ? Number(sp.y) : now.getFullYear();
  const month = sp.m ? Number(sp.m) : now.getMonth() + 1;
  let rows;
  try { rows = await getCollaboratorCosts(year, month); } catch {
    return <div className="min-h-screen"><Header title="Financeiro · Custos manuais" /><p className="p-8 text-sm text-gray-400 text-center">Please contact admin</p></div>;
  }

  return (
    <div className="min-h-screen">
      <Header title="Financeiro · Custos manuais" />
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Custo manual por colaborador — <strong>{MN[month - 1]}/{year}</strong>. Use para quem o custo não casa automático
            (ex.: <strong>professores</strong>, que dividem o mesmo CNPJ da Better, e i10). <strong>Toda entrada manual exige nota.</strong>
          </p>
          <MonthSelector year={year} month={month} />
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-[12px] text-blue-800">
          <strong>Como isso vira rateio:</strong> o valor por pessoa (manual aqui, ou automático do tab Despesas via CPF/CNPJ) é o
          <strong> custo da pessoa</strong>, que o Gestão distribui pelos projetos conforme o <strong>tempo lançado</strong> (ou o % planejado).
          Os demais valores são divididos à mão.
        </div>
        <ManualCostGrid key={`${year}-${month}`} rows={rows} year={year} month={month} />
      </div>
    </div>
  );
}
