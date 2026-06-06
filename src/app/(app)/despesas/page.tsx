export const dynamic = "force-dynamic";

import Header from "@/components/layout/Header";
import { getCostCenters, getVerticais, getExpenseLedger } from "@/lib/actions/expenses";
import ExpenseLedger from "@/components/expenses/ExpenseLedger";

export default async function DespesasPage() {
  const year = new Date().getFullYear();

  let costCenters, verticais, ledger;
  try {
    [costCenters, verticais, ledger] = await Promise.all([
      getCostCenters(),
      getVerticais(),
      getExpenseLedger(year),
    ]);
  } catch {
    return (
      <div className="min-h-screen">
        <Header title="Despesas & Pessoas" />
        <p className="p-8 text-sm text-gray-400 text-center">
          Você não tem acesso ao Modo Financeiro.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title="Despesas & Pessoas" />
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
        <p className="text-xs text-gray-400 -mt-1">
          Espelho da OMIE/BMA (deduplicado) · {year} · classifique cada um em <strong>2 dimensões</strong>:
          <strong> vertical</strong> (i10/Tech/Idiomas/EdTech) + <strong>categoria</strong> (natureza). Persiste por
          CNPJ/CPF e alimenta o centro de custo, rateio e performance.
        </p>
        <ExpenseLedger
          suppliers={ledger.suppliers}
          costCenters={costCenters.map((c) => ({ id: c.id, name: c.name, color: c.color }))}
          verticais={verticais}
          total={ledger.total}
          year={year}
        />
      </div>
    </div>
  );
}
