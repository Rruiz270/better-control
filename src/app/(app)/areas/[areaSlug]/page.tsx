import { getAreaWithStats } from "@/lib/actions/areas";
import { notFound } from "next/navigation";
import Header from "@/components/layout/Header";
import Link from "next/link";
import Badge from "@/components/shared/Badge";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
} from "@/lib/constants";
import { Calendar, DollarSign, ArrowRight } from "lucide-react";

export default async function AreaDetailPage({
  params,
}: {
  params: Promise<{ areaSlug: string }>;
}) {
  const { areaSlug } = await params;
  const area = await getAreaWithStats(areaSlug);
  if (!area) notFound();

  const progress =
    area.totalTasks > 0
      ? Math.round((area.completedTasks / area.totalTasks) * 100)
      : 0;

  return (
    <div className="min-h-screen">
      <Header title={area.name} />

      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-navy">{area.name}</h2>
              {area.headName && (
                <p className="text-sm text-gray-500">
                  Head: {area.headName}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-navy">{progress}%</p>
              <p className="text-xs text-gray-400">progresso geral</p>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex gap-6 mt-4 text-sm text-gray-500">
            <span>{area.projects.length} projetos</span>
            <span>{area.totalTasks} tarefas</span>
            <span>{area.completedTasks} concluidas</span>
          </div>
        </div>

        <section>
          <h3 className="text-lg font-bold text-navy mb-3">Projetos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {area.projects.map((project) => (
              <Link
                key={project.id}
                href={`/areas/${areaSlug}/projects/${project.slug}`}
              >
                <div className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-sm text-navy">
                      {project.name}
                    </h4>
                    <Badge
                      className={
                        PROJECT_STATUS_COLORS[project.status] || ""
                      }
                    >
                      {PROJECT_STATUS_LABELS[project.status] || project.status}
                    </Badge>
                  </div>

                  {project.description && (
                    <p className="text-xs text-gray-400 mb-3 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {project.budget && (
                      <span className="flex items-center gap-1">
                        <DollarSign size={12} />
                        R$ {Number(project.budget).toLocaleString("pt-BR")}
                      </span>
                    )}
                    {project.targetDate && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {project.targetDate}
                      </span>
                    )}
                    <span className="ml-auto flex items-center gap-1 text-cyan">
                      Abrir <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {area.projects.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">
              Nenhum projeto nesta area.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
