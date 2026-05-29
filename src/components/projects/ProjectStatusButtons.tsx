"use client";

import { useTransition } from "react";
import { updateProjectStatus } from "@/lib/actions/projects";
import { PROJECT_STATUS_LABELS } from "@/lib/constants";

const STATUS_STYLES: Record<string, string> = {
  planejamento: "bg-blue-500",
  em_execucao: "bg-green-500",
  pausado: "bg-amber-500",
  concluido: "bg-gray-500",
  descontinuado: "bg-red-500",
};

const STATUSES = [
  "planejamento",
  "em_execucao",
  "pausado",
  "concluido",
  "descontinuado",
] as const;

export default function ProjectStatusButtons({
  projectId,
  currentStatus,
}: {
  projectId: string;
  currentStatus: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick(status: string) {
    if (status === currentStatus) return;
    startTransition(() => {
      updateProjectStatus(projectId, status);
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {STATUSES.map((status) => {
        const isActive = status === currentStatus;
        return (
          <button
            key={status}
            onClick={() => handleClick(status)}
            disabled={isPending}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              isActive
                ? `${STATUS_STYLES[status]} text-white shadow-md scale-105`
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            } disabled:opacity-50`}
          >
            {PROJECT_STATUS_LABELS[status]}
          </button>
        );
      })}
    </div>
  );
}
