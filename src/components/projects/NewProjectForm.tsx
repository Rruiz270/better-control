"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { createProject } from "@/lib/actions/projects";

type Area = { id: string; name: string };

const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function NewProjectForm({ areas, defaultAreaId, isAdmin }: { areas: Area[]; defaultAreaId: string; isAdmin: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", areaId: defaultAreaId, description: "", reason: "", revenue: "", cost: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const margin = (Number(f.revenue) || 0) - (Number(f.cost) || 0);
  const ratio = Number(f.cost) > 0 ? (Number(f.revenue) / Number(f.cost)).toFixed(1) : null;

  function submit() {
    if (!f.name.trim() || !f.reason.trim()) { setMsg("Nome e justificativa de viabilidade são obrigatórios."); return; }
    setMsg(null);
    start(async () => {
      try {
        await createProject({ areaId: f.areaId, name: f.name.trim(), slug: slugify(f.name), description: f.description || undefined, viabilityReason: f.reason, expectedRevenue: f.revenue || undefined, expectedCost: f.cost || undefined });
        setMsg(isAdmin ? "Projeto criado." : "Proposta enviada — aguardando aprovação do board.");
        setF({ name: "", areaId: defaultAreaId, description: "", reason: "", revenue: "", cost: "" });
        router.refresh();
        if (isAdmin) setOpen(false);
      } catch { setMsg("Erro ao enviar (só head/admin)."); }
    });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-2 px-4 py-3 text-sm font-bold text-navy">
        <Plus size={16} className="text-cyan" />{isAdmin ? "Novo projeto" : "Propor projeto"}{open ? " ▾" : " ▸"}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-gray-50 pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Nome do projeto" className="px-3 py-2 rounded-lg border border-gray-200 text-sm" />
            <select value={f.areaId} onChange={(e) => set("areaId", e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm">
              {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <input value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Descrição (opcional)" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <p className="text-[11px] font-bold text-gray-500 uppercase">Viabilidade econômica</p>
            <textarea value={f.reason} onChange={(e) => set("reason", e.target.value)} placeholder="Por que adicionar (ou não) este projeto? *" rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-[10px] text-gray-400 flex items-center gap-1"><TrendingUp size={11} className="text-green-500" />Receita esperada (ano)</label><input type="number" value={f.revenue} onChange={(e) => set("revenue", e.target.value)} placeholder="0" className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-sm mt-0.5" /></div>
              <div><label className="text-[10px] text-gray-400 flex items-center gap-1"><TrendingDown size={11} className="text-red-500" />Custo esperado (ano)</label><input type="number" value={f.cost} onChange={(e) => set("cost", e.target.value)} placeholder="0" className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-sm mt-0.5" /></div>
            </div>
            {(f.revenue || f.cost) && (
              <p className="text-xs text-gray-500">Margem estimada: <b className={margin < 0 ? "text-red-600" : "text-green-700"}>R$ {Math.round(margin).toLocaleString("pt-BR")}</b>{ratio && <> · eficiência <b>{ratio}x</b></>}</p>
            )}
          </div>
          <button onClick={submit} disabled={pending} className="py-2 px-4 rounded-lg gradient-accent text-navy-dark text-sm font-bold flex items-center gap-2 disabled:opacity-60">
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}{isAdmin ? "Criar" : "Enviar p/ aprovação"}
          </button>
          {msg && <p className={`text-xs ${msg.includes("Erro") || msg.includes("obrigat") ? "text-red-500" : "text-green-600"}`}>{msg}</p>}
        </div>
      )}
    </div>
  );
}
