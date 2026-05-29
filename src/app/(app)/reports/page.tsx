import { getDashboardStats } from "@/lib/actions/areas";
import Header from "@/components/layout/Header";
import { AREA_CONFIGS } from "@/lib/constants";

export default async function ReportsPage() {
  const stats = await getDashboardStats();

  const totalProjects = stats.reduce((s, a) => s + a.projectCount, 0);
  const totalTasks = stats.reduce((s, a) => s + a.totalTasks, 0);
  const completedTasks = stats.reduce((s, a) => s + a.completedTasks, 0);
  const overdueTasks = stats.reduce((s, a) => s + a.overdueTasks, 0);
  const overallProgress =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="min-h-screen">
      <Header title="Relatorios" />

      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400">Projetos</p>
            <p className="text-2xl font-bold text-navy">{totalProjects}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400">Tarefas</p>
            <p className="text-2xl font-bold text-navy">{totalTasks}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400">Concluidas</p>
            <p className="text-2xl font-bold text-green">{completedTasks}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400">Atrasadas</p>
            <p className="text-2xl font-bold text-red-500">{overdueTasks}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-lg font-bold text-navy mb-4">
            Progresso Geral — {overallProgress}%
          </h3>
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden mb-6">
            <div
              className="h-full gradient-accent rounded-full transition-all duration-700"
              style={{ width: `${overallProgress}%` }}
            />
          </div>

          <div className="space-y-4">
            {stats.map((area) => {
              const config = AREA_CONFIGS[area.slug] || AREA_CONFIGS.tech;
              const progress =
                area.totalTasks > 0
                  ? Math.round(
                      (area.completedTasks / area.totalTasks) * 100
                    )
                  : 0;

              return (
                <div key={area.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {area.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {area.completedTasks}/{area.totalTasks} tarefas (
                      {progress}%)
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: config.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-lg font-bold text-navy mb-4">
            Resumo por Area
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.map((area) => {
              const config = AREA_CONFIGS[area.slug] || AREA_CONFIGS.tech;
              return (
                <div
                  key={area.id}
                  className="border border-gray-100 rounded-lg p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: config.color }}
                    />
                    <h4 className="text-sm font-bold text-navy">{area.name}</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-navy">
                        {area.projectCount}
                      </p>
                      <p className="text-[10px] text-gray-400">Projetos</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-navy">
                        {area.activeProjects}
                      </p>
                      <p className="text-[10px] text-gray-400">Ativos</p>
                    </div>
                    <div>
                      <p
                        className={`text-lg font-bold ${
                          area.overdueTasks > 0 ? "text-red-500" : "text-green"
                        }`}
                      >
                        {area.overdueTasks}
                      </p>
                      <p className="text-[10px] text-gray-400">Atrasadas</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
