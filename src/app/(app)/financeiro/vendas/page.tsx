export const dynamic = "force-dynamic";

import Header from "@/components/layout/Header";
import { getVendasView } from "@/lib/actions/financeiro";
import { Briefcase, User, Package } from "lucide-react";

const brl = (n: number) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;

export default async function VendasPage() {
  let d;
  try {
    d = await getVendasView();
  } catch {
    return (
      <div className="min-h-screen">
        <Header title="Financeiro · Vendas" />
        <p className="p-8 text-sm text-gray-400 text-center">Please contact admin</p>
      </div>
    );
  }

  const pctPago = d.recEsperado > 0 ? Math.round((d.recPago / d.recEsperado) * 100) : 0;
  const maxV = Math.max(1, ...d.byVendedor.map((v) => v.total));
  const maxP = Math.max(1, ...d.byProduto.map((p) => p.total));

  return (
    <div className="min-h-screen">
      <Header title="Financeiro · Vendas" />
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        <p className="text-xs text-gray-400 -mt-1">{d.count} contratos · valor total {brl(d.total)}.</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1"><Briefcase size={14} className="text-purple-500" /><span className="text-[10px] font-bold text-gray-400 uppercase">B2B (CNPJ)</span></div>
            <p className="text-lg font-bold text-navy">{brl(d.b2b.total)}</p>
            <p className="text-[10px] text-gray-400">{d.b2b.count} contratos</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1"><User size={14} className="text-cyan" /><span className="text-[10px] font-bold text-gray-400 uppercase">B2C (CPF)</span></div>
            <p className="text-lg font-bold text-navy">{brl(d.b2c.total)}</p>
            <p className="text-[10px] text-gray-400">{d.b2c.count} contratos</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Receita paga</span>
            <p className="text-lg font-bold text-green-600">{brl(d.recPago)}</p>
            <p className="text-[10px] text-gray-400">{pctPago}% do esperado</p>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
            <span className="text-[10px] font-bold text-amber-500 uppercase">A receber</span>
            <p className="text-lg font-bold text-amber-600">{brl(d.recFalta)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section>
            <h2 className="text-sm font-bold text-navy mb-2 flex items-center gap-2"><User size={16} className="text-cyan" /> Por vendedor</h2>
            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
              {d.byVendedor.map((v) => (
                <div key={v.name} className="space-y-1">
                  <div className="flex justify-between text-sm"><span className="text-navy truncate pr-2">{v.name}</span><span className="font-bold text-navy tnum">{brl(v.total)}</span></div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-cyan" style={{ width: `${(v.total / maxV) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h2 className="text-sm font-bold text-navy mb-2 flex items-center gap-2"><Package size={16} className="text-cyan" /> Por produto</h2>
            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
              {d.byProduto.map((p) => (
                <div key={p.name} className="space-y-1">
                  <div className="flex justify-between text-sm"><span className="text-navy truncate pr-2">{p.name}</span><span className="font-bold text-navy tnum">{brl(p.total)}</span></div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-navy" style={{ width: `${(p.total / maxP) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
