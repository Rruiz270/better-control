export const dynamic = "force-dynamic";

import Header from "@/components/layout/Header";
import { getBizplanView } from "@/lib/actions/financeiro";

const brl = (n: number) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;

export default async function BizplanPage() {
  let rows;
  try { rows = await getBizplanView(); } catch {
    return <div className="min-h-screen"><Header title="Financeiro · Bizplan" /><p className="p-8 text-sm text-gray-400 text-center">Please contact admin</p></div>;
  }

  return (
    <div className="min-h-screen">
      <Header title="Financeiro · Bizplan (Projeção)" />
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
        <p className="text-xs text-gray-400 -mt-1">Plano de negócio / projeção: assinantes, churn, MRR, receita e resultado.</p>
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase">
                <th className="px-3 py-2 text-left">Mês</th>
                <th className="px-3 py-2 text-right">Assinantes</th>
                <th className="px-3 py-2 text-right">Novos</th>
                <th className="px-3 py-2 text-right">Churn</th>
                <th className="px-3 py-2 text-right">MRR</th>
                <th className="px-3 py-2 text-right">Receita</th>
                <th className="px-3 py-2 text-right">Despesa</th>
                <th className="px-3 py-2 text-right">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-gray-50">
                  <td className="px-3 py-2 font-medium text-navy">{r.m}</td>
                  <td className="px-3 py-2 text-right tnum">{r.subs}</td>
                  <td className="px-3 py-2 text-right text-green-600 tnum">{r.new_total}</td>
                  <td className="px-3 py-2 text-right text-red-500 tnum">{r.churn}</td>
                  <td className="px-3 py-2 text-right tnum">{brl(r.mrr)}</td>
                  <td className="px-3 py-2 text-right text-green-600 tnum">{brl(r.receita)}</td>
                  <td className="px-3 py-2 text-right text-red-500 tnum">{brl(r.despesa)}</td>
                  <td className={`px-3 py-2 text-right font-bold tnum ${r.resultado >= 0 ? "text-green-700" : "text-red-600"}`}>{brl(r.resultado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
