import Link from "next/link";
import { Calendar, ArrowRight } from "lucide-react";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
} from "@/lib/constants";
import Badge from "@/components/shared/Badge";

type Project = {
  id: string;
  name: string;
  slug: string;
  status: string;
  targetDate: string | null;
};

type Deadline = { label: string; tone: string };

// Semáforo de prazo derivado do targetDate + status (sem precisar de dados extra).
function deadlineStatus(project: Project): Deadline {
  if (project.status === "concluido") return { label: "Concluído", tone: "bg-gray-100 text-gray-500" };
  if (project.status === "descontinuado")
    return { label: "Descontinuado", tone: "bg-gray-100 text-gray-400" };
  if (!project.targetDate) return { label: "Sem prazo", tone: "bg-gray-100 text-gray-400" };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(project.targetDate + "T00:00:00");
  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (days < 0) return { label: `Atrasado ${-days}d`, tone: "bg-red-100 text-red-600" };
  if (days <= 14) return { label: `Em risco (${days}d)`, tone: "bg-amber-100 text-amber-700" };
  return { label: `No prazo (${days}d)`, tone: "bg-green/15 text-green" };
}

export default function DeliveryBoard({
  areaSlug,
  projects,
}: {
  areaSlug: string;
  projects: Project[];
}) {
  if (projects.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-6">
        Nenhum projeto com entrega nesta área.
      </p>
    );
  }

  // Ordena: atrasados/risco primeiro (por data alvo mais próxima), sem prazo por último.
  const sorted = [...projects].sort((a, b) => {
    if (!a.targetDate) return 1;
    if (!b.targetDate) return -1;
    return a.targetDate.localeCompare(b.targetDate);
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {sorted.map((project) => {
        const dl = deadlineStatus(project);
        return (
          <Link key={project.id} href={`/areas/${areaSlug}/projects/${project.slug}`}>
            <div className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-2 gap-2">
                <h4 className="font-semibold text-sm text-navy">{project.name}</h4>
                <Badge className={dl.tone}>{dl.label}</Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <Badge className={PROJECT_STATUS_COLORS[project.status] || ""}>
                  {PROJECT_STATUS_LABELS[project.status] || project.status}
                </Badge>
                {project.targetDate && (
                  <span className="flex items-center gap-1">
                    <Calendar size={12} /> {project.targetDate}
                  </span>
                )}
                <span className="ml-auto flex items-center gap-1 text-cyan">
                  Abrir <ArrowRight size={12} />
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
