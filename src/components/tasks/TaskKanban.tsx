"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  GripVertical,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { createTask, updateTaskStatus } from "@/lib/actions/tasks";
import {
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
} from "@/lib/constants";
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

const COLUMNS = [
  { key: "nao_iniciada", label: "Nao Iniciada", color: "border-gray-300" },
  { key: "em_andamento", label: "Em Andamento", color: "border-blue-400" },
  { key: "concluida", label: "Concluida", color: "border-green-400" },
  { key: "bloqueada", label: "Bloqueada", color: "border-red-400" },
];

export default function TaskKanban({
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
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleAddTask() {
    if (!newTitle.trim()) return;
    startTransition(async () => {
      const task = await createTask({
        projectId,
        title: newTitle.trim(),
        priority: newPriority,
      });
      if (task) {
        setTasks((prev) => [...prev, { ...task, createdAt: new Date(task.createdAt) }]);
        setNewTitle("");
        setShowAdd(false);
      }
    });
  }

  async function handleStatusChange(taskId: string, newStatus: string) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t
      )
    );
    startTransition(() => {
      updateTaskStatus(taskId, newStatus as "nao_iniciada" | "em_andamento" | "concluida" | "bloqueada" | "cancelada");
    });
  }

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === "concluida") return false;
    return new Date(task.dueDate) < new Date();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
          {tasks.length} tarefas
        </h3>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg gradient-main text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={16} />
          Nova Tarefa
        </button>
      </div>

      {showAdd && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 p-4 mb-4 space-y-3"
        >
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Titulo da tarefa..."
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan/40"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
          />
          <div className="flex items-center gap-2">
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as "media" | "alta" | "critica" | "baixa")}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan/40"
            >
              <option value="baixa">Baixa</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="critica">Critica</option>
            </select>
            <button
              onClick={handleAddTask}
              disabled={isPending || !newTitle.trim()}
              className="px-4 py-2 rounded-lg gradient-main text-white text-sm font-medium disabled:opacity-50"
            >
              {isPending ? "Criando..." : "Criar"}
            </button>
            <button
              onClick={() => {
                setShowAdd(false);
                setNewTitle("");
              }}
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-500 text-sm"
            >
              Cancelar
            </button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className="space-y-2">
              <div
                className={`flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border-l-4 ${col.color}`}
              >
                <span className="text-xs font-bold text-gray-500 uppercase">
                  {col.label}
                </span>
                <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full">
                  {colTasks.length}
                </span>
              </div>

              <div className="space-y-2 min-h-[100px]">
                {colTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-lg border border-gray-100 p-3 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setEditingTask(task)}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical
                        size={14}
                        className="text-gray-300 mt-0.5 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 line-clamp-2">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={TASK_PRIORITY_COLORS[task.priority]}>
                            {TASK_PRIORITY_LABELS[task.priority]}
                          </Badge>
                          {task.dueDate && (
                            <span
                              className={`flex items-center gap-1 text-xs ${
                                isOverdue(task)
                                  ? "text-red-500"
                                  : "text-gray-400"
                              }`}
                            >
                              {isOverdue(task) && (
                                <AlertCircle size={10} />
                              )}
                              <Calendar size={10} />
                              {task.dueDate}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {editingTask && (
        <TaskEditModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
