export const dynamic = "force-dynamic";

import Header from "@/components/layout/Header";
import { getAlunosView } from "@/lib/actions/financeiro";
import { Users, UserCheck, UserX } from "lucide-react";

const brl = (n: number) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;

export default async function AlunosPage() {
  let d;
  try {
    d = await getAlunosView();
  } catch {
    return (
      <div className="min-h-screen">
        <Header title="Financeiro · Alunos" />
        <p className="p-8 text-sm text-gray-400 text-center">Please contact admin</p>
      </div>
    );
  }

  const maxMod = Math.max(1, ...d.byModalidade.map((m) => m.total));

  return (
    <div className="min-h-screen">
      <Header title="Financeiro · Alunos" />
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        <p className="text-xs text-gray-400 -mt-1">Base de clientes (Vindi + planilha). PF: {d.pf} · PJ: {d.pj}.</p>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1"><Users size={14} className="text-navy" /><span className="text-[10px] font-bold text-gray-400 uppercase">Total</span></div>
            <p className="text-xl font-bold text-navy">{d.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1"><UserCheck size={14} className="text-green-500" /><span className="text-[10px] font-bold text-gray-400 uppercase">Ativos</span></div>
            <p className="text-xl font-bold text-green-600">{d.ativos}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1"><UserX size={14} className="text-red-500" /><span className="text-[10px] font-bold text-gray-400 uppercase">Cancelados</span></div>
            <p className="text-xl font-bold text-red-500">{d.cancelados}</p>
          </div>
        </div>

        <section>
          <h2 className="text-lg font-bold text-navy mb-3">Por modalidade</h2>
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-2">
            {d.byModalidade.map((m) => (
              <div key={m.name} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-navy">{m.name} <span className="text-[10px] text-gray-400">({m.count})</span></span>
                  <span className="font-bold text-navy tnum">{brl(m.total)}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-cyan" style={{ width: `${(m.total / maxMod) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-navy mb-3">Top alunos (total gasto)</h2>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {d.top.map((a, i) => (
              <div key={i} className={`flex justify-between px-4 py-2.5 text-sm ${i < d.top.length - 1 ? "border-b border-gray-50" : ""}`}>
                <span className="text-navy truncate pr-2">{a.nome} <span className="text-[10px] text-gray-400">· {a.modalidade}</span></span>
                <span className="font-bold text-navy tnum flex-shrink-0">{brl(a.total)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
