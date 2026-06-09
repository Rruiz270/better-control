"use client";

import { useState, useTransition } from "react";
import { History, Loader2, Snowflake, ArrowRight } from "lucide-react";
import { getFinancialLineLog, getFinancialFreeze } from "@/lib/actions/financialLines";
import { LINE_LABEL, type FinEntity, type FinLine } from "@/lib/financialLines.constants";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const fmt = (n: number | string | null) => Math.round(Number(n ?? 0)).toLocaleString("pt-BR");

type LogRow = { line: FinLine; month: number; oldValue: string | null; newValue: string | null; note: string | null; changedAt: string | Date; by: string | null };
type FreezeRow = { line: FinLine; month: number; original: number; current: number; delta: number };

export default function FinancialHistory({ entityType, entityId, year = new Date().getFullYear() }: { entityType: FinEntity; entityId: string; year?: number }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"freeze" | "log">("freeze");
  const [log, setLog] = useState<LogRow[] | null>(null);
  const [freeze, setFreeze] = useState<FreezeRow[] | null>(null);
  const [, start] = useTransition();
  const [loading, setLoading] = useState(false);

  function load() {
    if (log) return;
    setLoading(true);
    start(async () => {
      try {
        const [l, f] = await Promise.all([getFinancialLineLog(entityType, entityId, year), getFinancialFreeze(entityType, entityId, year)]);
        setLog(l as LogRow[]); setFreeze(f as FreezeRow[]);
      } finally { setLoading(false); }
    });
  }

  return (
    <div className="mt-3">
      <button onClick={() => { setOpen((o) => !o); load(); }} className="text-xs font-bold text-navy flex items-center gap-1.5">
        <History size={13} className="text-cyan" /> Freeze & histórico de alterações {open ? "▾" : "▸"}
      </button>
      {open && (
        <div className="mt-2 bg-white rounded-xl border border-gray-100 p-3">
          <div className="flex gap-1 mb-3 bg-gray-50 rounded-lg p-1 w-fit text-xs font-bold">
            <button onClick={() => setTab("freeze")} className={`px-3 py-1 rounded ${tab === "freeze" ? "bg-white text-navy shadow-sm" : "text-gray-400"}`}><Snowflake size={11} className="inline mr-1" />Freeze</button>
            <button onClick={() => setTab("log")} className={`px-3 py-1 rounded ${tab === "log" ? "bg-white text-navy shadow-sm" : "text-gray-400"}`}>Histórico</button>
          </div>

          {loading && <p className="text-xs text-gray-400"><Loader2 size={12} className="animate-spin inline mr-1" />carregando…</p>}

          {!loading && tab === "freeze" && (
            <div>
              <p className="text-[11px] text-gray-400 mb-2">Projeção original (1º valor salvo) × valor atual — o que mudou desde o início.</p>
              {(!freeze || freeze.length === 0) ? <p className="text-xs text-gray-400">Sem alterações registradas ainda.</p> : (
                <div className="space-y-1">
                  {freeze.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-gray-50">
                      <span className="font-bold text-navy w-28">{LINE_LABEL[f.line]}</span>
                      <span className="text-gray-400 w-8">{MONTHS[f.month - 1]}</span>
                      <span className="text-gray-500 tabular-nums">{fmt(f.original)}</span>
                      <ArrowRight size={11} className="text-gray-300" />
                      <span className="text-navy font-medium tabular-nums">{fmt(f.current)}</span>
                      <span className={`ml-auto font-bold tabular-nums ${f.delta < 0 ? "text-red-500" : "text-green-600"}`}>{f.delta > 0 ? "+" : ""}{fmt(f.delta)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!loading && tab === "log" && (
            (!log || log.length === 0) ? <p className="text-xs text-gray-400">Nenhuma alteração registrada.</p> : (
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {log.map((l, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-gray-50">
                    <span className="font-bold text-navy w-28">{LINE_LABEL[l.line]}</span>
                    <span className="text-gray-400 w-8">{MONTHS[l.month - 1]}</span>
                    <span className="text-gray-400 tabular-nums">{fmt(l.oldValue)}</span>
                    <ArrowRight size={11} className="text-gray-300" />
                    <span className="text-navy tabular-nums">{fmt(l.newValue)}</span>
                    {l.note && <span className="text-gray-400 italic truncate max-w-[160px]">“{l.note}”</span>}
                    <span className="ml-auto text-gray-400">{l.by ?? "—"} · {new Date(l.changedAt).toLocaleDateString("pt-BR")}</span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
