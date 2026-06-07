export const dynamic = "force-dynamic";

import Header from "@/components/layout/Header";
import { getCostCenterDashboard, getVerticalPL } from "@/lib/actions/expenses";
import { PieChart, Wallet, AlertTriangle, Users } from "lucide-react";

const brl = (n: number) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;

export default async function CentroDeCustoPage() {
  const year = new Date().getFullYear();

  let data, pl;
  try {
    [data, pl] = await Promise.all([getCostCenterDashboard(year), getVerticalPL(year)]);
  } catch {
    return (
      <div className="min-h-screen">
        <Header title="Financeiro · Centro de Custo" />
        <p className="p-8 text-sm text-gray-400 text-center">
          Please contact admin
        </p>
      </div>
    );
  }

  const max = Math.max(1, ...data.centers.map((c) => c.total));
  const maxV = Math.max(1, ...data.verticais.map((c) => c.total));

  return (
    <div className="min-h-screen">
      <Header title="Financeiro · Centro de Custo" />
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        <p className="text-xs text-gray-400 -mt-1">
          {year} · despesas (OMIE/BMA, deduplicado) em 2 dimensões: <strong>vertical</strong> + <strong>categoria</strong>.
          Classifique na aba <strong>Despesas & Pessoas</strong>.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1"><Wallet size={14} className="text-navy" /><span className="text-[10px] font-bold text-gray-400 uppercase">Despesa total</span></div>
            <p className="text-xl font-bold text-navy">{brl(data.total)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1"><PieChart size={14} className="text-cyan" /><span className="text-[10px] font-bold text-gray-400 uppercase">Categorias</span></div>
            <p className="text-xl font-bold text-navy">{data.centers.filter((c) => c.id).length}</p>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
            <div className="flex items-center gap-1.5 mb-1"><AlertTriangle size={14} className="text-amber-500" /><span className="text-[10px] font-bold text-amber-500 uppercase">Sem categoria</span></div>
            <p className="text-xl font-bold text-amber-600">{brl(data.unassignedCC)}</p>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
            <div className="flex items-center gap-1.5 mb-1"><AlertTriangle size={14} className="text-amber-500" /><span className="text-[10px] font-bold text-amber-500 uppercase">Sem vertical</span></div>
            <p className="text-xl font-bold text-amber-600">{brl(data.unassignedArea)}</p>
          </div>
        </div>

        {/* P&L por vertical com overhead rateado por headcount */}
        <section>
          <h2 className="text-lg font-bold text-navy mb-3 flex items-center gap-2">
            <Users size={18} /> Custo por vertical (overhead rateado por headcount)
          </h2>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase">
              <span className="col-span-4">Vertical</span>
              <span className="col-span-2 text-center">Pessoas</span>
              <span className="col-span-2 text-right">Custo direto</span>
              <span className="col-span-2 text-right">Overhead</span>
              <span className="col-span-2 text-right">Total</span>
            </div>
            {pl.verticais.map((v) => (
              <div key={v.id} className="grid grid-cols-2 md:grid-cols-12 gap-2 px-4 py-2.5 items-center border-b border-gray-50 last:border-0">
                <span className="col-span-4 flex items-center gap-2 text-sm text-navy"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: v.color }} />{v.name}</span>
                <span className="col-span-2 text-center text-sm text-gray-500">{v.headcount}</span>
                <span className="col-span-2 text-right text-sm text-navy tnum">{brl(v.direct)}</span>
                <span className="col-span-2 text-right text-sm text-amber-600 tnum">+{brl(v.allocated)}</span>
                <span className="col-span-2 text-right text-sm font-bold text-navy tnum">{brl(v.total)}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Overhead (despesas sem vertical = compartilhado): <strong>{brl(pl.overhead)}</strong> rateado por nº de pessoas ({pl.totalHead} no total).
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section>
            <h2 className="text-lg font-bold text-navy mb-3">Por vertical (direto)</h2>
            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
              {data.verticais.map((c) => (
                <div key={c.id ?? "none"} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-navy"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />{c.name}</span>
                    <span className="font-bold text-navy tnum">{brl(c.total)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(c.total / maxV) * 100}%`, backgroundColor: c.color }} /></div>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h2 className="text-lg font-bold text-navy mb-3">Por categoria</h2>
            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
              {data.centers.map((c) => (
                <div key={c.id ?? "none"} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-navy"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />{c.name} <span className="text-[10px] text-gray-400">({c.count})</span></span>
                    <span className="font-bold text-navy tnum">{brl(c.total)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(c.total / max) * 100}%`, backgroundColor: c.color }} /></div>
                </div>
              ))}
              {data.centers.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Sem despesas neste ano.</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
