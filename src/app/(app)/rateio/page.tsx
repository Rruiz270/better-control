export const dynamic = "force-dynamic";

import Header from "@/components/layout/Header";
import { getRateioRollup, getRateioContext } from "@/lib/actions/rateio";
import AllocationEditor from "@/components/rateio/AllocationEditor";
import RateioMatrix from "@/components/rateio/RateioMatrix";
import LogTimeWidget from "@/components/rateio/LogTimeWidget";
import { DollarSign, Clock, TrendingUp, Gauge, Users } from "lucide-react";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const brl = (n: number) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;
const hrs = (min: number) => `${(min / 60).toFixed(1)}h`;

function RatioBadge({ ratio }: { ratio: number | null }) {
  if (ratio == null) return <span className="text-gray-300 text-xs">—</span>;
  const color =
    ratio >= 30
      ? "bg-green-100 text-green-700"
      : ratio >= 10
        ? "bg-amber-100 text-amber-700"
        : "bg-red-100 text-red-600";
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>
      {ratio.toFixed(1)}x
    </span>
  );
}

export default async function RateioPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  let rows, ctx;
  try {
    [rows, ctx] = await Promise.all([getRateioRollup(year, month), getRateioContext()]);
  } catch {
    return (
      <div className="min-h-screen">
        <Header title="Rateio" />
        <p className="p-8 text-sm text-gray-400 text-center">
          Você não tem acesso ao rateio. (Apenas admin e heads de área.)
        </p>
      </div>
    );
  }

  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const totalValue = rows.reduce((s, r) => s + r.valueGenerated, 0);
  const totalMinutes = rows.reduce((s, r) => s + r.minutes, 0);
  const overallRatio = totalCost > 0 ? totalValue / totalCost : null;

  // Maior custo primeiro — onde o dinheiro/tempo está indo.
  const sorted = [...rows].sort((a, b) => b.cost - a.cost);

  return (
    <div className="min-h-screen">
      <Header title="Rateio de Tempo & Custo" />

      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        <p className="text-xs text-gray-400 -mt-2">
          Período: <strong className="text-navy">{MONTH_NAMES[month - 1]} {year}</strong> ·
          custo rateado pelo tempo real lançado; sem lançamento, cai para a alocação planejada.
        </p>

        {/* KPIs do período */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign size={14} className="text-red-500" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">Custo rateado</span>
            </div>
            <p className="text-xl font-bold text-navy">{brl(totalCost)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp size={14} className="text-green-500" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">Valor gerado</span>
            </div>
            <p className="text-xl font-bold text-green-600">{brl(totalValue)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock size={14} className="text-cyan" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">Horas lançadas</span>
            </div>
            <p className="text-xl font-bold text-navy">{hrs(totalMinutes)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Gauge size={14} className="text-navy" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">Eficiência (30x)</span>
            </div>
            <p className="text-xl font-bold text-navy">
              {overallRatio != null ? `${overallRatio.toFixed(1)}x` : "—"}
            </p>
          </div>
        </div>

        {/* Editores */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AllocationEditor ctx={ctx} year={year} month={month} />
          <LogTimeWidget projects={ctx.projects} />
        </div>

        {/* 🅐 Matriz pessoas × projetos (ex.: professores × cursos) */}
        <RateioMatrix year={year} month={month} />

        {/* Tabela de rateio por projeto */}
        <section>
          <h2 className="text-lg font-bold text-navy mb-3 flex items-center gap-2">
            <Users size={18} />
            Rateio por projeto
          </h2>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="hidden md:grid grid-cols-7 gap-2 px-4 py-2 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase">
              <span className="col-span-2">Projeto</span>
              <span className="text-center">Horas</span>
              <span className="text-center">Pessoas</span>
              <span className="text-right">Custo</span>
              <span className="text-right">Valor gerado</span>
              <span className="text-center">30x</span>
            </div>

            {sorted.map((r, i) => (
              <div
                key={r.projectId}
                className={`grid grid-cols-3 md:grid-cols-7 gap-2 px-4 py-3 items-center ${
                  i < sorted.length - 1 ? "border-b border-gray-50" : ""
                }`}
              >
                <span className="col-span-2 text-sm font-medium text-navy truncate">
                  {r.projectName}
                </span>
                <span className="text-center text-sm text-navy">{hrs(r.minutes)}</span>
                <span className="text-center text-sm text-gray-500">{r.contributors}</span>
                <span className="text-right text-sm font-bold text-navy">{brl(r.cost)}</span>
                <span className="text-right text-sm text-green-600">{brl(r.valueGenerated)}</span>
                <span className="text-center">
                  <RatioBadge ratio={r.ratio} />
                </span>
              </div>
            ))}

            {sorted.every((r) => r.cost === 0 && r.minutes === 0) && (
              <p className="p-8 text-sm text-gray-400 text-center">
                Sem custos ou tempo neste período. Defina o custo de uma pessoa e a alocação,
                ou lance tempo para ver o rateio.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
