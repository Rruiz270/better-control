export const dynamic = "force-dynamic";

import Header from "@/components/layout/Header";
import { getTurnaroundView } from "@/lib/actions/financeiro";
import { Scissors, TrendingUp } from "lucide-react";

const brl = (n: number) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;

export default async function TurnaroundPage() {
  let d;
  try { d = await getTurnaroundView(); } catch {
    return <div className="min-h-screen"><Header title="Financeiro · Turnaround" /><p className="p-8 text-sm text-gray-400 text-center">Please contact admin</p></div>;
  }

  return (
    <div className="min-h-screen">
      <Header title="Financeiro · Turnaround" />
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        <p className="text-xs text-gray-400 -mt-1">Cenário de turnaround: cortes, novos custos e impacto no resultado.</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Despesa atual</span>
            <p className="text-lg font-bold text-red-500">{brl(d.despesa_atual)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Despesa pós</span>
            <p className="text-lg font-bold text-navy">{brl(d.despesa_pos)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Resultado atual</span>
            <p className={`text-lg font-bold ${d.resultado_atual >= 0 ? "text-green-700" : "text-red-600"}`}>{brl(d.resultado_atual)}</p>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-100 p-4">
            <span className="text-[10px] font-bold text-green-600 uppercase">Resultado pós</span>
            <p className={`text-lg font-bold ${d.resultado_pos >= 0 ? "text-green-700" : "text-red-600"}`}>{brl(d.resultado_pos)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1"><Scissors size={14} className="text-red-500" /><span className="text-[10px] font-bold text-gray-400 uppercase">Total de cortes</span></div>
            <p className="text-xl font-bold text-red-600">{brl(d.total_cuts)}</p>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-100 p-4">
            <div className="flex items-center gap-1.5 mb-1"><TrendingUp size={14} className="text-green-600" /><span className="text-[10px] font-bold text-green-600 uppercase">Economia líquida</span></div>
            <p className="text-xl font-bold text-green-700">{brl(d.net_savings)}</p>
          </div>
        </div>

        {d.cuts.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-navy mb-3">Cortes</h2>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {d.cuts.map((c, i) => (
                <div key={i} className={`flex justify-between px-4 py-2.5 text-sm ${i < d.cuts.length - 1 ? "border-b border-gray-50" : ""}`}>
                  <span className="text-navy truncate pr-2">{c.item}</span>
                  <span className="font-bold text-red-600 tnum">{brl(c.value)}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
