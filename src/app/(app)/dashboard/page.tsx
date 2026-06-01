export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { getDashboardStats } from "@/lib/actions/areas";
import { getRecentActivity } from "@/lib/actions/activity";
import { getAllTasks } from "@/lib/actions/tasks";
import { AreaRow } from "@/components/dashboard/AreaHighlightCard";
import Header from "@/components/layout/Header";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Mic } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  created: "criou",
  updated: "atualizou",
  deleted: "excluiu",
  status_changed: "mudou o status de",
  completed: "concluiu",
  triggered: "disparou",
  sent: "enviou",
  queued: "enfileirou",
};
const ENTITY_LABELS: Record<string, string> = {
  task: "uma tarefa",
  project: "um projeto",
  automation: "uma automação",
  notification: "uma notificação",
  whatsapp: "um WhatsApp",
};

function spTime(opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", ...opts }).format(
    new Date()
  );
}

export default async function DashboardPage() {
  const session = await auth();
  const stats = await getDashboardStats();
  const activity = await getRecentActivity(8);
  const allTasks = await getAllTasks();

  const userName = session?.user?.name?.split(" ")[0] || "Usuário";
  const hour = Number(spTime({ hour: "numeric", hour12: false }));
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const today = spTime({ weekday: "long", day: "2-digit", month: "long" });

  const totalProjects = stats.reduce((s, a) => s + a.projectCount, 0);
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((t) => t.status === "concluida").length;
  const overdueTasks = allTasks.filter(
    (t) =>
      t.dueDate &&
      new Date(t.dueDate) < new Date() &&
      t.status !== "concluida" &&
      t.status !== "cancelada"
  ).length;
  const inProgress = allTasks.filter((t) => t.status === "em_andamento").length;
  const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const metrics = [
    { label: "Projetos", value: totalProjects, tone: "text-navy" },
    { label: "Em andamento", value: inProgress, tone: "text-navy" },
    { label: "Concluídas", value: completedTasks, tone: "text-navy" },
    {
      label: "Atrasadas",
      value: overdueTasks,
      tone: overdueTasks > 0 ? "text-red-500" : "text-gray-300",
    },
  ];

  return (
    <div className="relative min-h-screen">
      <Header title="Painel" />

      {/* atmosfera sutil no topo */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(70%_100%_at_50%_0%,rgba(0,180,216,0.07),transparent)]" />

      <div className="relative mx-auto max-w-5xl space-y-10 px-4 py-8 md:px-6 md:py-10">
        {/* Masthead editorial */}
        <header className="reveal">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-gray-400">
            Painel Executivo · <span className="capitalize">{today}</span>
          </p>
          <h1 className="mt-3 font-serif text-4xl font-light leading-none text-navy md:text-5xl">
            {greeting}, {userName}.
          </h1>
          <div className="mt-5 h-px w-full bg-gradient-to-r from-gray-300/80 via-gray-200/60 to-transparent" />
        </header>

        {/* Tira de indicadores */}
        <section
          className="reveal flex flex-wrap overflow-hidden rounded-2xl border border-gray-200/70 bg-white"
          style={{ animationDelay: "80ms" }}
        >
          {metrics.map((m) => (
            <div
              key={m.label}
              className="min-w-[50%] flex-1 border-gray-100 px-6 py-6 [&:not(:first-child)]:border-t [&:not(:first-child)]:md:border-l [&:not(:first-child)]:md:border-t-0 sm:min-w-0"
            >
              <p className="text-[10px] uppercase tracking-[0.16em] text-gray-400">{m.label}</p>
              <p className={`mt-2.5 font-serif text-4xl leading-none tnum ${m.tone}`}>{m.value}</p>
            </div>
          ))}
          {/* Progresso com medidor */}
          <div className="min-w-full flex-1 border-t border-gray-100 px-6 py-6 md:min-w-0 md:border-l md:border-t-0">
            <div className="flex items-baseline justify-between">
              <p className="text-[10px] uppercase tracking-[0.16em] text-gray-400">Progresso</p>
              <p className="font-serif text-4xl leading-none tnum text-navy">{pct}%</p>
            </div>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan to-green transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </section>

        {/* Comando de voz */}
        <button
          className="reveal flex w-full items-center gap-3 rounded-xl border border-gray-200/70 bg-white px-5 py-3.5 text-left transition-colors hover:border-cyan/40"
          style={{ animationDelay: "140ms" }}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan/10 text-cyan">
            <Mic size={17} />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold text-navy">Hello Better</span>
            <span className="block text-xs text-gray-400">
              Diga &ldquo;criar tarefa…&rdquo;, &ldquo;mudar status…&rdquo; ou navegue por voz.
            </span>
          </span>
        </button>

        {/* Áreas */}
        <section className="reveal" style={{ animationDelay: "200ms" }}>
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
              Áreas de negócio
            </h2>
            <div className="h-px flex-1 bg-gray-200/70" />
            <span className="text-[11px] text-gray-400 tnum">{stats.length}</span>
          </div>
          <div className="space-y-2.5">
            {stats.map((area, i) => (
              <AreaRow key={area.id} area={area} index={i} />
            ))}
            {stats.length === 0 && (
              <p className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
                Nenhuma área para exibir.
              </p>
            )}
          </div>
        </section>

        {/* Atividade */}
        <section className="reveal" style={{ animationDelay: "260ms" }}>
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
              Atividade recente
            </h2>
            <div className="h-px flex-1 bg-gray-200/70" />
          </div>

          {activity.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
              Nenhuma atividade registrada.
            </p>
          ) : (
            <ol className="space-y-1">
              {activity.map((entry) => (
                <li key={entry.id} className="flex items-center gap-3.5 rounded-lg px-2 py-2.5 hover:bg-white/70">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-navy/5 text-[10px] font-bold text-navy ring-1 ring-navy/5">
                    {entry.userName
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                  <p className="min-w-0 flex-1 truncate text-sm text-gray-600">
                    <span className="font-semibold text-navy">{entry.userName}</span>{" "}
                    {ACTION_LABELS[entry.action] || entry.action}{" "}
                    <span className="text-gray-500">
                      {ENTITY_LABELS[entry.entityType] || entry.entityType}
                    </span>
                  </p>
                  <span className="flex-shrink-0 text-xs text-gray-400 tnum" suppressHydrationWarning>
                    {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true, locale: ptBR })}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
