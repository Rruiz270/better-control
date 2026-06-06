export const dynamic = "force-dynamic";

import { getAllTasks, getTaskTargets } from "@/lib/actions/tasks";
import { auth } from "@/lib/auth";
import { isAdmin, type SessionUser } from "@/lib/policy";
import Header from "@/components/layout/Header";
import TaskBoard from "@/components/tasks/TaskBoard";
import BulkTaskAdd from "@/components/tasks/BulkTaskAdd";

export default async function GlobalTasksPage() {
  const [tasks, session, targets] = await Promise.all([
    getAllTasks(),
    auth(),
    getTaskTargets(),
  ]);
  const admin = session?.user ? isAdmin(session.user as SessionUser) : false;

  return (
    <div className="min-h-screen">
      <Header title={admin ? "Todas as Tarefas" : "Tarefas da Minha Área"} />

      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        {targets.projects.length > 0 && (
          <BulkTaskAdd projects={targets.projects} users={targets.users} />
        )}
        <TaskBoard tasks={tasks} />
      </div>
    </div>
  );
}
