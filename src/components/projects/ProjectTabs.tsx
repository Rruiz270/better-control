"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TaskPipeline from "@/components/tasks/TaskPipeline";
import KPIGrid from "@/components/kpis/KPIGrid";
import NotesList from "@/components/notes/NotesList";
import BudgetView from "@/components/projects/BudgetView";

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

type Kpi = {
  id: string;
  name: string;
  category: string;
  type: string;
  targetValue: string | null;
  currentValue: string | null;
  unit: string | null;
  period: string | null;
  isCustom: boolean;
  projectId: string;
};

const TABS = [
  { key: "tasks", label: "Tarefas" },
  { key: "kpis", label: "KPIs" },
  { key: "budget", label: "Budget" },
  { key: "notes", label: "Notas" },
];

export default function ProjectTabs({
  projectId,
  tasks,
  kpis,
  areaSlug,
  projectSlug,
  budget,
  forecast,
  startDate,
  targetDate,
}: {
  projectId: string;
  tasks: Task[];
  kpis: Kpi[];
  areaSlug: string;
  projectSlug: string;
  budget?: string | null;
  forecast?: string | null;
  startDate?: string | null;
  targetDate?: string | null;
}) {
  const [activeTab, setActiveTab] = useState("tasks");

  return (
    <div>
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? "bg-white text-navy shadow-sm"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "tasks" && (
            <TaskPipeline projectId={projectId} initialTasks={tasks} />
          )}
          {activeTab === "kpis" && (
            <KPIGrid projectId={projectId} initialKpis={kpis} />
          )}
          {activeTab === "budget" && (
            <BudgetView
              budget={budget}
              forecast={forecast}
              startDate={startDate}
              targetDate={targetDate}
              kpis={kpis.filter((k) => k.category === "financial")}
            />
          )}
          {activeTab === "notes" && (
            <NotesList entityType="project" entityId={projectId} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
