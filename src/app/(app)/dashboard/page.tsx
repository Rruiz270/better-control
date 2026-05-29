export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { getDashboardStats } from "@/lib/actions/areas";
import { getRecentActivity } from "@/lib/actions/activity";
import { getAllTasks } from "@/lib/actions/tasks";
import AreaHighlightCard, {
  AreaSmallCard,
} from "@/components/dashboard/AreaHighlightCard";
import Header from "@/components/layout/Header";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, CheckCircle, Clock, Mic, TrendingUp, Zap } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  const stats = await getDashboardStats();
  const activity = await getRecentActivity(10);
  const allTasks = await getAllTasks();

  const [featured, ...others] = stats;
  const userName = session?.user?.name?.split(" ")[0] || "Usuario";

  const totalProjects = stats.reduce((s, a) => s + a.projectCount, 0);
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((t) => t.status === "concluida").length;
  const overdueTasks = allTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "concluida" && t.status !== "cancelada"
  ).length;
  const inProgress = allTasks.filter((t) => t.status === "em_andamento").length;

  return (
    <div className="min-h-screen">
      <Header title={`Ola, ${userName}`} />

      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
            <div className="p-2 bg-navy/5 rounded-lg"><Zap size={18} className="text-navy" /></div>
            <div>
              <p className="text-xs text-gray-400">Projetos</p>
              <p className="text-xl font-bold text-navy">{totalProjects}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg"><Clock size={18} className="text-blue-500" /></div>
            <div>
              <p className="text-xs text-gray-400">Em Andamento</p>
              <p className="text-xl font-bold text-blue-600">{inProgress}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg"><CheckCircle size={18} className="text-green-500" /></div>
            <div>
              <p className="text-xs text-gray-400">Concluidas</p>
              <p className="text-xl font-bold text-green-600">{completedTasks}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg"><AlertTriangle size={18} className="text-red-500" /></div>
            <div>
              <p className="text-xs text-gray-400">Atrasadas</p>
              <p className="text-xl font-bold text-red-500">{overdueTasks}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 md:col-span-1 col-span-2">
            <div className="p-2 bg-cyan/10 rounded-lg"><TrendingUp size={18} className="text-cyan" /></div>
            <div>
              <p className="text-xs text-gray-400">Progresso</p>
              <p className="text-xl font-bold text-navy">
                {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>

        {/* Voice hint */}
        <div className="gradient-dark rounded-xl p-4 flex items-center gap-3 text-white">
          <div className="p-2 bg-white/10 rounded-xl">
            <Mic size={20} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Hello Better</p>
            <p className="text-xs text-white/60">Clique no microfone para comandos de voz: criar tarefas, projetos, navegar...</p>
          </div>
        </div>

        {/* Featured area */}
        {featured && <AreaHighlightCard area={featured} />}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {others.map((area) => (
            <AreaSmallCard key={area.id} area={area} />
          ))}
        </div>

        {/* Activity feed */}
        <section>
          <h2 className="text-lg font-bold text-navy mb-3">
            Atividade Recente
          </h2>
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
            {activity.length === 0 && (
              <p className="p-4 text-sm text-gray-400">
                Nenhuma atividade registrada.
              </p>
            )}
            {activity.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 p-3 text-sm"
              >
                <div className="w-7 h-7 rounded-full gradient-accent flex items-center justify-center text-[10px] font-bold text-navy-dark flex-shrink-0 mt-0.5">
                  {entry.userName
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-700">
                    <span className="font-medium">{entry.userName}</span>{" "}
                    <span className="text-gray-400">{entry.action}</span>{" "}
                    <span className="font-medium">{entry.entityType}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDistanceToNow(new Date(entry.createdAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
