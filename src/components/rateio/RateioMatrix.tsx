"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Grid3x3, Save, Check } from "lucide-react";
import { getRateioMatrix, setAllocation } from "@/lib/actions/rateio";

type U = { id: string; name: string };
type P = { id: string; name: string };

export default function RateioMatrix({ year = new Date().getFullYear(), month = new Date().getMonth() + 1 }: { year?: number; month?: number }) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<U[]>([]);
  const [projects, setProjects] = useState<P[]>([]);
  const [cells, setCells] = useState<Record<string, number>>({}); // `${userId}:${projectId}` -> %
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savingRow, setSavingRow] = useState<string | null>(null);
  const [savedRow, setSavedRow] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [, start] = useTransition();

  useEffect(() => {
    if (!open || users.length) return;
    setLoading(true);
    getRateioMatrix(year, month)
      .then((d) => {
        setUsers(d.users.map((u) => ({ id: u.id, name: u.name })));
        setProjects(d.projects.map((p) => ({ id: p.id, name: p.name })));
        setCells(Object.fromEntries(d.allocations.map((a) => [`${a.userId}:${a.projectId}`, a.percent])));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, year, month, users.length]);

  const colTotal = (uid: string) => projects.reduce((s, p) => s + (cells[`${uid}:${p.id}`] ?? 0), 0);

  function saveCell(userId: string, projectId: string, value: number) {
    const key = `${userId}:${projectId}`;
    setSavingKey(key);
    start(async () => {
      try { await setAllocation({ userId, projectId, year, month, percent: value }); } catch {}
      finally { setSavingKey(null); }
    });
  }

  /** Salva TODAS as alocações de uma pessoa de uma vez. */
  function saveRow(userId: string) {
    setSavingRow(userId);
    setSavedRow(null);
    start(async () => {
      try {
        await Promise.all(projects.map((p) =>
          setAllocation({ userId, projectId: p.id, year, month, percent: cells[`${userId}:${p.id}`] ?? 0 })
        ));
        setSavedRow(userId);
      } catch {}
      finally { setSavingRow(null); }
    });
  }

  /** Salva a matriz inteira (todas as pessoas). */
  function saveAll() {
    setSavingAll(true);
    start(async () => {
      try {
        await Promise.all(users.flatMap((u) => projects.map((p) =>
          setAllocation({ userId: u.id, projectId: p.id, year, month, percent: cells[`${u.id}:${p.id}`] ?? 0 })
        )));
        setSavedRow("ALL");
      } catch {}
      finally { setSavingAll(false); }
    });
  }

  return (
    <div className="mt-4">
      <button onClick={() => setOpen((o) => !o)} className="text-sm font-bold text-navy flex items-center gap-1.5">
        <Grid3x3 size={15} className="text-cyan" /> Matriz pessoas × projetos {open ? "▾" : "▸"}
      </button>
      {open && (
        <div className="mt-2 bg-white rounded-xl border border-gray-100 p-3 overflow-x-auto">
          {loading ? (
            <p className="text-sm text-gray-400"><Loader2 size={14} className="animate-spin inline mr-1" />carregando…</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma pessoa no seu escopo.</p>
          ) : (
            <table className="text-xs border-collapse" style={{ minWidth: 600 }}>
              <thead>
                <tr>
                  <th className="sticky left-0 bg-white text-left px-2 py-1.5 font-bold text-gray-400 min-w-[150px]">Pessoa \ Projeto</th>
                  {projects.map((p) => <th key={p.id} className="px-1.5 py-1.5 font-medium text-navy text-center min-w-[70px]">{p.name}</th>)}
                  <th className="px-2 py-1.5 text-gray-400">Σ</th>
                  <th className="px-2 py-1.5 text-gray-400 text-center">Salvar</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const tot = colTotal(u.id);
                  return (
                    <tr key={u.id} className="border-t border-gray-50">
                      <td className="sticky left-0 bg-white px-2 py-1 text-navy font-medium">{u.name}</td>
                      {projects.map((p) => {
                        const key = `${u.id}:${p.id}`;
                        return (
                          <td key={p.id} className="px-1 py-0.5 text-center">
                            <input
                              type="number" value={cells[key] ?? ""} placeholder="0"
                              onChange={(e) => setCells((c) => ({ ...c, [key]: Number(e.target.value) || 0 }))}
                              onBlur={(e) => saveCell(u.id, p.id, Number(e.target.value) || 0)}
                              className={`w-12 px-1 py-1 rounded border text-center tabular-nums ${savingKey === key ? "border-cyan" : "border-gray-200"}`}
                            />
                          </td>
                        );
                      })}
                      <td className={`px-2 py-1 text-center font-bold tabular-nums ${tot === 100 ? "text-green-600" : "text-amber-600"}`}>{tot}%</td>
                      <td className="px-2 py-1 text-center">
                        <button
                          onClick={() => saveRow(u.id)}
                          disabled={savingRow === u.id || savingAll}
                          title={`Salvar tudo de ${u.name}`}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-cyan/10 text-cyan hover:bg-cyan/20 disabled:opacity-40"
                        >
                          {savingRow === u.id ? <Loader2 size={13} className="animate-spin" /> : savedRow === u.id ? <Check size={13} className="text-green-600" /> : <Save size={13} />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {users.length > 0 && (
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={saveAll}
                disabled={savingAll || savingRow !== null}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg gradient-main text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {savingAll ? <Loader2 size={15} className="animate-spin" /> : savedRow === "ALL" ? <Check size={15} /> : <Save size={15} />}
                Salvar matriz inteira
              </button>
              {savedRow === "ALL" && <span className="text-xs text-green-600 font-medium">Matriz salva.</span>}
            </div>
          )}
          <p className="text-[11px] text-gray-400 mt-2">Cada célula = % do tempo da pessoa naquele projeto. Salva ao sair da célula, ou use o botão de cada pessoa / “Salvar matriz inteira”. Σ deve fechar 100%.</p>
        </div>
      )}
    </div>
  );
}
