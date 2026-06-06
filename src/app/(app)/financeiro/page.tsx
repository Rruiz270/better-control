export const dynamic = "force-dynamic";

import Header from "@/components/layout/Header";
import { getCostCenterDashboard } from "@/lib/actions/expenses";
import { PieChart, Wallet, AlertTriangle } from "lucide-react";

const brl = (n: number) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;

export default async function FinanceiroPage() {
  const year = new Date().getFullYear();

  let data;
  try {
    data = await getCostCenterDashboard(year);
  } catch {
    return (
      <div className="min-h-screen">
        <Header title="Financeiro · Centro de Custo" />
        <p className="p-8 text-sm text-gray-400 text-center">
          Você não tem acesso ao Modo Financeiro.
        </p>
      </div>
    );
  }

  const max = Math.max(1, ...data.centers.map((c) => c.total));

  return (
    <div className="min-h-screen">
      <Header title="Financeiro · Centro de Custo" />
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        <p className="text-xs text-gray-400 -mt-1">
          {year} · despesas consolidadas (OMIE/BMA, deduplicado) agrupadas por centro de custo.
          Alimenta a performance e o rateio. Categorize na aba <strong>Despesas</strong>.
        </p>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Wallet size={14} className="text-navy" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">Despesa total</span>
            </div>
            <p className="text-xl font-bold text-navy">{brl(data.total)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <PieChart size={14} className="text-cyan" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">Centros de custo</span>
            </div>
            <p className="text-xl font-bold text-navy">{data.centers.filter((c) => c.id).length}</p>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle size={14} className="text-amber-500" />
              <span className="text-[10px] font-bold text-amber-500 uppercase">Sem centro</span>
            </div>
            <p className="text-xl font-bold text-amber-600">{brl(data.unassigned)}</p>
          </div>
        </div>

        {/* Barras por centro */}
        <section>
          <h2 className="text-lg font-bold text-navy mb-3">Despesa por centro de custo</h2>
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
            {data.centers.map((c) => (
              <div key={c.id ?? "none"} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-navy">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    {c.name}
                    <span className="text-[10px] text-gray-400">({c.count})</span>
                  </span>
                  <span className="font-bold text-navy tnum">{brl(c.total)}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(c.total / max) * 100}%`, backgroundColor: c.color }} />
                </div>
              </div>
            ))}
            {data.centers.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">Sem despesas neste ano.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
