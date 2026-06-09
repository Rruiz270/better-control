"use client";

import { useEffect, useState, useTransition } from "react";
import { Save, Loader2, Lock, RefreshCw } from "lucide-react";
import { getFinancialLines, getAreaRollupLines, saveFinancialLine } from "@/lib/actions/financialLines";
import {
  LINE_LABEL,
  REVENUE_LINES,
  EXPENSE_LINES,
  type FinLine,
  type FinEntity,
} from "@/lib/financialLines.constants";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const zeros = () => Array(12).fill(0) as number[];
const sum = (a: number[]) => a.reduce((x, y) => x + (Number(y) || 0), 0);
const brl = (n: number) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;

const TONE: Record<FinLine, string> = {
  contratos: "text-cyan",
  faturamento: "text-blue-600",
  cashflow: "text-indigo-600",
  cash_actual: "text-green-600",
  receita_live: "text-gray-500",
  despesa_budget: "text-amber-600",
  despesa_actual: "text-red-500",
  despesa_live: "text-gray-500",
};

export default function FinancialLinesGrid({
  entityType,
  entityId,
  canEdit,
  showRevenue,
  rollup = false,
  year = new Date().getFullYear(),
}: {
  entityType: FinEntity;
  entityId: string;
  canEdit: boolean;
  showRevenue: boolean;
  /** Modo vertical: mostra a SOMA dos projetos da área (read-only). O head edita
   * nos produtos; a vertical reflete. Só faz sentido com entityType="area". */
  rollup?: boolean;
  year?: number;
}) {
  // No roll-up ninguém edita aqui — a edição vive nos produtos.
  const editable = canEdit && !rollup;
  const lines = showRevenue ? [...REVENUE_LINES, ...EXPENSE_LINES] : EXPENSE_LINES;
  const [data, setData] = useState<Record<FinLine, number[]>>(() => Object.fromEntries(lines.map((l) => [l, zeros()])) as Record<FinLine, number[]>);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingLine, setSavingLine] = useState<FinLine | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    setLoading(true);
    const load = rollup ? getAreaRollupLines(entityId, year) : getFinancialLines(entityType, entityId, year);
    load.then((d) => { if (active) { setData(d); setLoading(false); } }).catch(() => setLoading(false));
    return () => { active = false; };
  }, [entityType, entityId, year, rollup]);

  function setCell(line: FinLine, i: number, v: string) {
    setData((d) => ({ ...d, [line]: d[line].map((x, j) => (j === i ? Number(v) || 0 : x)) }));
  }
  function saveLine(line: FinLine) {
    setMsg(null);
    setSavingLine(line);
    startTransition(async () => {
      try { const r = await saveFinancialLine({ entityType, entityId, year, line, months: data[line], note: note || undefined }); setMsg(`${LINE_LABEL[line]} salvo (${r.changed} alteração(ões)).`); setNote(""); }
      catch { setMsg("Erro ao salvar (só head/admin editam)."); }
      finally { setSavingLine(null); }
    });
  }
  function saveAll() {
    setMsg(null);
    setSavingAll(true);
    startTransition(async () => {
      try {
        const results = await Promise.all(
          lines.map((line) => saveFinancialLine({ entityType, entityId, year, line, months: data[line], note: note || undefined }))
        );
        const changed = results.reduce((s, r) => s + r.changed, 0);
        setMsg(`Tudo salvo — ${changed} alteração(ões) em ${lines.length} linhas.`);
        setNote("");
      } catch { setMsg("Erro ao salvar tudo (só head/admin editam)."); }
      finally { setSavingAll(false); }
    });
  }

  const cashFinal = (data.cash_actual ?? zeros()).map((v, i) => v - (data.despesa_actual?.[i] ?? 0));

  if (loading) return <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-sm text-gray-400"><Loader2 className="animate-spin inline mr-2" size={16} />carregando…</div>;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 overflow-x-auto">
      {rollup && (
        <p className="text-[11px] text-cyan font-semibold mb-3 flex items-center gap-1">
          <Lock size={11} />Soma dos produtos da vertical — edite os números dentro de cada projeto.
        </p>
      )}
      {showRevenue && <Block title="Receita" lines={REVENUE_LINES} data={data} setCell={setCell} canEdit={editable} savingLine={savingLine} saveLine={saveLine} />}
      {showRevenue && <LiveRow line="receita_live" vals={data.receita_live ?? zeros()} />}
      <Block title="Despesa" lines={EXPENSE_LINES} data={data} setCell={setCell} canEdit={editable} savingLine={savingLine} saveLine={saveLine} />
      <LiveRow line="despesa_live" vals={data.despesa_live ?? zeros()} />

      {showRevenue && (
        <div className="min-w-[860px] mt-2 pt-2 border-t-2 border-gray-100">
          <div className="grid grid-cols-[140px_repeat(12,1fr)_90px] gap-1 items-center">
            <span className="text-xs font-extrabold text-navy flex items-center gap-1"><Lock size={11} />Cash Final</span>
            {cashFinal.map((v, i) => (
              <span key={i} className={`text-[11px] text-center font-bold tabular-nums ${v < 0 ? "text-red-600" : "text-green-700"}`}>{Math.round(v).toLocaleString("pt-BR")}</span>
            ))}
            <span className={`text-xs text-right font-extrabold tabular-nums ${sum(cashFinal) < 0 ? "text-red-600" : "text-green-700"}`}>{brl(sum(cashFinal))}</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">Cash Final = Cash Actual − Despesa Actual (calculado).</p>
        </div>
      )}

      {editable && (
        <div className="mt-3 flex items-center gap-2">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota da alteração (opcional, vai pro log)" className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs" />
          <button
            onClick={saveAll}
            disabled={savingAll || savingLine !== null}
            className="shrink-0 inline-flex items-center gap-2 px-5 py-2 rounded-lg gradient-main text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {savingAll ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Salvar tudo
          </button>
        </div>
      )}
      {msg && <p className={`text-xs mt-2 ${msg.includes("Erro") ? "text-red-500" : "text-green-600"}`}>{msg}</p>}
      {!editable && !rollup && <p className="text-[11px] text-gray-400 mt-2">Somente leitura — apenas o head da área (ou admin) edita.</p>}
    </div>
  );
}

/** Linha LIVE (read-only) — preenchida pela API diária (Vindi/OMIE). */
function LiveRow({ line, vals }: { line: FinLine; vals: number[] }) {
  return (
    <div className="min-w-[860px] grid grid-cols-[140px_repeat(12,1fr)_90px] gap-1 items-center mb-3 -mt-2">
      <span className="text-xs font-bold text-gray-500 flex items-center gap-1" title="Preenchido automaticamente pela API (diário)">
        <RefreshCw size={11} className="text-cyan" />{LINE_LABEL[line]}
      </span>
      {vals.map((v, i) => <span key={i} className="text-[11px] text-center text-gray-500 tabular-nums">{v ? Math.round(v).toLocaleString("pt-BR") : "—"}</span>)}
      <span className="text-xs text-right font-bold text-gray-500 tabular-nums">{brl(sum(vals))}</span>
    </div>
  );
}

function Block({ title, lines, data, setCell, canEdit, savingLine, saveLine }: {
  title: string; lines: FinLine[]; data: Record<FinLine, number[]>;
  setCell: (l: FinLine, i: number, v: string) => void; canEdit: boolean;
  savingLine: FinLine | null; saveLine: (l: FinLine) => void;
}) {
  return (
    <div className="min-w-[860px] mb-3">
      <div className="grid grid-cols-[140px_repeat(12,1fr)_90px] gap-1 mb-1">
        <span className="text-[10px] font-bold text-gray-400 uppercase">{title}</span>
        {MONTHS.map((m) => <span key={m} className="text-[10px] text-gray-400 text-center">{m}</span>)}
        <span className="text-[10px] text-gray-400 text-right">Total</span>
      </div>
      {lines.map((line) => {
        const vals = data[line] ?? zeros();
        return (
          <div key={line} className="grid grid-cols-[140px_repeat(12,1fr)_90px] gap-1 items-center mb-0.5">
            <span className={`text-xs font-bold ${TONE[line]} flex items-center gap-1`}>
              {LINE_LABEL[line]}
              {canEdit && (
                <button onClick={() => saveLine(line)} disabled={savingLine === line} className="text-gray-300 hover:text-navy" title="Salvar linha">
                  {savingLine === line ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                </button>
              )}
            </span>
            {vals.map((v, i) =>
              canEdit ? (
                <input key={i} type="number" value={v || ""} onChange={(e) => setCell(line, i, e.target.value)} placeholder="0" className="w-full px-1 py-1 rounded border border-gray-200 text-[11px] text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-cyan/40" />
              ) : (
                <span key={i} className="text-[11px] text-center text-navy tabular-nums">{v ? Math.round(v).toLocaleString("pt-BR") : "—"}</span>
              )
            )}
            <span className="text-xs text-right font-bold text-navy tabular-nums">{brl(sum(vals))}</span>
          </div>
        );
      })}
    </div>
  );
}
