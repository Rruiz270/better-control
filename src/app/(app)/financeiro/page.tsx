export const dynamic = "force-dynamic";

import Header from "@/components/layout/Header";
import { getFinanceiroOverview } from "@/lib/actions/financeiro";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";

const brl = (n: number) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;
const MN = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default async function FinanceiroOverviewPage() {
  const year = new Date().getFullYear();

  let d;
  try {
    d = await getFinanceiroOverview(year);
  } catch {
    return (
      <div className="min-h-screen">
        <Header title="Financeiro · Visão Geral" />
        <p className="p-8 text-sm text-gray-400 text-center">Please contact admin</p>
      </div>
    );
  }

  const resultado = d.totalReceita - d.totalDespesa;
  const max = Math.max(1, ...d.receita, ...d.despesa);
  const monthsWith = d.receita.map((_, i) => i).filter((i) => d.receita[i] || d.despesa[i]);

  return (
    <div className="min-h-screen">
      <Header title="Financeiro · Visão Geral" />
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        <p className="text-xs text-gray-400 -mt-1">
          {year} · receita (Vindi/OMIE) vs despesa (consolidada OMIE+BMA, deduplicada). Fonte: better-financeiro (cron 2x/dia).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp size={14} className="text-green-500" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">Receita {year}</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{brl(d.totalReceita)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingDown size={14} className="text-red-500" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">Despesa {year}</span>
            </div>
            <p className="text-2xl font-bold text-red-500">{brl(d.totalDespesa)}</p>
          </div>
          <div className={`rounded-xl border p-4 ${resultado >= 0 ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <Wallet size={14} className={resultado >= 0 ? "text-green-600" : "text-red-600"} />
              <span className="text-[10px] font-bold text-gray-400 uppercase">Resultado {year}</span>
            </div>
            <p className={`text-2xl font-bold ${resultado >= 0 ? "text-green-700" : "text-red-600"}`}>{brl(resultado)}</p>
          </div>
        </div>

        <section>
          <h2 className="text-lg font-bold text-navy mb-3">Mês a mês</h2>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="hidden md:grid grid-cols-5 gap-2 px-4 py-2 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase">
              <span>Mês</span>
              <span className="text-right">Receita</span>
              <span className="text-right">Despesa</span>
              <span className="text-right">Resultado</span>
              <span>Comparativo</span>
            </div>
            {monthsWith.map((i) => {
              const res = d.receita[i] - d.despesa[i];
              return (
                <div key={i} className="grid grid-cols-2 md:grid-cols-5 gap-2 px-4 py-2.5 items-center border-b border-gray-50 last:border-0">
                  <span className="text-sm font-medium text-navy">{MN[i]}</span>
                  <span className="text-right text-sm text-green-600 tnum">{brl(d.receita[i])}</span>
                  <span className="text-right text-sm text-red-500 tnum">{brl(d.despesa[i])}</span>
                  <span className={`text-right text-sm font-bold tnum ${res >= 0 ? "text-green-700" : "text-red-600"}`}>{brl(res)}</span>
                  <span className="hidden md:flex items-center gap-1 h-4">
                    <span className="h-2 rounded-full bg-green-400" style={{ width: `${(d.receita[i] / max) * 50}%` }} />
                    <span className="h-2 rounded-full bg-red-300" style={{ width: `${(d.despesa[i] / max) * 50}%` }} />
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
