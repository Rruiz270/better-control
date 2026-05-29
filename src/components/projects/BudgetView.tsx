"use client";

import { DollarSign, TrendingUp, TrendingDown, Calendar, Target } from "lucide-react";

type Kpi = {
  id: string;
  name: string;
  category: string;
  type: string;
  targetValue: string | null;
  currentValue: string | null;
  unit: string | null;
  period: string | null;
};

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatBRL(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
}

export default function BudgetView({
  budget,
  forecast,
  startDate,
  targetDate,
  kpis,
}: {
  budget?: string | null;
  forecast?: string | null;
  startDate?: string | null;
  targetDate?: string | null;
  kpis: Kpi[];
}) {
  const budgetNum = budget ? Number(budget) : 0;
  const forecastNum = forecast ? Number(forecast) : 0;
  const variance = budgetNum > 0 ? ((forecastNum - budgetNum) / budgetNum) * 100 : 0;
  const spent = kpis.find((k) => k.name.toLowerCase().includes("custo"))?.currentValue;
  const revenue = kpis.find((k) => k.name.toLowerCase().includes("receita"))?.currentValue;
  const spentNum = spent ? Number(spent) : 0;
  const revenueNum = revenue ? Number(revenue) : 0;
  const burnRate = budgetNum > 0 ? Math.round((spentNum / budgetNum) * 100) : 0;

  const currentMonth = new Date().getMonth();

  return (
    <div className="space-y-4">
      {/* Financial summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign size={14} className="text-navy" />
            <span className="text-[10px] font-bold text-gray-400 uppercase">Budget</span>
          </div>
          <p className="text-lg font-bold text-navy">{formatBRL(budget)}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Target size={14} className="text-cyan" />
            <span className="text-[10px] font-bold text-gray-400 uppercase">Forecast</span>
          </div>
          <p className="text-lg font-bold text-cyan">{formatBRL(forecast)}</p>
          {variance !== 0 && (
            <span className={`text-[10px] font-medium flex items-center gap-0.5 mt-0.5 ${variance > 0 ? "text-green-500" : "text-red-500"}`}>
              {variance > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {variance > 0 ? "+" : ""}{variance.toFixed(1)}%
            </span>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={14} className="text-green-500" />
            <span className="text-[10px] font-bold text-gray-400 uppercase">Receita</span>
          </div>
          <p className="text-lg font-bold text-green-600">{formatBRL(revenue)}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown size={14} className="text-red-500" />
            <span className="text-[10px] font-bold text-gray-400 uppercase">Custo</span>
          </div>
          <p className="text-lg font-bold text-red-500">{formatBRL(spent)}</p>
        </div>
      </div>

      {/* Burn rate */}
      {budgetNum > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-700">Burn Rate</span>
            <span className={`text-sm font-bold ${burnRate > 80 ? "text-red-500" : burnRate > 50 ? "text-amber-500" : "text-green-500"}`}>
              {burnRate}% utilizado
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                burnRate > 80 ? "bg-red-500" : burnRate > 50 ? "bg-amber-400" : "bg-green-500"
              }`}
              style={{ width: `${Math.min(100, burnRate)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-gray-400">
            <span>{formatBRL(spentNum)} gasto</span>
            <span>{formatBRL(budgetNum - spentNum)} restante</span>
          </div>
        </div>
      )}

      {/* Monthly calendar visualization */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <Calendar size={14} />
          Calendario de Execucao
        </h4>
        <div className="grid grid-cols-6 md:grid-cols-12 gap-1">
          {MONTHS.map((month, i) => {
            const isActive = startDate && targetDate
              ? i >= new Date(startDate).getMonth() && i <= new Date(targetDate).getMonth()
              : false;
            const isCurrent = i === currentMonth;

            return (
              <div
                key={month}
                className={`text-center py-2 rounded-lg text-xs font-medium transition-all ${
                  isCurrent
                    ? "gradient-main text-white shadow-sm"
                    : isActive
                      ? "bg-cyan/10 text-cyan border border-cyan/20"
                      : "bg-gray-50 text-gray-300"
                }`}
              >
                {month}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-400">
          {startDate && <span>Inicio: {new Date(startDate).toLocaleDateString("pt-BR")}</span>}
          {targetDate && <span>Prazo: {new Date(targetDate).toLocaleDateString("pt-BR")}</span>}
        </div>
      </div>

      {/* Financial KPIs detail */}
      {kpis.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h4 className="text-sm font-bold text-gray-700 mb-3">KPIs Financeiros</h4>
          <div className="space-y-3">
            {kpis.map((kpi) => {
              const current = kpi.currentValue ? Number(kpi.currentValue) : 0;
              const target = kpi.targetValue ? Number(kpi.targetValue) : 0;
              const progress = target > 0 ? Math.round((current / target) * 100) : 0;

              return (
                <div key={kpi.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600">{kpi.name}</span>
                    <span className="text-xs text-gray-400">
                      {formatBRL(kpi.currentValue)} / {formatBRL(kpi.targetValue)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${progress >= 100 ? "bg-green-500" : progress >= 70 ? "bg-cyan" : "bg-amber-400"}`}
                      style={{ width: `${Math.min(100, progress)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!budgetNum && !forecastNum && kpis.length === 0 && (
        <div className="text-center py-12">
          <DollarSign size={48} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Nenhum dado financeiro definido.</p>
          <p className="text-xs text-gray-300 mt-1">Adicione budget e KPIs financeiros ao projeto.</p>
        </div>
      )}
    </div>
  );
}
