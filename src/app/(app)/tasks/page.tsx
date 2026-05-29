import { getAllTasks } from "@/lib/actions/tasks";
import Header from "@/components/layout/Header";
import Badge from "@/components/shared/Badge";
import Link from "next/link";
import {
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
} from "@/lib/constants";
import { Calendar, AlertCircle } from "lucide-react";

export default async function GlobalTasksPage() {
  const tasks = await getAllTasks();

  const overdue = tasks.filter(
    (t) =>
      t.dueDate &&
      new Date(t.dueDate) < new Date() &&
      t.status !== "concluida" &&
      t.status !== "cancelada"
  );

  return (
    <div className="min-h-screen">
      <Header title="Todas as Tarefas" />

      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400">Total</p>
            <p className="text-2xl font-bold text-navy">{tasks.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400">Em Andamento</p>
            <p className="text-2xl font-bold text-blue-600">
              {tasks.filter((t) => t.status === "em_andamento").length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400">Concluidas</p>
            <p className="text-2xl font-bold text-green">
              {tasks.filter((t) => t.status === "concluida").length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400">Atrasadas</p>
            <p className="text-2xl font-bold text-red-500">{overdue.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
          {tasks.map((task) => {
            const isOverdue =
              task.dueDate &&
              new Date(task.dueDate) < new Date() &&
              task.status !== "concluida" &&
              task.status !== "cancelada";

            return (
              <Link
                key={task.id}
                href={`/areas/${task.areaSlug}/projects/${task.projectSlug}`}
              >
                <div className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {task.title}
                    </p>
                    <p className="text-xs text-gray-400">
                      {task.areaName} / {task.projectName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={TASK_PRIORITY_COLORS[task.priority]}>
                      {TASK_PRIORITY_LABELS[task.priority]}
                    </Badge>
                    {task.dueDate && (
                      <span
                        className={`flex items-center gap-1 text-xs ${
                          isOverdue ? "text-red-500 font-medium" : "text-gray-400"
                        }`}
                      >
                        {isOverdue && <AlertCircle size={10} />}
                        <Calendar size={10} />
                        {task.dueDate}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
          {tasks.length === 0 && (
            <p className="p-8 text-sm text-gray-400 text-center">
              Nenhuma tarefa encontrada.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
