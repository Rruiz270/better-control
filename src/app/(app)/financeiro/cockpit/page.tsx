export const dynamic = "force-dynamic";

import Header from "@/components/layout/Header";
import { getCfoCockpit } from "@/lib/actions/executive";
import { Wallet, AlertTriangle, RotateCcw, FileX, TrendingDown } from "lucide-react";

const brl = (n: number) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;

export default async function CfoCockpitPage() {
  const year = new Date().getFullYear();
  let d;
  try {
    d = await getCfoCockpit(year);
  } catch {
    return (
      <div className="min-h-screen"><Header title="Financeiro · Cockpit" />
        <p className="p-8 text-sm text-gray-400 text-center">Você não tem acesso ao Modo Financeiro.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title="Financeiro · Cockpit (CFO)" />
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
        {/* Caixa / runway */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4"><div className="flex items-center gap-1.5 mb-1"><Wallet size={14} className="text-navy" /><span className="text-[10px] font-bold text-gray-400 uppercase">Caixa</span></div><p className="text-xl font-bold text-navy">{d.cash ? brl(d.cash) : "definir"}</p>{d.cashDate && <p className="text-[10px] text-gray-400">em {d.cashDate}</p>}</div>
          <div className="bg-white rounded-xl border border-gray-100 p-4"><div className="flex items-center gap-1.5 mb-1"><TrendingDown size={14} className="text-red-500" /><span className="text-[10px] font-bold text-gray-400 uppercase">Burn/mês</span></div><p className="text-xl font-bold text-red-500">{brl(d.burn)}</p></div>
          <div className={`rounded-xl border p-4 ${d.runway != null && d.runway < 6 ? "bg-red-50 border-red-100" : "bg-white border-gray-100"}`}><span className="text-[10px] font-bold text-gray-400 uppercase">Runway</span><p className={`text-xl font-bold ${d.runway != null && d.runway < 6 ? "text-red-600" : "text-navy"}`}>{d.runway != null ? `~${d.runway} m` : "—"}</p></div>
          <div className={`rounded-xl border p-4 ${d.group.resultado < 0 ? "bg-red-50 border-red-100" : "bg-green-50 border-green-100"}`}><span className="text-[10px] font-bold text-gray-400 uppercase">Resultado grupo</span><p className={`text-xl font-bold ${d.group.resultado < 0 ? "text-red-600" : "text-green-700"}`}>{brl(d.group.resultado)}</p></div>
        </div>

        {/* DRE por vertical */}
        <section>
          <h2 className="text-lg font-bold text-navy mb-2">DRE por vertical (com margem e 30x)</h2>
          <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead><tr className="bg-gray-50 text-[10px] text-gray-400 uppercase">
                <th className="text-left px-3 py-2">Vertical</th><th className="text-right px-3 py-2">Receita</th><th className="text-right px-3 py-2">Custo</th><th className="text-right px-3 py-2">Resultado</th><th className="text-right px-3 py-2">Margem</th><th className="text-right px-3 py-2">30x</th>
              </tr></thead>
              <tbody>
                {d.dre.map((r) => (
                  <tr key={r.id} className="border-t border-gray-50">
                    <td className="px-3 py-2"><span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ background: r.color }} />{r.name}</td>
                    <td className="px-3 py-2 text-right text-green-600 tnum">{brl(r.receita)}</td>
                    <td className="px-3 py-2 text-right tnum">{brl(r.custo)}</td>
                    <td className={`px-3 py-2 text-right font-bold tnum ${r.resultado < 0 ? "text-red-600" : "text-green-700"}`}>{brl(r.resultado)}</td>
                    <td className={`px-3 py-2 text-right tnum ${(r.margem ?? 0) < 0 ? "text-red-600" : "text-navy"}`}>{r.margem != null ? `${r.margem}%` : "—"}</td>
                    <td className="px-3 py-2 text-right tnum">{r.ratio != null ? `${r.ratio}x` : "—"}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-100 font-bold bg-gray-50/50">
                  <td className="px-3 py-2">Grupo</td>
                  <td className="px-3 py-2 text-right text-green-700 tnum">{brl(d.group.receita)}</td>
                  <td className="px-3 py-2 text-right tnum">{brl(d.group.custo)}</td>
                  <td className={`px-3 py-2 text-right tnum ${d.group.resultado < 0 ? "text-red-600" : "text-green-700"}`}>{brl(d.group.resultado)}</td>
                  <td className="px-3 py-2 text-right tnum">{d.group.receita > 0 ? `${Math.round((d.group.resultado / d.group.receita) * 100)}%` : "—"}</td>
                  <td className="px-3 py-2 text-right tnum">{d.group.custo > 0 ? `${(d.group.receita / d.group.custo).toFixed(1)}x` : "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Riscos financeiros */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-amber-50 rounded-xl border border-amber-100 p-4"><div className="flex items-center gap-1.5 mb-1"><FileX size={14} className="text-amber-500" /><span className="text-[10px] font-bold text-amber-600 uppercase">Sem nota</span></div><p className="text-lg font-bold text-amber-700">{brl(d.semNota)}</p></div>
          <div className="bg-red-50 rounded-xl border border-red-100 p-4"><div className="flex items-center gap-1.5 mb-1"><AlertTriangle size={14} className="text-red-500" /><span className="text-[10px] font-bold text-red-600 uppercase">Chargeback</span></div><p className="text-lg font-bold text-red-700">{brl(d.chargeback)}</p></div>
          <div className="bg-red-50 rounded-xl border border-red-100 p-4"><div className="flex items-center gap-1.5 mb-1"><RotateCcw size={14} className="text-red-500" /><span className="text-[10px] font-bold text-red-600 uppercase">Estornos</span></div><p className="text-lg font-bold text-red-700">{brl(d.refund)}</p></div>
          <div className="bg-white rounded-xl border border-gray-100 p-4"><span className="text-[10px] font-bold text-gray-400 uppercase">Anomalia despesa</span><p className="text-lg font-bold text-navy">{d.anomalia ? `${d.anomalia.mes} ${d.anomalia.pct > 0 ? "+" : ""}${d.anomalia.pct}%` : "—"}</p></div>
        </div>
        <p className="text-[11px] text-gray-400">Runway = caixa ÷ burn médio. Defina o caixa em <strong>Metas</strong>. DRE usa o actual por área (financial_plans).</p>
      </div>
    </div>
  );
}
