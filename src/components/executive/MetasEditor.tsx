"use client";

import { useState, useTransition } from "react";
import { Save, Loader2 } from "lucide-react";
import { setAreaTarget, setCash } from "@/lib/actions/executive";

type Area = { id: string; name: string; color: string };
type Target = { areaId: string; revenueTarget: string; multiplierTarget: string };

export default function MetasEditor({ areas, targets, cash, cashDate, year }: {
  areas: Area[]; targets: Target[]; cash: number; cashDate: string | null; year: number;
}) {
  const tMap = new Map(targets.map((t) => [t.areaId, t]));
  const [rev, setRev] = useState<Record<string, string>>(Object.fromEntries(areas.map((a) => [a.id, tMap.get(a.id)?.revenueTarget ?? ""])));
  const [mul, setMul] = useState<Record<string, string>>(Object.fromEntries(areas.map((a) => [a.id, tMap.get(a.id)?.multiplierTarget ?? "30"])));
  const [cashV, setCashV] = useState(cash ? String(cash) : "");
  const [dateV, setDateV] = useState(cashDate ?? new Date().toISOString().slice(0, 10));
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function saveArea(areaId: string) {
    setMsg(null);
    startTransition(async () => {
      try { await setAreaTarget(areaId, year, Number(rev[areaId] || 0), Number(mul[areaId] || 30)); setMsg("Meta salva."); }
      catch { setMsg("Erro ao salvar meta."); }
    });
  }
  function saveCash() {
    setMsg(null);
    startTransition(async () => {
      try { await setCash(Number(cashV || 0), dateV); setMsg("Caixa salvo."); }
      catch { setMsg("Erro ao salvar caixa."); }
    });
  }

  return (
    <div className="space-y-5">
      <section>
        <h2 className="text-sm font-bold text-gray-400 uppercase mb-2">Caixa do grupo (p/ runway)</h2>
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap items-end gap-3">
          <div><label className="text-[10px] font-bold text-gray-400 uppercase">Caixa (R$)</label><input type="number" value={cashV} onChange={(e) => setCashV(e.target.value)} placeholder="ex: 410000" className="block w-40 px-3 py-2 rounded-lg border border-gray-200 text-sm mt-1" /></div>
          <div><label className="text-[10px] font-bold text-gray-400 uppercase">Data</label><input type="date" value={dateV} onChange={(e) => setDateV(e.target.value)} className="block px-3 py-2 rounded-lg border border-gray-200 text-sm mt-1" /></div>
          <button onClick={saveCash} disabled={pending} className="py-2 px-4 rounded-lg bg-navy text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">{pending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}Salvar caixa</button>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold text-gray-400 uppercase mb-2">Metas por vertical ({year})</h2>
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
          {areas.map((a) => (
            <div key={a.id} className="flex flex-wrap items-end gap-3 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-medium text-navy w-40"><span className="w-2.5 h-2.5 rounded-full" style={{ background: a.color }} />{a.name}</span>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase">Meta receita/ano</label><input type="number" value={rev[a.id]} onChange={(e) => setRev({ ...rev, [a.id]: e.target.value })} placeholder="0" className="block w-40 px-3 py-1.5 rounded-lg border border-gray-200 text-sm mt-1" /></div>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase">Múltiplo (30x)</label><input type="number" value={mul[a.id]} onChange={(e) => setMul({ ...mul, [a.id]: e.target.value })} className="block w-24 px-3 py-1.5 rounded-lg border border-gray-200 text-sm mt-1" /></div>
              <button onClick={() => saveArea(a.id)} disabled={pending} className="py-1.5 px-3 rounded-lg bg-gray-100 text-navy text-sm font-bold disabled:opacity-60">Salvar</button>
            </div>
          ))}
        </div>
      </section>
      {msg && <p className={`text-xs ${msg.includes("Erro") ? "text-red-500" : "text-green-600"}`}>{msg}</p>}
    </div>
  );
}
