"use client";

import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search } from "lucide-react";
import {
  PROJECT_STATUS_LABELS,
  TASK_STATUS_LABELS,
} from "@/lib/constants";

type Entry = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  details: unknown;
  createdAt: Date;
  userId: string;
  userName: string;
};

const ACTION_LABEL: Record<string, string> = {
  created: "criou",
  updated: "atualizou",
  deleted: "excluiu",
  status_changed: "mudou status",
  completed: "concluiu",
  triggered: "disparou",
  sent: "enviou",
  queued: "enfileirou",
};

const ENTITY_LABEL: Record<string, string> = {
  task: "tarefa",
  project: "projeto",
  automation: "automação",
  notification: "notificação",
  whatsapp: "whatsapp",
};

function statusLabel(entityType: string, v?: string) {
  if (!v) return v ?? "";
  const map = entityType === "project" ? PROJECT_STATUS_LABELS : TASK_STATUS_LABELS;
  return map[v] || v;
}

function describe(e: Entry): string {
  const d = (e.details ?? {}) as Record<string, unknown>;
  const name = (d.name || d.title) as string | undefined;
  if (e.action === "status_changed") {
    const from = statusLabel(e.entityType, d.oldStatus as string);
    const to = statusLabel(e.entityType, d.newStatus as string);
    return `${name ? `"${name}" — ` : ""}${from || "?"} → ${to || "?"}`;
  }
  return name ? `"${name}"` : "";
}

export default function AuditLog({ entries }: { entries: Entry[] }) {
  const [user, setUser] = useState("");
  const [action, setAction] = useState("");
  const [q, setQ] = useState("");

  const users = useMemo(
    () => [...new Set(entries.map((e) => e.userName))].sort(),
    [entries]
  );
  const actions = useMemo(
    () => [...new Set(entries.map((e) => e.action))].sort(),
    [entries]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return entries.filter(
      (e) =>
        (!user || e.userName === user) &&
        (!action || e.action === action) &&
        (!needle ||
          e.userName.toLowerCase().includes(needle) ||
          describe(e).toLowerCase().includes(needle) ||
          e.entityType.includes(needle))
    );
  }, [entries, user, action, q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan/40"
          />
        </div>
        <select
          value={user}
          onChange={(e) => setUser(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
        >
          <option value="">Todos os usuários</option>
          {users.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
        >
          <option value="">Todas as ações</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {ACTION_LABEL[a] || a}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
              <th className="px-4 py-2 font-medium">Quando</th>
              <th className="px-4 py-2 font-medium">Quem</th>
              <th className="px-4 py-2 font-medium">Ação</th>
              <th className="px-4 py-2 font-medium">Item</th>
              <th className="px-4 py-2 font-medium">Detalhe</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-2 text-xs text-gray-400 whitespace-nowrap">
                  {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true, locale: ptBR })}
                </td>
                <td className="px-4 py-2 font-medium text-navy whitespace-nowrap">{e.userName}</td>
                <td className="px-4 py-2 text-gray-600 whitespace-nowrap">
                  {ACTION_LABEL[e.action] || e.action}
                </td>
                <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                  {ENTITY_LABEL[e.entityType] || e.entityType}
                </td>
                <td className="px-4 py-2 text-gray-700">{describe(e)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                  Nenhum registro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">{filtered.length} registros</p>
    </div>
  );
}
