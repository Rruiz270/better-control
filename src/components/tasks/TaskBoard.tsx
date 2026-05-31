"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Badge from "@/components/shared/Badge";
import {
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
} from "@/lib/constants";
import { Calendar, AlertCircle, Search } from "lucide-react";

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  projectName: string;
  projectSlug: string;
  areaId: string;
  areaName: string;
  areaSlug: string;
  areaColor: string;
};

function isOverdue(t: Task) {
  return (
    !!t.dueDate &&
    new Date(t.dueDate) < new Date() &&
    t.status !== "concluida" &&
    t.status !== "cancelada"
  );
}

export default function TaskBoard({ tasks }: { tasks: Task[] }) {
  const [areaId, setAreaId] = useState("");
  const [productSlug, setProductSlug] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");

  // Áreas e produtos disponíveis no conjunto que o usuário pode ver.
  const areas = useMemo(() => {
    const m = new Map<string, { id: string; name: string; color: string }>();
    tasks.forEach((t) => m.set(t.areaId, { id: t.areaId, name: t.areaName, color: t.areaColor }));
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks]);

  const products = useMemo(() => {
    const m = new Map<string, string>();
    tasks
      .filter((t) => !areaId || t.areaId === areaId)
      .forEach((t) => m.set(t.projectSlug, t.projectName));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [tasks, areaId]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return tasks.filter(
      (t) =>
        (!areaId || t.areaId === areaId) &&
        (!productSlug || t.projectSlug === productSlug) &&
        (!status || t.status === status) &&
        (!needle ||
          t.title.toLowerCase().includes(needle) ||
          t.projectName.toLowerCase().includes(needle))
    );
  }, [tasks, areaId, productSlug, status, q]);

  const stats = {
    total: filtered.length,
    andamento: filtered.filter((t) => t.status === "em_andamento").length,
    concluidas: filtered.filter((t) => t.status === "concluida").length,
    atrasadas: filtered.filter(isOverdue).length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, tone: "text-navy" },
          { label: "Em Andamento", value: stats.andamento, tone: "text-blue-600" },
          { label: "Concluidas", value: stats.concluidas, tone: "text-green" },
          { label: "Atrasadas", value: stats.atrasadas, tone: "text-red-500" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400">{s.label}</p>
            <p className={`text-2xl font-bold ${s.tone}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar tarefa ou produto..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan/40"
          />
        </div>
        {areas.length > 1 && (
          <select
            value={areaId}
            onChange={(e) => {
              setAreaId(e.target.value);
              setProductSlug("");
            }}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
          >
            <option value="">Todas as áreas</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        )}
        <select
          value={productSlug}
          onChange={(e) => setProductSlug(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
        >
          <option value="">Todos os produtos</option>
          {products.map(([slug, name]) => (
            <option key={slug} value={slug}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
        >
          <option value="">Todos os status</option>
          {Object.entries(TASK_STATUS_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {filtered.map((task) => (
          <Link key={task.id} href={`/areas/${task.areaSlug}/projects/${task.projectSlug}`}>
            <div className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors cursor-pointer">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: `${task.areaColor}22`, color: task.areaColor }}
                  >
                    {task.areaName}
                  </span>
                  <span className="text-gray-300 text-xs">›</span>
                  <span className="text-xs font-medium text-gray-500">{task.projectName}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge className={TASK_PRIORITY_COLORS[task.priority]}>
                  {TASK_PRIORITY_LABELS[task.priority]}
                </Badge>
                {task.dueDate && (
                  <span
                    className={`flex items-center gap-1 text-xs ${
                      isOverdue(task) ? "text-red-500 font-medium" : "text-gray-400"
                    }`}
                  >
                    {isOverdue(task) && <AlertCircle size={10} />}
                    <Calendar size={10} />
                    {task.dueDate}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="p-8 text-sm text-gray-400 text-center">Nenhuma tarefa encontrada.</p>
        )}
      </div>
    </div>
  );
}
