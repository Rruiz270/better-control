"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Languages,
  Code,
  GraduationCap,
  Building2,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Circle,
} from "lucide-react";
import { AREA_CONFIGS } from "@/lib/constants";

const ICON_MAP: Record<string, React.ElementType> = {
  Languages,
  Code,
  GraduationCap,
  Building2,
};

type AreaStat = {
  id: string;
  slug: string;
  name: string;
  headName: string | null;
  projectCount: number;
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  semaphore: "red" | "yellow" | "green";
};

function SemaphoreIcon({ status }: { status: "red" | "yellow" | "green" }) {
  if (status === "red")
    return <AlertCircle size={20} className="text-red-400" />;
  if (status === "yellow")
    return <Circle size={20} className="text-amber-400 fill-amber-400" />;
  return <CheckCircle size={20} className="text-green-400" />;
}

export default function AreaHighlightCard({ area }: { area: AreaStat }) {
  const config = AREA_CONFIGS[area.slug] || AREA_CONFIGS.tech;
  const Icon = ICON_MAP[config.icon] || Building2;
  const progress =
    area.totalTasks > 0
      ? Math.round((area.completedTasks / area.totalTasks) * 100)
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Link href={`/areas/${area.slug}`}>
        <div
          className={`relative overflow-hidden rounded-2xl p-6 text-white bg-gradient-to-br ${config.gradient} shadow-lg hover:shadow-xl transition-shadow cursor-pointer`}
        >
          <div className="absolute top-4 right-4 opacity-10">
            <Icon size={100} />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <Icon size={24} />
              </div>
              <SemaphoreIcon status={area.semaphore} />
            </div>

            <h2 className="text-2xl font-extrabold mb-1">{area.name}</h2>
            {area.headName && (
              <p className="text-sm text-white/70 mb-4">
                Head: {area.headName}
              </p>
            )}

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <p className="text-2xl font-bold">{area.projectCount}</p>
                <p className="text-xs text-white/60">Projetos</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{area.activeProjects}</p>
                <p className="text-xs text-white/60">Ativos</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{area.overdueTasks}</p>
                <p className="text-xs text-white/60">Atrasadas</p>
              </div>
            </div>

            <div className="mb-2">
              <div className="flex justify-between text-xs text-white/70 mb-1">
                <span>Progresso de Tarefas</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/80 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1 text-sm text-white/80 mt-3">
              <span>Ver detalhes</span>
              <ArrowRight size={16} />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function AreaSmallCard({ area }: { area: AreaStat }) {
  const config = AREA_CONFIGS[area.slug] || AREA_CONFIGS.tech;
  const Icon = ICON_MAP[config.icon] || Building2;
  const progress =
    area.totalTasks > 0
      ? Math.round((area.completedTasks / area.totalTasks) * 100)
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Link href={`/areas/${area.slug}`}>
        <div className="bg-white rounded-xl p-4 border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all cursor-pointer">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: config.color + "15" }}
            >
              <Icon size={18} style={{ color: config.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold truncate">{area.name}</h3>
              {area.headName && (
                <p className="text-xs text-gray-400 truncate">
                  {area.headName}
                </p>
              )}
            </div>
            <SemaphoreIcon status={area.semaphore} />
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>{area.projectCount} projetos</span>
            <span>{area.overdueTasks} atrasadas</span>
          </div>

          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                backgroundColor: config.color,
              }}
            />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
