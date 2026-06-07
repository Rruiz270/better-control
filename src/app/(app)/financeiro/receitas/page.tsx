export const dynamic = "force-dynamic";

import Header from "@/components/layout/Header";
import { getReceitasView } from "@/lib/actions/financeiro";
import { Users, Tag } from "lucide-react";

const brl = (n: number) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;
const MN = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default async function ReceitasPage() {
  const year = new Date().getFullYear();

  let d;
  try {
    d = await getReceitasView(year);
  } catch {
    return (
      <div className="min-h-screen">
        <Header title="Financeiro · Receitas" />
        <p className="p-8 text-sm text-gray-400 text-center">Please contact admin</p>
      </div>
    );
  }

  const maxM = Math.max(1, ...d.monthly);

  return (
    <div className="min-h-screen">
      <Header title="Financeiro · Receitas" />
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        <p className="text-xs text-gray-400 -mt-1">{year} · receitas pagas (Vindi/OMIE). Total <strong className="text-green-600">{brl(d.total)}</strong>.</p>

        <section>
          <h2 className="text-lg font-bold text-navy mb-3">Receita mês a mês</h2>
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-2">
            {d.monthly.map((v, i) => (v > 0 ? (
              <div key={i} className="flex items-center gap-3">
                <span className="w-8 text-xs text-gray-400">{MN[i]}</span>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-green-400" style={{ width: `${(v / maxM) * 100}%` }} />
                </div>
                <span className="w-28 text-right text-sm font-bold text-navy tnum">{brl(v)}</span>
              </div>
            ) : null))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section>
            <h2 className="text-sm font-bold text-navy mb-2 flex items-center gap-2"><Users size={16} className="text-cyan" /> Top clientes</h2>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {d.byClient.map((c, i) => (
                <div key={c.name} className={`flex justify-between px-4 py-2.5 text-sm ${i < d.byClient.length - 1 ? "border-b border-gray-50" : ""}`}>
                  <span className="text-navy truncate pr-2">{c.name}</span>
                  <span className="font-bold text-navy tnum flex-shrink-0">{brl(c.total)}</span>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h2 className="text-sm font-bold text-navy mb-2 flex items-center gap-2"><Tag size={16} className="text-cyan" /> Por categoria</h2>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {d.byCategoria.map((c, i) => (
                <div key={c.name} className={`flex justify-between px-4 py-2.5 text-sm ${i < d.byCategoria.length - 1 ? "border-b border-gray-50" : ""}`}>
                  <span className="text-navy truncate pr-2">{c.name}</span>
                  <span className="font-bold text-navy tnum flex-shrink-0">{brl(c.total)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
