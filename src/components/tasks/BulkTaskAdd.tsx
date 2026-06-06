"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ListPlus, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { createTasksBulk } from "@/lib/actions/tasks";

type Target = { id: string; name: string; areaId: string | null };

export default function BulkTaskAdd({
  projects,
  users,
}: {
  projects: (Target & { areaName: string | null })[];
  users: Target[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [assigneeId, setAssigneeId] = useState("");
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Escopo por área: ao escolher o projeto, só oferece responsáveis da área dele.
  const project = projects.find((p) => p.id === projectId);
  const areaUsers = users.filter((u) => !project?.areaId || u.areaId === project.areaId);

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  function submit() {
    if (!projectId || lines.length === 0) return;
    setMsg(null);
    startTransition(async () => {
      try {
        const { created } = await createTasksBulk({
          projectId,
          lines,
          assigneeId: assigneeId || undefined,
        });
        setMsg(`${created} tarefa(s) criada(s).`);
        setText("");
        router.refresh();
      } catch {
        setMsg("Erro ao criar tarefas (sem permissão nesse projeto?).");
      }
    });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 mb-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-bold text-navy"
      >
        <ListPlus size={18} className="text-cyan" />
        Criar tarefas em massa
        {open ? <ChevronUp size={16} className="ml-auto text-gray-400" /> : <ChevronDown size={16} className="ml-auto text-gray-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              value={projectId}
              onChange={(e) => { setProjectId(e.target.value); setAssigneeId(""); }}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-cyan/40"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}{p.areaName ? ` · ${p.areaName}` : ""}</option>
              ))}
            </select>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-cyan/40"
            >
              <option value="">Sem responsável</option>
              {areaUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder={"Uma tarefa por linha. Dica:\n!! = crítica   ! = alta\n\nRevisar contrato\n! Ligar para a prefeitura\n!! Corrigir bug de login"}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-navy font-mono focus:outline-none focus:ring-2 focus:ring-cyan/40"
          />

          <div className="flex items-center gap-3">
            <button
              onClick={submit}
              disabled={pending || lines.length === 0}
              className="py-2.5 px-5 rounded-lg gradient-accent text-navy-dark text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {pending ? <Loader2 size={16} className="animate-spin" /> : <ListPlus size={16} />}
              Criar {lines.length > 0 ? `${lines.length} tarefa(s)` : ""}
            </button>
            {msg && (
              <span className={`text-xs ${msg.includes("Erro") ? "text-red-500" : "text-green-600"}`}>{msg}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
