export const dynamic = "force-dynamic";

import Header from "@/components/layout/Header";
import { getBMAView } from "@/lib/actions/financeiro";
import { Users2, Wallet } from "lucide-react";

const brl = (n: number) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;
const MN = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default async function BMAPage() {
  const year = new Date().getFullYear();
  let d;
  try { d = await getBMAView(year); } catch {
    return <div className="min-h-screen"><Header title="Financeiro · BMA" /><p className="p-8 text-sm text-gray-400 text-center">Sem acesso ao Modo Financeiro.</p></div>;
  }
  const max = Math.max(1, ...d.monthly);
  const months = MN.map((_, i) => i).filter((i) => d.monthly[i]);

  return (
    <div className="min-h-screen">
      <Header title="Financeiro · BMA (Folha)" />
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        <p className="text-xs text-gray-400 -mt-1">{year} · folha/benefícios pagos pela BMA (BPO de RH). Fonte: BMA/OMIE.</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1"><Wallet size={14} className="text-navy" /><span className="text-[10px] font-bold text-gray-400 uppercase">Folha {year}</span></div>
            <p className="text-xl font-bold text-navy">{brl(d.total)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1"><Users2 size={14} className="text-cyan" /><span className="text-[10px] font-bold text-gray-400 uppercase">Pagamentos/mês (pico)</span></div>
            <p className="text-xl font-bold text-navy">{d.headcountMax}</p>
          </div>
        </div>
        <section>
          <h2 className="text-lg font-bold text-navy mb-3">Folha mês a mês</h2>
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-2">
            {months.map((i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-8 text-xs text-gray-400">{MN[i]}</span>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-navy" style={{ width: `${(d.monthly[i] / max) * 100}%` }} /></div>
                <span className="w-28 text-right text-sm font-bold text-navy tnum">{brl(d.monthly[i])}</span>
                <span className="w-10 text-right text-[10px] text-gray-400">{d.counts[i]}x</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
