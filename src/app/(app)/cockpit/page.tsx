export const dynamic = "force-dynamic";

import Header from "@/components/layout/Header";
import { getCeoCockpit } from "@/lib/actions/executive";
import { AlertTriangle, TrendingUp, Wallet, Clock, Gauge, Target } from "lucide-react";

const brl = (n: number) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;
const sem = { green: "#22C55E", amber: "#F59E0B", red: "#EF4444" } as const;

export default async function CockpitPage() {
  const year = new Date().getFullYear();
  let d;
  try {
    d = await getCeoCockpit(year);
  } catch {
    return (
      <div className="min-h-screen"><Header title="Cockpit Executivo" />
        <p className="p-8 text-sm text-gray-400 text-center">Apenas admin acessa o cockpit executivo.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title="Cockpit Executivo" />
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
        {/* Banner topo */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Kpi icon={<TrendingUp size={14} className="text-green-500" />} label="Receita (YTD)" value={brl(d.totalReceita)} />
          <Kpi icon={<Wallet size={14} className="text-red-500" />} label="Resultado (YTD)" value={brl(d.totalResultado)} tone={d.totalResultado < 0 ? "red" : "green"} />
          <Kpi icon={<Gauge size={14} className="text-navy" />} label="Eficiência" value={d.totalCusto > 0 ? `${(d.totalReceita / d.totalCusto).toFixed(1)}x` : "—"} />
          <Kpi icon={<Clock size={14} className="text-amber-500" />} label="Tarefas atrasadas" value={String(d.overdueTotal)} tone={d.overdueTotal > 0 ? "red" : undefined} />
          <Kpi icon={<Wallet size={14} className="text-red-500" />} label="Runway" value={d.runway != null ? `~${d.runway} meses` : "definir caixa"} tone={d.runway != null && d.runway < 6 ? "red" : undefined} />
        </div>

        {/* Verticais */}
        <section>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-2">Verticais — saúde do portfólio</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {d.verticais.map((v) => (
              <div key={v.id} className="bg-white rounded-xl border border-gray-100 p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1" style={{ background: v.color }} />
                <div className="flex items-center gap-2 mt-1 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: sem[v.health] }} />
                  <h3 className="text-sm font-bold text-navy">{v.name}</h3>
                </div>
                <Row l="Receita / Meta" r={`${brl(v.receita)} / ${v.target ? brl(v.target) : "—"}`} />
                <Row l="Custo" r={brl(v.custo)} />
                <Row l="Resultado" r={brl(v.resultado)} red={v.resultado < 0} />
                <div className="flex items-end justify-between mt-2">
                  <span className="text-2xl font-extrabold" style={{ color: v.ratio != null && v.ratio >= 1 ? "#00A878" : "#c0392b" }}>{v.ratio != null ? `${v.ratio.toFixed(1)}x` : "—"}</span>
                  <span className="text-[10px] text-gray-400">meta 30x · alocação {v.allocPct}%</span>
                </div>
                {v.overdue > 0 && <p className="text-[11px] text-red-500 mt-1">⏱ {v.overdue} tarefa(s) atrasada(s)</p>}
              </div>
            ))}
          </div>
        </section>

        {/* Riscos */}
        <section>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2"><AlertTriangle size={15} /> Top riscos do grupo</h2>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {d.risks.length === 0 && <p className="p-6 text-sm text-gray-400 text-center">Sem riscos sinalizados.</p>}
            {d.risks.map((r, i) => (
              <div key={i} className={`flex items-start gap-3 px-4 py-3 text-sm ${i < d.risks.length - 1 ? "border-b border-gray-50" : ""}`}>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${r.level === "red" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{r.tag}</span>
                <span className="text-navy">{r.text}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1"><Target size={12} /> Defina metas e caixa em <strong>Metas</strong> p/ runway e % de meta ficarem completos.</p>
        </section>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: "red" | "green" }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center gap-1.5 mb-1">{icon}<span className="text-[10px] font-bold text-gray-400 uppercase">{label}</span></div>
      <p className={`text-xl font-bold ${tone === "red" ? "text-red-500" : tone === "green" ? "text-green-600" : "text-navy"}`}>{value}</p>
    </div>
  );
}
function Row({ l, r, red }: { l: string; r: string; red?: boolean }) {
  return <div className="flex justify-between text-sm py-1 border-b border-gray-50"><span className="text-gray-500">{l}</span><span className={`font-medium tnum ${red ? "text-red-600" : "text-navy"}`}>{r}</span></div>;
}
