"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { X, Trash2 } from "lucide-react";
import { updateTask, deleteTask, updateTaskStatus } from "@/lib/actions/tasks";
import {
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
} from "@/lib/constants";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
};

const STATUSES = ["nao_iniciada", "em_andamento", "concluida", "bloqueada", "cancelada"] as const;
const PRIORITIES = ["baixa", "media", "alta", "critica"] as const;

export default function TaskEditModal({
  task,
  onClose,
  onStatusChange,
}: {
  task: Task;
  onClose: () => void;
  onStatusChange: (taskId: string, status: string) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate || "");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      await updateTask(task.id, {
        title,
        description: description || undefined,
        priority: priority as "critica" | "alta" | "media" | "baixa",
        dueDate: dueDate || null,
      });
      onClose();
    });
  }

  function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir esta tarefa?")) return;
    startTransition(async () => {
      await deleteTask(task.id);
      onClose();
    });
  }

  function handleStatusClick(status: string) {
    onStatusChange(task.id, status);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="relative bg-white rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-navy">Editar Tarefa</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Titulo
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan/40"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Descricao
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan/40 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">
            Status
          </label>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusClick(s)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  task.status === s
                    ? "gradient-main text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {TASK_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Prioridade
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan/40"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {TASK_PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Prazo
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan/40"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 text-sm"
          >
            <Trash2 size={14} />
            Excluir
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-6 py-2.5 rounded-lg gradient-main text-white text-sm font-medium disabled:opacity-50"
          >
            {isPending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
