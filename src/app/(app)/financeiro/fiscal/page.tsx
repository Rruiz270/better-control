export const dynamic = "force-dynamic";

import Header from "@/components/layout/Header";
import { getFiscalView } from "@/lib/actions/financeiro";
import { FileText, Package } from "lucide-react";

const brl = (n: number) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;
const MN = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default async function FiscalPage() {
  const year = new Date().getFullYear();
  let d;
  try {
    d = await getFiscalView(year);
  } catch {
    return (
      <div className="min-h-screen">
        <Header title="Financeiro · Fiscal" />
        <p className="p-8 text-sm text-gray-400 text-center">Please contact admin</p>
      </div>
    );
  }

  const max = Math.max(1, ...d.nfse, ...d.nfe);
  const months = MN.map((_, i) => i).filter((i) => d.nfse[i] || d.nfe[i]);

  return (
    <div className="min-h-screen">
      <Header title="Financeiro · Fiscal (NFS-e / NF-e)" />
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        <p className="text-xs text-gray-400 -mt-1">{year} · notas emitidas (serviço NFS-e + produto NF-e). Fonte: OMIE.</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1"><FileText size={14} className="text-cyan" /><span className="text-[10px] font-bold text-gray-400 uppercase">NFS-e (serviço)</span></div>
            <p className="text-lg font-bold text-navy">{brl(d.totalNfse)}</p>
            <p className="text-[10px] text-gray-400">{d.countNfse} notas</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1"><Package size={14} className="text-purple-500" /><span className="text-[10px] font-bold text-gray-400 uppercase">NF-e (produto)</span></div>
            <p className="text-lg font-bold text-navy">{brl(d.totalNfe)}</p>
            <p className="text-[10px] text-gray-400">{d.countNfe} notas</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Total emitido</span>
            <p className="text-lg font-bold text-navy">{brl(d.totalNfse + d.totalNfe)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Qtd notas</span>
            <p className="text-lg font-bold text-navy">{d.countNfse + d.countNfe}</p>
          </div>
        </div>

        <section>
          <h2 className="text-lg font-bold text-navy mb-3">Emissão mês a mês</h2>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase">
              <span className="col-span-2">Mês</span>
              <span className="col-span-3 text-right">NFS-e</span>
              <span className="col-span-3 text-right">NF-e</span>
              <span className="col-span-4">Comparativo</span>
            </div>
            {months.map((i) => (
              <div key={i} className="grid grid-cols-2 md:grid-cols-12 gap-2 px-4 py-2.5 items-center border-b border-gray-50 last:border-0">
                <span className="col-span-2 text-sm font-medium text-navy">{MN[i]}</span>
                <span className="col-span-3 text-right text-sm text-cyan tnum">{brl(d.nfse[i])}</span>
                <span className="col-span-3 text-right text-sm text-purple-600 tnum">{brl(d.nfe[i])}</span>
                <span className="col-span-4 hidden md:flex items-center gap-1 h-4">
                  <span className="h-2 rounded-full bg-cyan" style={{ width: `${(d.nfse[i] / max) * 50}%` }} />
                  <span className="h-2 rounded-full bg-purple-400" style={{ width: `${(d.nfe[i] / max) * 50}%` }} />
                </span>
              </div>
            ))}
            {months.length === 0 && <p className="p-6 text-sm text-gray-400 text-center">Sem emissão neste ano.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
