"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Ban,
  Circle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { createTask, updateTaskStatus } from "@/lib/actions/tasks";
import { TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS } from "@/lib/constants";
import Badge from "@/components/shared/Badge";
import TaskEditModal from "./TaskEditModal";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  projectId: string;
  createdAt: Date;
};

const STATUS_CONFIG = [
  { key: "nao_iniciada", label: "Nao Iniciada", icon: Circle, color: "text-gray-400", bg: "bg-gray-50", border: "border-gray-200", dot: "bg-gray-300" },
  { key: "em_andamento", label: "Em Andamento", icon: Clock, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-200", dot: "bg-blue-500" },
  { key: "bloqueada", label: "Bloqueada", icon: Ban, color: "text-red-500", bg: "bg-red-50", border: "border-red-200", dot: "bg-red-500" },
  { key: "concluida", label: "Concluida", icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50", border: "border-green-200", dot: "bg-green-500" },
];

function getDaysInfo(task: Task) {
  if (!task.dueDate) return null;
  const due = new Date(task.dueDate);
  const now = new Date();
  const created = new Date(task.createdAt);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const totalDays = Math.max(1, Math.ceil((due.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
  const elapsed = Math.ceil((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  const progress = task.status === "concluida" ? 100 : Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100)));
  const isOverdue = diffDays < 0 && task.status !== "concluida";
  const isUrgent = diffDays >= 0 && diffDays <= 3 && task.status !== "concluida";

  return { diffDays, progress, isOverdue, isUrgent, dueFormatted: due.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) };
}

export default function TaskPipeline({
  projectId,
  initialTasks,
}: {
  projectId: string;
  initialTasks: Task[];
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<"media" | "alta" | "critica" | "baixa">("media");
  const [newDueDate, setNewDueDate] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  async function handleAddTask() {
    if (!newTitle.trim()) return;
    startTransition(async () => {
      const task = await createTask({
        projectId,
        title: newTitle.trim(),
        priority: newPriority,
        dueDate: newDueDate || undefined,
      });
      if (task) {
        setTasks((prev) => [...prev, { ...task, createdAt: new Date(task.createdAt) }]);
        setNewTitle("");
        setNewDueDate("");
        setShowAdd(false);
      }
    });
  }

  function handleStatusChange(taskId: string, newStatus: string) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    startTransition(() => {
      updateTaskStatus(taskId, newStatus as "nao_iniciada" | "em_andamento" | "concluida" | "bloqueada" | "cancelada");
    });
  }

  function toggleGroup(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const overdue = tasks.filter((t) => {
    const info = getDaysInfo(t);
    return info?.isOverdue;
  });

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-2">
        {STATUS_CONFIG.map((sc) => {
          const count = tasks.filter((t) => t.status === sc.key).length;
          return (
            <div key={sc.key} className={`${sc.bg} rounded-xl p-3 border ${sc.border}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <sc.icon size={14} className={sc.color} />
                <span className="text-[10px] font-bold text-gray-500 uppercase">{sc.label}</span>
              </div>
              <p className="text-xl font-bold text-navy">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">
            {overdue.length} tarefa{overdue.length > 1 ? "s" : ""} atrasada{overdue.length > 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Add task */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
          Pipeline ({tasks.length})
        </h3>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg gradient-main text-white text-sm font-medium"
        >
          <Plus size={16} /> Nova Tarefa
        </button>
      </div>

      {showAdd && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 p-4 space-y-3"
        >
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Titulo da tarefa..."
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan/40"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as "media" | "alta" | "critica" | "baixa")}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
            >
              <option value="baixa">Baixa</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="critica">Critica</option>
            </select>
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
            />
            <button onClick={handleAddTask} disabled={isPending || !newTitle.trim()} className="px-4 py-2 rounded-lg gradient-main text-white text-sm font-medium disabled:opacity-50">
              Criar
            </button>
            <button onClick={() => { setShowAdd(false); setNewTitle(""); }} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-500 text-sm">
              Cancelar
            </button>
          </div>
        </motion.div>
      )}

      {/* Pipeline groups */}
      {STATUS_CONFIG.map((sc) => {
        const groupTasks = tasks.filter((t) => t.status === sc.key);
        if (groupTasks.length === 0) return null;
        const isCollapsed = collapsedGroups.has(sc.key);

        return (
          <div key={sc.key} className="space-y-1">
            <button
              onClick={() => toggleGroup(sc.key)}
              className={`flex items-center gap-2 w-full px-3 py-2 ${sc.bg} rounded-lg border ${sc.border} hover:opacity-80 transition-opacity`}
            >
              {isCollapsed ? <ChevronRight size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              <div className={`w-2.5 h-2.5 rounded-full ${sc.dot}`} />
              <span className="text-sm font-bold text-gray-700">{sc.label}</span>
              <span className="text-xs text-gray-400 ml-auto">{groupTasks.length}</span>
            </button>

            {!isCollapsed && (
              <div className="space-y-1 ml-2">
                {groupTasks.map((task, i) => {
                  const info = getDaysInfo(task);
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => setEditingTask(task)}
                      className={`bg-white rounded-lg border p-3 cursor-pointer hover:shadow-md transition-all ${
                        info?.isOverdue
                          ? "border-red-300 bg-red-50/50"
                          : info?.isUrgent
                            ? "border-amber-300 bg-amber-50/30"
                            : "border-gray-100"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Status quick toggle */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const nextStatus = task.status === "nao_iniciada" ? "em_andamento" : task.status === "em_andamento" ? "concluida" : task.status;
                            if (nextStatus !== task.status) handleStatusChange(task.id, nextStatus);
                          }}
                          className={`mt-0.5 flex-shrink-0 ${sc.color}`}
                        >
                          <sc.icon size={18} />
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className={`text-sm font-medium ${task.status === "concluida" ? "line-through text-gray-400" : "text-gray-800"}`}>
                              {task.title}
                            </p>
                            <Badge className={TASK_PRIORITY_COLORS[task.priority]}>
                              {TASK_PRIORITY_LABELS[task.priority]}
                            </Badge>
                          </div>

                          {/* Timeline bar */}
                          {info && (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    info.isOverdue
                                      ? "bg-red-500"
                                      : info.isUrgent
                                        ? "bg-amber-400"
                                        : task.status === "concluida"
                                          ? "bg-green-500"
                                          : "bg-cyan"
                                  }`}
                                  style={{ width: `${info.progress}%` }}
                                />
                              </div>
                              <span className={`text-[10px] font-medium flex items-center gap-0.5 flex-shrink-0 ${
                                info.isOverdue ? "text-red-500" : info.isUrgent ? "text-amber-500" : "text-gray-400"
                              }`}>
                                {info.isOverdue && <AlertTriangle size={10} />}
                                <Calendar size={10} />
                                {info.dueFormatted}
                                {info.isOverdue
                                  ? ` (${Math.abs(info.diffDays)}d atrasada)`
                                  : info.diffDays === 0
                                    ? " (hoje)"
                                    : ` (${info.diffDays}d)`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {tasks.length === 0 && !showAdd && (
        <div className="text-center py-12">
          <Circle size={48} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Nenhuma tarefa neste projeto.</p>
          <button onClick={() => setShowAdd(true)} className="mt-2 text-sm text-cyan font-medium hover:underline">
            Criar primeira tarefa
          </button>
        </div>
      )}

      {editingTask && (
        <TaskEditModal task={editingTask} onClose={() => setEditingTask(null)} onStatusChange={handleStatusChange} />
      )}
    </div>
  );
}
