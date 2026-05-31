"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Plus, Save, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import {
  getFinancialGrid,
  getPlanYears,
  saveFinancialRow,
  type FinancialGrid as Grid,
  type FinancialMetric,
  type FinancialEntityType,
} from "@/lib/actions/financials";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const METRIC_ROWS: { key: FinancialMetric; label: string; tone: string }[] = [
  { key: "forecast", label: "Forecast", tone: "text-cyan" },
  { key: "budget", label: "Budget", tone: "text-navy" },
  { key: "actual", label: "Actual", tone: "text-green" },
];

function emptyGrid(): Grid {
  return { forecast: Array(12).fill(0), budget: Array(12).fill(0), actual: Array(12).fill(0) };
}

function sum(arr: number[]) {
  return arr.reduce((a, b) => a + (Number(b) || 0), 0);
}

function brl(n: number) {
  return `R$ ${Math.round(n).toLocaleString("pt-BR")}`;
}

export default function FinancialGrid({
  entityType,
  entityId,
  canEdit,
  title,
}: {
  entityType: FinancialEntityType;
  entityId: string;
  canEdit: boolean;
  title?: string;
}) {
  const thisYear = new Date().getFullYear();
  const [years, setYears] = useState<number[]>([thisYear]);
  const [year, setYear] = useState<number>(thisYear);
  const [grid, setGrid] = useState<Grid>(emptyGrid());
  const [dirty, setDirty] = useState<Record<FinancialMetric, boolean>>({
    forecast: false,
    budget: false,
    actual: false,
  });
  const [loading, setLoading] = useState(true);
  const [savingMetric, setSavingMetric] = useState<FinancialMetric | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const loadGrid = useCallback(
    (y: number) => {
      setLoading(true);
      setError(null);
      startTransition(async () => {
        try {
          const g = await getFinancialGrid(entityType, entityId, y);
          setGrid(g);
          setDirty({ forecast: false, budget: false, actual: false });
        } catch {
          setError("Não foi possível carregar os dados financeiros.");
        } finally {
          setLoading(false);
        }
      });
    },
    [entityType, entityId]
  );

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [ys, g] = await Promise.all([
          getPlanYears(entityType, entityId),
          getFinancialGrid(entityType, entityId, thisYear),
        ]);
        if (!active) return;
        setYears(ys.length ? ys : [thisYear]);
        setGrid(g);
      } catch {
        if (active) setError("Não foi possível carregar os dados financeiros.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changeYear(y: number) {
    setYear(y);
    loadGrid(y);
  }

  function addNextYear() {
    const next = Math.max(...years) + 1;
    setYears((prev) => [...prev, next]);
    changeYear(next);
  }

  function setCell(metric: FinancialMetric, monthIdx: number, value: string) {
    const n = value === "" ? 0 : Number(value);
    if (Number.isNaN(n)) return;
    setGrid((prev) => {
      const row = [...prev[metric]];
      row[monthIdx] = n;
      return { ...prev, [metric]: row };
    });
    setDirty((prev) => ({ ...prev, [metric]: true }));
  }

  function saveRow(metric: FinancialMetric) {
    setSavingMetric(metric);
    setError(null);
    startTransition(async () => {
      try {
        await saveFinancialRow({ entityType, entityId, year, metric, months: grid[metric] });
        setDirty((prev) => ({ ...prev, [metric]: false }));
      } catch {
        setError("Sem permissão para editar, ou falha ao salvar.");
      } finally {
        setSavingMetric(null);
      }
    });
  }

  const variance = grid.actual.map((a, i) => a - grid.budget[i]);
  const varianceTotal = sum(grid.actual) - sum(grid.budget);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-5">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
          {title ?? "Forecast · Budget · Actual"}
        </h3>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={(e) => changeYear(Number(e.target.value))}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-navy"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          {canEdit && (
            <button
              onClick={addNextYear}
              title="Adicionar próximo ano"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-sm hover:bg-gray-200"
            >
              <Plus size={14} /> Ano
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10 text-gray-400">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-gray-400">
                <th className="text-left font-medium px-2 py-2 sticky left-0 bg-white z-10 min-w-[96px]"></th>
                {MONTHS.map((m) => (
                  <th key={m} className="font-medium px-2 py-2 text-right min-w-[72px]">
                    {m}
                  </th>
                ))}
                <th className="font-bold px-2 py-2 text-right min-w-[96px] text-navy">Total</th>
                {canEdit && <th className="px-2 py-2"></th>}
              </tr>
            </thead>
            <tbody>
              {METRIC_ROWS.map(({ key, label, tone }) => (
                <tr key={key} className="border-t border-gray-100">
                  <td className={`text-left font-semibold px-2 py-2 sticky left-0 bg-white z-10 ${tone}`}>
                    {label}
                  </td>
                  {grid[key].map((val, i) => (
                    <td key={i} className="px-1 py-1 text-right">
                      {canEdit ? (
                        <input
                          type="number"
                          value={val === 0 ? "" : val}
                          placeholder="0"
                          onChange={(e) => setCell(key, i, e.target.value)}
                          className="w-[68px] text-right px-1.5 py-1 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan/40 text-xs"
                        />
                      ) : (
                        <span className="text-xs text-gray-600">{brl(val)}</span>
                      )}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-right font-bold text-navy whitespace-nowrap">
                    {brl(sum(grid[key]))}
                  </td>
                  {canEdit && (
                    <td className="px-2 py-1 text-right">
                      <button
                        onClick={() => saveRow(key)}
                        disabled={!dirty[key] || savingMetric === key}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg gradient-main text-white text-xs font-medium disabled:opacity-40"
                      >
                        {savingMetric === key ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Save size={12} />
                        )}
                        Salvar
                      </button>
                    </td>
                  )}
                </tr>
              ))}

              {/* Variância (Actual − Budget) — calculada */}
              <tr className="border-t-2 border-gray-200 bg-gray-50/60">
                <td className="text-left font-semibold px-2 py-2 sticky left-0 bg-gray-50/60 z-10 text-gray-500">
                  Var. (A−B)
                </td>
                {variance.map((v, i) => (
                  <td
                    key={i}
                    className={`px-2 py-2 text-right text-xs whitespace-nowrap ${
                      v > 0 ? "text-green" : v < 0 ? "text-red-500" : "text-gray-400"
                    }`}
                  >
                    {v === 0 ? "—" : brl(v)}
                  </td>
                ))}
                <td
                  className={`px-2 py-2 text-right font-bold whitespace-nowrap flex items-center justify-end gap-1 ${
                    varianceTotal > 0 ? "text-green" : varianceTotal < 0 ? "text-red-500" : "text-gray-400"
                  }`}
                >
                  {varianceTotal !== 0 &&
                    (varianceTotal > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />)}
                  {brl(varianceTotal)}
                </td>
                {canEdit && <td />}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {!canEdit && !loading && (
        <p className="text-[11px] text-gray-400 mt-3">
          Somente leitura — apenas o head da área ou admin podem editar.
        </p>
      )}
    </div>
  );
}
