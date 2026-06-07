"use client";

import { useEffect, useState, useTransition } from "react";
import { Save, Loader2, AlertTriangle, CheckCircle2, Copy } from "lucide-react";
import {
  setAllocation,
  setCollaboratorCost,
  getAllocationsForUser,
  getCollaboratorCost,
  copyAllocationsFromPreviousMonth,
  type RateioContext,
} from "@/lib/actions/rateio";

export default function AllocationEditor({
  ctx,
  year,
  month,
}: {
  ctx: RateioContext;
  year: number;
  month: number;
}) {
  const [userId, setUserId] = useState(ctx.users[0]?.id ?? "");
  const [percents, setPercents] = useState<Record<string, number>>({});
  const [cost, setCost] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoading(true);
    (async () => {
      const [alloc, c] = await Promise.all([
        getAllocationsForUser(userId, year, month),
        ctx.canManageCost
          ? getCollaboratorCost(userId, year, month)
          : Promise.resolve(null),
      ]);
      if (!active) return;
      const map: Record<string, number> = {};
      alloc.rows.forEach((r) => (map[r.projectId] = Number(r.percent)));
      setPercents(map);
      setCost(c != null ? String(c) : "");
      setLoading(false);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, tick]);

  function copyPrev() {
    setMsg(null);
    startTransition(async () => {
      try { const { copied } = await copyAllocationsFromPreviousMonth(userId, year, month); setMsg(`Copiado do mês anterior (${copied}).`); setTick((t) => t + 1); }
      catch { setMsg("Erro ao copiar."); }
    });
  }

  // Escopo por área: a pessoa só aloca em projetos da PRÓPRIA área. Pessoa sem
  // área (ex.: admin) enxerga tudo.
  const selectedUser = ctx.users.find((u) => u.id === userId);
  const visibleProjects = ctx.projects.filter(
    (p) => !selectedUser?.areaId || p.areaId === selectedUser.areaId
  );

  const total = visibleProjects.reduce((a, p) => a + (percents[p.id] || 0), 0);
  const balanced = Math.abs(total - 100) < 0.01;

  function save() {
    setMsg(null);
    startTransition(async () => {
      try {
        // Salva só projetos visíveis com % > 0 (evita poluir com linhas zeradas).
        for (const p of visibleProjects) {
          const v = percents[p.id] ?? 0;
          if (v > 0) await setAllocation({ userId, projectId: p.id, year, month, percent: v });
        }
        if (ctx.canManageCost && cost !== "") {
          await setCollaboratorCost({ userId, year, month, monthlyCost: Number(cost) });
        }
        setMsg("Salvo!");
      } catch {
        setMsg("Erro ao salvar.");
      }
    });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-navy">Alocação planejada (%)</h3>
        <button onClick={copyPrev} disabled={pending || !userId} className="text-[11px] font-bold text-cyan flex items-center gap-1 disabled:opacity-50"><Copy size={12} />copiar mês anterior</button>
      </div>

      <select
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-navy mb-4 focus:outline-none focus:ring-2 focus:ring-cyan/40"
      >
        {ctx.users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
            {u.areaName ? ` · ${u.areaName}` : ""}
          </option>
        ))}
      </select>

      {ctx.canManageCost && (
        <div className="mb-4">
          <label className="text-[10px] font-bold text-gray-400 uppercase">
            Custo mensal carregado (R$)
          </label>
          <input
            type="number"
            min={0}
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="ex: 12000"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-navy mt-1 focus:outline-none focus:ring-2 focus:ring-cyan/40"
          />
        </div>
      )}

      {loading ? (
        <div className="py-8 flex justify-center">
          <Loader2 size={20} className="animate-spin text-gray-300" />
        </div>
      ) : (
        <>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {visibleProjects.length === 0 && (
              <p className="text-xs text-gray-400 py-2">
                Esta pessoa não tem área definida ou a área não tem projetos.
              </p>
            )}
            {visibleProjects.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <span className="flex-1 text-sm text-navy truncate">{p.name}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={percents[p.id] ?? ""}
                  onChange={(e) =>
                    setPercents((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))
                  }
                  placeholder="0"
                  className="w-16 px-2 py-1.5 rounded-lg border border-gray-200 text-sm text-right text-navy focus:outline-none focus:ring-2 focus:ring-cyan/40"
                />
                <span className="text-xs text-gray-400 w-4">%</span>
              </div>
            ))}
          </div>

          <div
            className={`flex items-center gap-1.5 mt-3 text-xs font-bold ${
              balanced ? "text-green-600" : "text-amber-600"
            }`}
          >
            {balanced ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            Total: {total}% {balanced ? "(fechado)" : "(deveria somar 100%)"}
          </div>
        </>
      )}

      <button
        onClick={save}
        disabled={pending || loading}
        className="w-full mt-4 py-2.5 rounded-lg bg-navy text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        Salvar
      </button>

      {msg && (
        <p
          className={`text-xs text-center mt-2 ${
            msg.includes("Erro") ? "text-red-500" : "text-green-600"
          }`}
        >
          {msg}
        </p>
      )}
    </div>
  );
}
