export const dynamic = "force-dynamic";

import Header from "@/components/layout/Header";
import { getNotasView } from "@/lib/actions/financeiro";
import { FileCheck, FileX, AlertTriangle, RotateCcw } from "lucide-react";

const brl = (n: number) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;

export default async function NotasPage() {
  let d;
  try {
    d = await getNotasView();
  } catch {
    return (
      <div className="min-h-screen">
        <Header title="Financeiro · Notas" />
        <p className="p-8 text-sm text-gray-400 text-center">Please contact admin</p>
      </div>
    );
  }

  const pctNota = d.total > 0 ? Math.round((d.comNota / d.total) * 100) : 0;

  return (
    <div className="min-h-screen">
      <Header title="Financeiro · Notas Fiscais" />
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        <p className="text-xs text-gray-400 -mt-1">Status de nota fiscal e ocorrências (chargeback/estorno) por cliente.</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1"><FileCheck size={14} className="text-green-500" /><span className="text-[10px] font-bold text-gray-400 uppercase">Com nota</span></div>
            <p className="text-lg font-bold text-green-600">{brl(d.comNota)}</p>
            <p className="text-[10px] text-gray-400">{pctNota}% do faturado</p>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
            <div className="flex items-center gap-1.5 mb-1"><FileX size={14} className="text-amber-500" /><span className="text-[10px] font-bold text-amber-500 uppercase">Sem nota</span></div>
            <p className="text-lg font-bold text-amber-600">{brl(d.semNota)}</p>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-100 p-4">
            <div className="flex items-center gap-1.5 mb-1"><AlertTriangle size={14} className="text-red-500" /><span className="text-[10px] font-bold text-red-500 uppercase">Chargeback</span></div>
            <p className="text-lg font-bold text-red-600">{brl(d.chargeback)}</p>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-100 p-4">
            <div className="flex items-center gap-1.5 mb-1"><RotateCcw size={14} className="text-red-500" /><span className="text-[10px] font-bold text-red-500 uppercase">Estornos</span></div>
            <p className="text-lg font-bold text-red-600">{brl(d.refund)}</p>
          </div>
        </div>

        <section>
          <h2 className="text-lg font-bold text-navy mb-3">Ocorrências (chargeback / estorno)</h2>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase">
              <span className="col-span-6">Cliente</span>
              <span className="col-span-3 text-right">Chargeback</span>
              <span className="col-span-3 text-right">Estorno</span>
            </div>
            {d.problemas.map((p, i) => (
              <div key={i} className={`grid grid-cols-2 md:grid-cols-12 gap-2 px-4 py-2.5 items-center ${i < d.problemas.length - 1 ? "border-b border-gray-50" : ""}`}>
                <span className="col-span-6 text-sm text-navy truncate">{p.nome} <span className="text-[10px] text-gray-300">{p.doc}</span></span>
                <span className="col-span-3 text-right text-sm text-red-600 tnum">{p.chargeback ? brl(p.chargeback) : "—"}</span>
                <span className="col-span-3 text-right text-sm text-red-600 tnum">{p.refund ? brl(p.refund) : "—"}</span>
              </div>
            ))}
            {d.problemas.length === 0 && <p className="p-6 text-sm text-gray-400 text-center">Sem ocorrências.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
