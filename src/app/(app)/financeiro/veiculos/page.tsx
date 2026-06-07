export const dynamic = "force-dynamic";

import Header from "@/components/layout/Header";
import { getVeiculosView } from "@/lib/actions/financeiro";
import { Car } from "lucide-react";

const brl = (n: number) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;

export default async function VeiculosPage() {
  const year = new Date().getFullYear();
  let d;
  try { d = await getVeiculosView(year); } catch {
    return <div className="min-h-screen"><Header title="Financeiro · Veículos" /><p className="p-8 text-sm text-gray-400 text-center">Sem acesso ao Modo Financeiro.</p></div>;
  }
  const max = Math.max(1, ...d.byFornecedor.map((f) => f.total));

  return (
    <div className="min-h-screen">
      <Header title="Financeiro · Veículos" />
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        <p className="text-xs text-gray-400 -mt-1">{year} · despesas com veículos (frota). {d.count} lançamentos.</p>
        <div className="bg-white rounded-xl border border-gray-100 p-4 inline-flex items-center gap-2">
          <Car size={16} className="text-navy" /><span className="text-[10px] font-bold text-gray-400 uppercase mr-2">Total</span>
          <span className="text-xl font-bold text-navy">{brl(d.total)}</span>
        </div>
        <section>
          <h2 className="text-lg font-bold text-navy mb-3">Por fornecedor</h2>
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-2">
            {d.byFornecedor.map((f) => (
              <div key={f.name} className="space-y-1">
                <div className="flex justify-between text-sm"><span className="text-navy truncate pr-2">{f.name}</span><span className="font-bold text-navy tnum">{brl(f.total)}</span></div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-navy" style={{ width: `${(f.total / max) * 100}%` }} /></div>
              </div>
            ))}
            {d.byFornecedor.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Sem despesas de veículos neste ano.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
