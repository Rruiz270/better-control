export const dynamic = "force-dynamic";

import { getAccountabilityStats, getProjectRollups } from "@/lib/actions/accountability";
import Header from "@/components/layout/Header";
import { AREA_CONFIGS } from "@/lib/constants";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  TrendingUp,
  Users,
  DollarSign,
  BarChart3,
} from "lucide-react";

function ComplianceBadge({ rate }: { rate: number }) {
  const color =
    rate >= 90
      ? "bg-green-100 text-green-700"
      : rate >= 70
        ? "bg-amber-100 text-amber-700"
        : "bg-red-100 text-red-700";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>
      {rate}%
    </span>
  );
}

export default async function ReportsPage() {
  const [people, rollups] = await Promise.all([
    getAccountabilityStats(),
    getProjectRollups(),
  ]);

  const totalTasks = rollups.reduce((s, a) => s + a.totalTasks, 0);
  const completedTasks = rollups.reduce((s, a) => s + a.completedTasks, 0);
  const overdueTasks = rollups.reduce((s, a) => s + a.overdueTasks, 0);
  const overallCompletion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const totalBudget = rollups.reduce((s, a) => s + a.budget, 0);
  const totalForecast = rollups.reduce((s, a) => s + a.forecast, 0);

  return (
    <div className="min-h-screen">
      <Header title="Relatorios & Accountability" />

      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        {/* Global stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <BarChart3 size={14} className="text-navy" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">Projetos</span>
            </div>
            <p className="text-xl font-bold text-navy">
              {rollups.reduce((s, a) => s + a.totalProjects, 0)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Target size={14} className="text-cyan" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">Tarefas</span>
            </div>
            <p className="text-xl font-bold text-navy">{totalTasks}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle size={14} className="text-green-500" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">Concluidas</span>
            </div>
            <p className="text-xl font-bold text-green-600">{completedTasks}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle size={14} className="text-red-500" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">Atrasadas</span>
            </div>
            <p className="text-xl font-bold text-red-500">{overdueTasks}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp size={14} className="text-cyan" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">Progresso</span>
            </div>
            <p className="text-xl font-bold text-navy">{overallCompletion}%</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign size={14} className="text-green-500" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">Budget Total</span>
            </div>
            <p className="text-lg font-bold text-navy">
              {totalBudget > 0 ? `R$ ${totalBudget.toLocaleString("pt-BR")}` : "—"}
            </p>
          </div>
        </div>

        {/* Area rollups */}
        <section>
          <h2 className="text-lg font-bold text-navy mb-3 flex items-center gap-2">
            <BarChart3 size={18} />
            Performance por Area
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rollups.map((area) => {
              const config = AREA_CONFIGS[area.areaSlug] || AREA_CONFIGS.tech;
              return (
                <div key={area.areaId} className="bg-white rounded-xl border border-gray-100 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.color }} />
                    <h3 className="text-sm font-bold text-navy">{area.areaName}</h3>
                    <div className="ml-auto flex items-center gap-2">
                      <ComplianceBadge rate={area.complianceRate} />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-4 text-center">
                    <div>
                      <p className="text-lg font-bold text-navy">{area.totalProjects}</p>
                      <p className="text-[10px] text-gray-400">Projetos</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-navy">{area.completedTasks}/{area.totalTasks}</p>
                      <p className="text-[10px] text-gray-400">Tarefas</p>
                    </div>
                    <div>
                      <p className={`text-lg font-bold ${area.overdueTasks > 0 ? "text-red-500" : "text-green-500"}`}>
                        {area.overdueTasks}
                      </p>
                      <p className="text-[10px] text-gray-400">Atrasadas</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-navy">{area.completionRate}%</p>
                      <p className="text-[10px] text-gray-400">Progresso</p>
                    </div>
                  </div>

                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${area.completionRate}%`, backgroundColor: config.color }}
                    />
                  </div>

                  {area.budget > 0 && (
                    <div className="flex justify-between text-xs text-gray-400 mt-2">
                      <span>Budget: R$ {area.budget.toLocaleString("pt-BR")}</span>
                      <span>Forecast: R$ {area.forecast.toLocaleString("pt-BR")}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* People accountability */}
        <section>
          <h2 className="text-lg font-bold text-navy mb-3 flex items-center gap-2">
            <Users size={18} />
            Accountability por Pessoa
          </h2>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="hidden md:grid grid-cols-8 gap-2 px-4 py-2 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase">
              <span className="col-span-2">Pessoa</span>
              <span className="text-center">Atribuidas</span>
              <span className="text-center">Concluidas</span>
              <span className="text-center">No Prazo</span>
              <span className="text-center">Atrasadas</span>
              <span className="text-center">Compliance</span>
              <span className="text-center">Progresso</span>
            </div>

            {people.filter((p) => p.totalAssigned > 0).map((person, i) => (
              <div
                key={person.userId}
                className={`grid grid-cols-2 md:grid-cols-8 gap-2 px-4 py-3 items-center ${
                  i < people.length - 1 ? "border-b border-gray-50" : ""
                }`}
              >
                <div className="col-span-2 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full gradient-main flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                    {person.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy truncate">{person.name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{person.areaName || "Board"}</p>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm font-bold text-navy">{person.totalAssigned}</p>
                  <p className="text-[10px] text-gray-400 md:hidden">atribuidas</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-green-600">{person.completed}</p>
                  <p className="text-[10px] text-gray-400 md:hidden">concluidas</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-cyan">{person.onTime}</p>
                  <p className="text-[10px] text-gray-400 md:hidden">no prazo</p>
                </div>
                <div className="text-center">
                  <p className={`text-sm font-bold ${person.overdue > 0 ? "text-red-500" : "text-gray-300"}`}>
                    {person.overdue}
                  </p>
                  <p className="text-[10px] text-gray-400 md:hidden">atrasadas</p>
                </div>
                <div className="text-center">
                  <ComplianceBadge rate={person.complianceRate} />
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          person.completionRate >= 80
                            ? "bg-green-500"
                            : person.completionRate >= 50
                              ? "bg-cyan"
                              : "bg-amber-400"
                        }`}
                        style={{ width: `${person.completionRate}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 w-8">{person.completionRate}%</span>
                  </div>
                </div>
              </div>
            ))}

            {people.filter((p) => p.totalAssigned > 0).length === 0 && (
              <p className="p-8 text-sm text-gray-400 text-center">
                Nenhuma tarefa atribuida ainda.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
