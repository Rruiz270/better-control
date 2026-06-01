import Link from "next/link";
import { Languages, Code, GraduationCap, Building2, ArrowUpRight } from "lucide-react";
import { AREA_CONFIGS } from "@/lib/constants";

const ICON_MAP: Record<string, React.ElementType> = {
  Languages,
  Code,
  GraduationCap,
  Building2,
};

const SEMA: Record<"red" | "yellow" | "green", string> = {
  green: "#00C48A",
  yellow: "#F59E0B",
  red: "#EF4444",
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

function Figure({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className="text-right">
      <p className={`font-serif text-xl leading-none tnum ${alert ? "text-red-500" : "text-navy"}`}>
        {value}
      </p>
      <p className="mt-1.5 text-[10px] uppercase tracking-[0.14em] text-gray-400">{label}</p>
    </div>
  );
}

export function AreaRow({ area, index = 0 }: { area: AreaStat; index?: number }) {
  const config = AREA_CONFIGS[area.slug] || AREA_CONFIGS.tech;
  const Icon = ICON_MAP[config.icon] || Building2;
  const progress =
    area.totalTasks > 0 ? Math.round((area.completedTasks / area.totalTasks) * 100) : 0;

  return (
    <Link
      href={`/areas/${area.slug}`}
      className="group block reveal"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="relative flex items-center gap-4 md:gap-6 overflow-hidden rounded-xl border border-gray-200/70 bg-white pl-5 pr-4 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-navy/20 hover:shadow-[0_10px_34px_-14px_rgba(10,36,99,0.28)]">
        <span
          className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
          style={{ backgroundColor: config.color }}
        />

        <div
          className="hidden sm:flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: config.color + "14", color: config.color }}
        >
          <Icon size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: SEMA[area.semaphore] }}
            />
            <h3 className="truncate font-serif text-lg leading-tight text-navy">{area.name}</h3>
          </div>
          <p className="mt-1 truncate text-xs text-gray-400">
            {area.headName ? `Head · ${area.headName}` : "Sem head definido"}
          </p>
          {/* compacto no mobile */}
          <p className="mt-1.5 text-xs text-gray-500 tnum md:hidden">
            {area.projectCount} proj · {area.activeProjects} ativos
            {area.overdueTasks > 0 && (
              <span className="text-red-500"> · {area.overdueTasks} atrasadas</span>
            )}
          </p>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <Figure label="Projetos" value={area.projectCount} />
          <Figure label="Ativos" value={area.activeProjects} />
          <Figure label="Atrasadas" value={area.overdueTasks} alert={area.overdueTasks > 0} />
        </div>

        <div className="hidden w-28 flex-col items-end lg:flex">
          <span className="text-xs text-gray-500 tnum">{progress}%</span>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progress}%`, backgroundColor: config.color }}
            />
          </div>
        </div>

        <ArrowUpRight
          size={16}
          className="flex-shrink-0 text-gray-300 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-navy"
        />
      </div>
    </Link>
  );
}
