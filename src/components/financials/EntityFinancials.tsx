"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, Save, Loader2, TrendingUp, TrendingDown, Gauge } from "lucide-react";
import {
  getFinancials,
  getPlanYears,
  saveFinancialRow,
  type FinancialData,
  type FinancialStream,
  type FinancialMetric,
  type FinancialEntityType,
} from "@/lib/actions/financials";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const zeros = () => Array(12).fill(0) as number[];

function emptyData(): FinancialData {
  return {
    receita: { forecast: zeros(), budget: zeros(), actual: zeros() },
    custo: { budget: zeros(), actual: zeros() },
    valor_gerado: { actual: zeros() },
  };
}

const sum = (a: number[]) => a.reduce((x, y) => x + (Number(y) || 0), 0);
const brl = (n: number) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;

const METRIC_LABEL: Record<FinancialMetric, string> = {
  forecast: "Forecast",
  budget: "Budget",
  actual: "Actual",
};
const METRIC_TONE: Record<FinancialMetric, string> = {
  forecast: "text-cyan",
  budget: "text-navy",
  actual: "text-green",
};

type RowKey = `${FinancialStream}:${FinancialMetric}`;

export default function EntityFinancials({
  entityType,
  entityId,
  canEdit,
  profile,
  multiplier,
  title,
}: {
  entityType: FinancialEntityType;
  entityId: string;
  canEdit: boolean;
  profile: "receita" | "suporte";
  multiplier: number;
  title?: string;
}) {
  const thisYear = new Date().getFullYear();
  const [years, setYears] = useState<number[]>([thisYear]);
  const [year, setYear] = useState<number>(thisYear);
  const [data, setData] = useState<FinancialData>(emptyData());
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [savingRow, setSavingRow] = useState<RowKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [ys, d] = await Promise.all([
          getPlanYears(entityType, entityId),
          getFinancials(entityType, entityId, thisYear),
        ]);
        if (!active) return;
        setYears(ys.length ? ys : [thisYear]);
        setData(d);
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

  function loadYear(y: number) {
    setYear(y);
    setLoading(true);
    setError(null);
    startTransition(async () => {
      try {
        const d = await getFinancials(entityType, entityId, y);
        setData(d);
        setDirty({});
      } catch {
        setError("Não foi possível carregar os dados financeiros.");
      } finally {
        setLoading(false);
      }
    });
  }

  function addNextYear() {
    const next = Math.max(...years) + 1;
    setYears((prev) => [...prev, next]);
    loadYear(next);
  }

  function setCell(stream: FinancialStream, metric: FinancialMetric, idx: number, value: string) {
    const n = value === "" ? 0 : Number(value);
    if (Number.isNaN(n)) return;
    setData((prev) => {
      const streamObj = { ...(prev[stream] as Record<string, number[]>) };
      const row = [...streamObj[metric]];
      row[idx] = n;
      streamObj[metric] = row;
      return { ...prev, [stream]: streamObj };
    });
    setDirty((prev) => ({ ...prev, [`${stream}:${metric}`]: true }));
  }

  function saveRow(stream: FinancialStream, metric: FinancialMetric) {
    const key: RowKey = `${stream}:${metric}`;
    setSavingRow(key);
    setError(null);
    const months = (data[stream] as Record<string, number[]>)[metric];
    startTransition(async () => {
      try {
        await saveFinancialRow({ entityType, entityId, year, stream, metric, months });
        setDirty((prev) => ({ ...prev, [key]: false }));
      } catch {
        setError("Sem permissão para editar, ou falha ao salvar.");
      } finally {
        setSavingRow(null);
      }
    });
  }

  // --- Efficiency (the 30x rule) ---
  const valorGerado =
    profile === "receita" ? sum(data.receita.actual) : sum(data.valor_gerado.actual);
  const custo = sum(data.custo.actual);
  const ratio = custo > 0 ? valorGerado / custo : null;
  const meta = multiplier;
  const ratioStatus =
    ratio === null ? "neutral" : ratio >= meta ? "good" : ratio >= meta * 0.8 ? "warn" : "bad";
  const custoAlvo = meta > 0 ? valorGerado / meta : 0; // custar no máximo isso p/ bater a meta
  const valorAlvo = custo * meta; // gerar isso p/ bater a meta no custo atual

  const statusColor = {
    good: "text-green",
    warn: "text-amber-500",
    bad: "text-red-500",
    neutral: "text-gray-400",
  }[ratioStatus];
  const statusBg = {
    good: "bg-green/10 border-green/30",
    warn: "bg-amber-50 border-amber-200",
    bad: "bg-red-50 border-red-200",
    neutral: "bg-gray-50 border-gray-200",
  }[ratioStatus];

  function renderTable(
    sectionLabel: string,
    stream: FinancialStream,
    metrics: FinancialMetric[],
    varianceMode: "revenue" | "cost" | "none"
  ) {
    const streamData = data[stream] as Record<string, number[]>;
    const variance =
      varianceMode === "none"
        ? null
        : streamData.actual.map((a, i) => a - streamData.budget[i]);
    const varTotal = variance ? sum(streamData.actual) - sum(streamData.budget) : 0;
    // Para custo, gastar MENOS que o budget é bom (verde quando negativo).
    const goodWhenPositive = varianceMode === "revenue";

    function varColor(v: number) {
      if (v === 0) return "text-gray-400";
      const positive = v > 0;
      const isGood = goodWhenPositive ? positive : !positive;
      return isGood ? "text-green" : "text-red-500";
    }

    return (
      <div className="mb-4">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
          {sectionLabel}
        </h4>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-gray-400">
                <th className="text-left font-medium px-2 py-1.5 sticky left-0 bg-white z-10 min-w-[90px]"></th>
                {MONTHS.map((m) => (
                  <th key={m} className="font-medium px-2 py-1.5 text-right min-w-[68px]">
                    {m}
                  </th>
                ))}
                <th className="font-bold px-2 py-1.5 text-right min-w-[92px] text-navy">Total</th>
                {canEdit && <th className="px-2 py-1.5"></th>}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <tr key={metric} className="border-t border-gray-100">
                  <td
                    className={`text-left font-semibold px-2 py-1.5 sticky left-0 bg-white z-10 ${METRIC_TONE[metric]}`}
                  >
                    {METRIC_LABEL[metric]}
                  </td>
                  {streamData[metric].map((val, i) => (
                    <td key={i} className="px-1 py-1 text-right">
                      {canEdit ? (
                        <input
                          type="number"
                          value={val === 0 ? "" : val}
                          placeholder="0"
                          onChange={(e) => setCell(stream, metric, i, e.target.value)}
                          className="w-[64px] text-right px-1.5 py-1 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan/40 text-xs"
                        />
                      ) : (
                        <span className="text-xs text-gray-600">{brl(val)}</span>
                      )}
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-right font-bold text-navy whitespace-nowrap">
                    {brl(sum(streamData[metric]))}
                  </td>
                  {canEdit && (
                    <td className="px-2 py-1 text-right">
                      <button
                        onClick={() => saveRow(stream, metric)}
                        disabled={!dirty[`${stream}:${metric}`] || savingRow === `${stream}:${metric}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg gradient-main text-white text-xs font-medium disabled:opacity-40"
                      >
                        {savingRow === `${stream}:${metric}` ? (
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

              {variance && (
                <tr className="border-t-2 border-gray-200 bg-gray-50/60">
                  <td className="text-left font-semibold px-2 py-1.5 sticky left-0 bg-gray-50/60 z-10 text-gray-500">
                    {varianceMode === "cost" ? "Var. (orç.)" : "Var. (A−B)"}
                  </td>
                  {variance.map((v, i) => (
                    <td key={i} className={`px-2 py-1.5 text-right text-xs whitespace-nowrap ${varColor(v)}`}>
                      {v === 0 ? "—" : brl(v)}
                    </td>
                  ))}
                  <td className={`px-2 py-1.5 text-right font-bold whitespace-nowrap ${varColor(varTotal)}`}>
                    {brl(varTotal)}
                  </td>
                  {canEdit && <td />}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-5">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
          {title ?? "Financeiro"}
        </h3>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={(e) => loadYear(Number(e.target.value))}
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

      {/* Card de Eficiência (regra dos 30x) */}
      <div className={`rounded-xl border p-4 mb-5 ${statusBg}`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Gauge size={18} className={statusColor} />
            <span className="text-sm font-bold text-gray-600">Eficiência</span>
          </div>
          <div className={`text-2xl font-extrabold ${statusColor}`}>
            {ratio === null ? "—" : `${ratio.toFixed(1)}x`}
            <span className="text-sm font-medium text-gray-400"> / meta {meta}x</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
          <div>
            <p className="text-gray-400">Valor gerado (Actual)</p>
            <p className="font-bold text-navy">{brl(valorGerado)}</p>
          </div>
          <div>
            <p className="text-gray-400">Custo (Actual)</p>
            <p className="font-bold text-navy">{brl(custo)}</p>
          </div>
        </div>
        {custo > 0 && ratio !== null && ratio < meta && (
          <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
            Pra bater <b>{meta}x</b>: custar até <b>{brl(custoAlvo)}</b> (no valor gerado atual) ou
            gerar <b>{brl(valorAlvo)}</b> (no custo atual).
          </p>
        )}
        {ratio !== null && ratio >= meta && (
          <p className="text-[11px] text-green mt-3 flex items-center gap-1">
            <TrendingUp size={12} /> Meta de eficiência batida.
          </p>
        )}
        {ratio === null && (
          <p className="text-[11px] text-gray-400 mt-3 flex items-center gap-1">
            <TrendingDown size={12} /> Sem custo lançado ainda — preencha o Actual de custo.
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-gray-400">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : (
        <>
          {profile === "receita"
            ? renderTable("Receita", "receita", ["forecast", "budget", "actual"], "revenue")
            : renderTable("Valor Gerado (estimado)", "valor_gerado", ["actual"], "none")}
          {renderTable("Custo", "custo", ["budget", "actual"], "cost")}
        </>
      )}

      {!canEdit && !loading && (
        <p className="text-[11px] text-gray-400 mt-1">
          Somente leitura — apenas o head da área ou admin editam.
        </p>
      )}
    </div>
  );
}
