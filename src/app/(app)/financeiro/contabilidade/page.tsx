export const dynamic = "force-dynamic";

import Header from "@/components/layout/Header";
import { getContabilidadeView } from "@/lib/actions/financeiro";
import { Calculator } from "lucide-react";

const brl = (n: number) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;
const MN = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default async function ContabilidadePage() {
  const year = new Date().getFullYear();
  let d;
  try { d = await getContabilidadeView(year); } catch {
    return <div className="min-h-screen"><Header title="Financeiro · Contabilidade" /><p className="p-8 text-sm text-gray-400 text-center">Please contact admin</p></div>;
  }
  const max = Math.max(1, ...d.folha);
  const months = MN.map((_, i) => i).filter((i) => d.folha[i]);

  return (
    <div className="min-h-screen">
      <Header title="Financeiro · Contabilidade" />
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        <p className="text-xs text-gray-400 -mt-1">{year} · folha (BMA) + obrigações (tributos, contábil, jurídico).</p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1"><Calculator size={14} className="text-navy" /><span className="text-[10px] font-bold text-gray-400 uppercase">Folha (BMA)</span></div>
            <p className="text-lg font-bold text-navy">{brl(d.folhaTotal)}</p>
          </div>
          {d.obrigacoes.map((o) => (
            <div key={o.name} className="bg-white rounded-xl border border-gray-100 p-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase">{o.name}</span>
              <p className="text-lg font-bold text-navy">{brl(o.total)}</p>
            </div>
          ))}
        </div>

        <section>
          <h2 className="text-lg font-bold text-navy mb-3">Folha mês a mês</h2>
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-2">
            {months.map((i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-8 text-xs text-gray-400">{MN[i]}</span>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-navy" style={{ width: `${(d.folha[i] / max) * 100}%` }} /></div>
                <span className="w-28 text-right text-sm font-bold text-navy tnum">{brl(d.folha[i])}</span>
              </div>
            ))}
            {months.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Sem dados de folha neste ano.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
