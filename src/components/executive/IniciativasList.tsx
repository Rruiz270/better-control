"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { createInitiative, updateInitiativeStatus } from "@/lib/actions/executive";

type Status = "ideacao" | "em_andamento" | "em_risco" | "concluida" | "pausada";
const LABEL: Record<Status, string> = { ideacao: "Ideação", em_andamento: "Em andamento", em_risco: "Em risco", concluida: "Concluída", pausada: "Pausada" };
const COLOR: Record<Status, string> = { ideacao: "bg-gray-100 text-gray-600", em_andamento: "bg-blue-100 text-blue-700", em_risco: "bg-red-100 text-red-700", concluida: "bg-green-100 text-green-700", pausada: "bg-amber-100 text-amber-700" };

type Row = { i: { id: string; name: string; status: Status; nextMilestone: string | null; impact: string | null }; areaName: string | null; owner: string | null };
type Area = { id: string; name: string };
type User = { id: string; name: string };

export default function IniciativasList({ rows, areas, users, canEdit }: { rows: Row[]; areas: Area[]; users: User[]; canEdit: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", areaId: "", ownerId: "", nextMilestone: "", impact: "" });
  const [pending, startTransition] = useTransition();

  function create() {
    if (!form.name.trim()) return;
    startTransition(async () => {
      try {
        await createInitiative({ name: form.name, areaId: form.areaId || undefined, ownerId: form.ownerId || undefined, nextMilestone: form.nextMilestone || undefined, impact: form.impact || undefined });
        setForm({ name: "", areaId: "", ownerId: "", nextMilestone: "", impact: "" }); setOpen(false); router.refresh();
      } catch { /* ignore */ }
    });
  }
  function setStatus(id: string, status: Status) {
    startTransition(async () => { try { await updateInitiativeStatus(id, status); router.refresh(); } catch {} });
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="bg-white rounded-xl border border-gray-100">
          <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-4 py-3 text-sm font-bold text-navy"><Plus size={16} className="text-cyan" />Nova iniciativa</button>
          {open && (
            <div className="px-4 pb-4 space-y-2 border-t border-gray-50 pt-3">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome da iniciativa" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select value={form.areaId} onChange={(e) => setForm({ ...form, areaId: e.target.value })} className="px-3 py-2 rounded-lg border border-gray-200 text-sm"><option value="">Vertical (opcional)</option>{areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
                <select value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })} className="px-3 py-2 rounded-lg border border-gray-200 text-sm"><option value="">Dono (opcional)</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
              </div>
              <input value={form.nextMilestone} onChange={(e) => setForm({ ...form, nextMilestone: e.target.value })} placeholder="Próximo marco" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
              <input value={form.impact} onChange={(e) => setForm({ ...form, impact: e.target.value })} placeholder="Impacto esperado" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
              <button onClick={create} disabled={pending} className="py-2 px-4 rounded-lg gradient-accent text-navy-dark text-sm font-bold flex items-center gap-2 disabled:opacity-60">{pending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}Criar</button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Nenhuma iniciativa ainda.</p>}
        {rows.map(({ i, areaName, owner }) => (
          <div key={i.id} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-navy">{i.name}</h3>
              {canEdit ? (
                <select value={i.status} onChange={(e) => setStatus(i.id, e.target.value as Status)} className={`text-[10px] font-bold rounded px-2 py-1 border-0 ${COLOR[i.status]}`}>
                  {(Object.keys(LABEL) as Status[]).map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
                </select>
              ) : <span className={`text-[10px] font-bold px-2 py-1 rounded ${COLOR[i.status]}`}>{LABEL[i.status]}</span>}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
              {areaName && <span>📁 {areaName}</span>}
              {owner && <span>👤 {owner}</span>}
              {i.nextMilestone && <span>🎯 {i.nextMilestone}</span>}
              {i.impact && <span>📈 {i.impact}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
