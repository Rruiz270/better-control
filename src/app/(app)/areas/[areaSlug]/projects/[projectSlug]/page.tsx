export const dynamic = "force-dynamic";

import { getProjectWithDetails } from "@/lib/actions/projects";
import { notFound } from "next/navigation";
import Header from "@/components/layout/Header";
import ProjectStatusButtons from "@/components/projects/ProjectStatusButtons";
import ProjectTabs from "@/components/projects/ProjectTabs";
import { Calendar, DollarSign, Users } from "lucide-react";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ areaSlug: string; projectSlug: string }>;
}) {
  const { areaSlug, projectSlug } = await params;
  const project = await getProjectWithDetails(areaSlug, projectSlug);
  if (!project) notFound();

  const completedTasks = project.tasks.filter(
    (t) => t.status === "concluida"
  ).length;
  const progress =
    project.tasks.length > 0
      ? Math.round((completedTasks / project.tasks.length) * 100)
      : 0;

  return (
    <div className="min-h-screen">
      <Header title={project.name} />

      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-xl font-bold text-navy mb-1">{project.name}</h2>
          {project.description && (
            <p className="text-sm text-gray-500 mb-4">{project.description}</p>
          )}

          <ProjectStatusButtons
            projectId={project.id}
            currentStatus={project.status}
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400">Tarefas</p>
              <p className="text-lg font-bold text-navy">
                {completedTasks}/{project.tasks.length}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400">Progresso</p>
              <p className="text-lg font-bold text-navy">{progress}%</p>
            </div>
            {project.budget && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <DollarSign size={10} /> Budget
                </p>
                <p className="text-lg font-bold text-navy">
                  R$ {Number(project.budget).toLocaleString("pt-BR")}
                </p>
              </div>
            )}
            {project.targetDate && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Calendar size={10} /> Prazo
                </p>
                <p className="text-lg font-bold text-navy">
                  {project.targetDate}
                </p>
              </div>
            )}
          </div>

          {project.members.length > 0 && (
            <div className="flex items-center gap-2 mt-4">
              <Users size={14} className="text-gray-400" />
              <div className="flex -space-x-2">
                {project.members.slice(0, 5).map((m) => (
                  <div
                    key={m.userId}
                    className="w-7 h-7 rounded-full gradient-main flex items-center justify-center text-[9px] font-bold text-white border-2 border-white"
                    title={m.name}
                  >
                    {m.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                ))}
              </div>
              <span className="text-xs text-gray-400">
                {project.members.length} membro
                {project.members.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        <ProjectTabs
          projectId={project.id}
          tasks={project.tasks}
          kpis={project.kpis}
          areaSlug={areaSlug}
          projectSlug={projectSlug}
        />
      </div>
    </div>
  );
}
