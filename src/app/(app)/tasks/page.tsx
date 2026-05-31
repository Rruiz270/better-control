export const dynamic = "force-dynamic";

import { getAllTasks } from "@/lib/actions/tasks";
import { auth } from "@/lib/auth";
import { isAdmin, type SessionUser } from "@/lib/policy";
import Header from "@/components/layout/Header";
import TaskBoard from "@/components/tasks/TaskBoard";

export default async function GlobalTasksPage() {
  const [tasks, session] = await Promise.all([getAllTasks(), auth()]);
  const admin = session?.user ? isAdmin(session.user as SessionUser) : false;

  return (
    <div className="min-h-screen">
      <Header title={admin ? "Todas as Tarefas" : "Tarefas da Minha Área"} />

      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <TaskBoard tasks={tasks} />
      </div>
    </div>
  );
}
