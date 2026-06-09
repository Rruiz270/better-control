"use client";

import { useMemo, useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, DollarSign, FolderKanban, CheckSquare, Zap, Activity, ArrowRight, LogIn } from "lucide-react";
import type { AuditFeedEntry, AuditKind } from "@/lib/actions/activity";

const KIND_META: Record<AuditKind, { label: string; icon: typeof DollarSign; dot: string; chip: string }> = {
  financeiro: { label: "Financeiro", icon: DollarSign, dot: "bg-cyan", chip: "bg-cyan/10 text-cyan" },
  projeto:    { label: "Projeto",    icon: FolderKanban, dot: "bg-blue-500", chip: "bg-blue-50 text-blue-600" },
  tarefa:     { label: "Tarefa",     icon: CheckSquare, dot: "bg-indigo-500", chip: "bg-indigo-50 text-indigo-600" },
  automacao:  { label: "Automação",  icon: Zap, dot: "bg-amber-500", chip: "bg-amber-50 text-amber-600" },
  login:      { label: "Login",      icon: LogIn, dot: "bg-violet-500", chip: "bg-violet-50 text-violet-600" },
  outro:      { label: "Outro",      icon: Activity, dot: "bg-gray-400", chip: "bg-gray-100 text-gray-500" },
};

const KINDS: AuditKind[] = ["financeiro", "projeto", "tarefa", "automacao", "login"];

export default function AuditLog({ entries }: { entries: AuditFeedEntry[] }) {
  const [who, setWho] = useState("");
  const [kind, setKind] = useState<AuditKind | "">("");
  const [q, setQ] = useState("");

  const people = useMemo(() => [...new Set(entries.map((e) => e.who))].sort(), [entries]);
  const counts = useMemo(() => {
    const c = { financeiro: 0, projeto: 0, tarefa: 0, automacao: 0, login: 0, outro: 0 } as Record<AuditKind, number>;
    for (const e of entries) c[e.kind]++;
    return c;
  }, [entries]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return entries.filter(
      (e) =>
        (!who || e.who === who) &&
        (!kind || e.kind === kind) &&
        (!needle ||
          e.who.toLowerCase().includes(needle) ||
          e.action.toLowerCase().includes(needle) ||
          e.item.toLowerCase().includes(needle))
    );
  }, [entries, who, kind, q]);

  return (
    <div className="space-y-4">
      {/* resumo por categoria — também filtra ao clicar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {KINDS.map((k) => {
          const m = KIND_META[k];
          const Icon = m.icon;
          const active = kind === k;
          return (
            <button
              key={k}
              onClick={() => setKind(active ? "" : k)}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${active ? "border-cyan ring-2 ring-cyan/30" : "border-gray-100 hover:border-gray-200"}`}
            >
              <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${m.chip}`}><Icon size={17} /></span>
              <span>
                <span className="block text-lg font-extrabold text-navy leading-none tabular-nums">{counts[k]}</span>
                <span className="block text-[11px] text-gray-400">{m.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar pessoa, item, campo…" className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan/40" />
        </div>
        <select value={who} onChange={(e) => setWho(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm">
          <option value="">Todos</option>
          {people.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {kind && (
          <button onClick={() => setKind("")} className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
            limpar “{KIND_META[kind].label}”
          </button>
        )}
      </div>

      {/* timeline */}
      <div className="relative">
        <div className="absolute left-[15px] top-1 bottom-1 w-px bg-gray-100" />
        <ul className="space-y-1.5">
          {filtered.map((e) => {
            const m = KIND_META[e.kind];
            const Icon = m.icon;
            return (
              <li key={e.id} className="relative pl-10">
                <span className={`absolute left-2 top-3 w-3 h-3 rounded-full ring-4 ring-white ${m.dot}`} />
                <div className="bg-white rounded-xl border border-gray-100 p-3 flex items-start gap-3 hover:border-gray-200 transition-colors">
                  <span className={`shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg ${m.chip}`}><Icon size={15} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-tight">
                      <span className="font-bold text-navy">{e.who}</span>{" "}
                      <span className="text-gray-500">{e.action}</span>
                      {e.item && e.item !== "—" && <span className="text-gray-700"> · {e.item}</span>}
                    </p>
                    {(e.from || e.to) && (
                      <div className="flex items-center gap-1.5 mt-1 text-[11px]">
                        <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 line-through tabular-nums">{e.from ?? "—"}</span>
                        <ArrowRight size={11} className="text-gray-300" />
                        <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-700 font-semibold tabular-nums">{e.to ?? "—"}</span>
                      </div>
                    )}
                    {e.note && <p className="text-[11px] text-gray-400 mt-1 italic">“{e.note}”</p>}
                  </div>
                  <time
                    className="shrink-0 text-[11px] text-gray-400 whitespace-nowrap"
                    title={format(new Date(e.when), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  >
                    {formatDistanceToNow(new Date(e.when), { addSuffix: true, locale: ptBR })}
                  </time>
                </div>
              </li>
            );
          })}
        </ul>
        {filtered.length === 0 && (
          <p className="pl-10 py-10 text-center text-sm text-gray-400">Nenhum registro.</p>
        )}
      </div>

      <p className="text-xs text-gray-400">{filtered.length} de {entries.length} registros</p>
    </div>
  );
}
