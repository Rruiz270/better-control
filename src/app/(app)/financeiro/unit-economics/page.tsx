export const dynamic = "force-dynamic";

import Header from "@/components/layout/Header";
import { getUnitEconomics } from "@/lib/actions/executive";
import { Users, UserX, Repeat, Ticket } from "lucide-react";

const brl = (n: number) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;

export default async function UnitEconomicsPage() {
  const year = new Date().getFullYear();
  let d;
  try { d = await getUnitEconomics(year); } catch {
    return <div className="min-h-screen"><Header title="Financeiro · Unit Economics" /><p className="p-8 text-sm text-gray-400 text-center">Please contact admin</p></div>;
  }
  const maxMod = Math.max(1, ...d.byModalidade.map((m) => m.count));

  return (
    <div className="min-h-screen">
      <Header title="Financeiro · Unit Economics" />
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        <p className="text-xs text-gray-400 -mt-1">Saúde do negócio de Idiomas: base, churn, ticket e receita por aluno.</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Kpi icon={<Users size={14} className="text-cyan" />} l="Base total" v={String(d.totalAlunos)} />
          <Kpi icon={<Users size={14} className="text-green-500" />} l="Ativos" v={String(d.ativos)} />
          <Kpi icon={<UserX size={14} className="text-red-500" />} l="Churn" v={`${d.churnRate}%`} tone="red" />
          <Kpi icon={<Ticket size={14} className="text-navy" />} l="Ticket médio" v={brl(d.ticketMedio)} />
          <Kpi icon={<Repeat size={14} className="text-navy" />} l="Receita/aluno" v={brl(d.receitaPorAluno)} />
        </div>
        <section>
          <h2 className="text-lg font-bold text-navy mb-3">Alunos por modalidade</h2>
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-2">
            {d.byModalidade.map((m) => (
              <div key={m.name} className="flex items-center gap-3">
                <span className="w-40 text-sm text-navy truncate">{m.name}</span>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-cyan" style={{ width: `${(m.count / maxMod) * 100}%` }} /></div>
                <span className="w-12 text-right text-sm font-bold text-navy">{m.count}</span>
                <span className="w-28 text-right text-xs text-gray-400">{brl(m.total)}</span>
              </div>
            ))}
          </div>
        </section>
        <p className="text-[11px] text-gray-400">Próximo nível: CAC (MKT ÷ novos), LTV (ticket × duração × margem) e payback — cruzando Vendas + MKT.</p>
      </div>
    </div>
  );
}
function Kpi({ icon, l, v, tone }: { icon: React.ReactNode; l: string; v: string; tone?: "red" }) {
  return <div className="bg-white rounded-xl border border-gray-100 p-4"><div className="flex items-center gap-1.5 mb-1">{icon}<span className="text-[10px] font-bold text-gray-400 uppercase">{l}</span></div><p className={`text-xl font-bold ${tone === "red" ? "text-red-500" : "text-navy"}`}>{v}</p></div>;
}
