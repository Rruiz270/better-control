"use client";

import { useState, useTransition } from "react";
import { Save, Loader2, Check } from "lucide-react";
import { setCollaboratorCost } from "@/lib/actions/rateio";

type Row = { id: string; name: string; areaName: string | null; role: string; status: string; monthlyCost: number; note: string };

export default function ManualCostGrid({ rows, year, month }: { rows: Row[]; year: number; month: number }) {
  const [data, setData] = useState<Record<string, { cost: string; note: string }>>(
    () => Object.fromEntries(rows.map((r) => [r.id, { cost: r.monthlyCost ? String(r.monthlyCost) : "", note: r.note }]))
  );
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();
  const set = (id: string, k: "cost" | "note", v: string) => setData((d) => ({ ...d, [id]: { ...d[id], [k]: v } }));

  function save(id: string) {
    const row = data[id];
    const cost = Number(row.cost) || 0;
    if (cost > 0 && !row.note.trim()) { setErr((e) => ({ ...e, [id]: "Nota obrigatória" })); return; }
    setErr((e) => ({ ...e, [id]: "" }));
    setBusy(id);
    start(async () => {
      try {
        await setCollaboratorCost({ userId: id, year, month, monthlyCost: cost, note: row.note });
        setSaved((s) => ({ ...s, [id]: true }));
        setTimeout(() => setSaved((s) => ({ ...s, [id]: false })), 2000);
      } catch { setErr((e) => ({ ...e, [id]: "Erro ao salvar" })); }
      finally { setBusy(null); }
    });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase">
        <span className="col-span-3">Colaborador</span>
        <span className="col-span-2">Área</span>
        <span className="col-span-2 text-right">Custo manual (mês)</span>
        <span className="col-span-4">Nota explicativa (obrigatória)</span>
        <span className="col-span-1"></span>
      </div>
      {rows.map((r) => (
        <div key={r.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 px-4 py-2 border-b border-gray-50 items-center">
          <span className="col-span-3 text-sm text-navy">{r.name} {r.status === "roster" && <span className="text-[10px] text-gray-400">(professor)</span>}</span>
          <span className="col-span-2 text-xs text-gray-500">{r.areaName ?? "—"}</span>
          <input type="number" value={data[r.id]?.cost ?? ""} onChange={(e) => set(r.id, "cost", e.target.value)} placeholder="0" className="col-span-2 px-2 py-1.5 rounded-lg border border-gray-200 text-sm text-right tabular-nums" />
          <input value={data[r.id]?.note ?? ""} onChange={(e) => set(r.id, "note", e.target.value)} placeholder="Motivo do valor…" className={`col-span-4 px-2 py-1.5 rounded-lg border text-sm ${err[r.id] ? "border-red-300" : "border-gray-200"}`} />
          <button onClick={() => save(r.id)} disabled={busy === r.id} className="col-span-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-gray-100 text-navy text-xs font-bold hover:bg-gray-200">
            {busy === r.id ? <Loader2 size={12} className="animate-spin" /> : saved[r.id] ? <Check size={12} className="text-green-600" /> : <Save size={12} />}
          </button>
          {err[r.id] && <span className="col-span-12 text-[11px] text-red-500 md:col-start-9">{err[r.id]}</span>}
        </div>
      ))}
    </div>
  );
}
