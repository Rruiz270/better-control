"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick(next: string) {
    if (next === status) return;
    const prev = status;
    setStatus(next); // otimista
    setError(null);
    startTransition(async () => {
      try {
        await updateProjectStatus(projectId, next);
        router.refresh();
      } catch {
        setStatus(prev); // reverte
        setError("Você não tem permissão para alterar o status desta área.");
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => {
          const isActive = s === status;
          return (
            <button
              key={s}
              onClick={() => handleClick(s)}
              disabled={isPending}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? `${STATUS_STYLES[s]} text-white shadow-md scale-105`
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              } disabled:opacity-50`}
            >
              {PROJECT_STATUS_LABELS[s]}
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}
