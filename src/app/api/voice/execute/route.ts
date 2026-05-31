import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks, projects, areas, notes, activityLog } from "@/db/schema";
import { eq, ilike } from "drizzle-orm";
import {
  AuthorizationError,
  requireProjectAccess,
  requireAreaAccess,
  canContributeToArea,
  type SessionUser,
} from "@/lib/authorization";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Não autorizado" }, { status: 401 });
  }

  const { command } = await req.json();
  const userId = session.user.id;
  const user = session.user as SessionUser;

  // For non-admins, voice fallbacks must stay inside the user's own area —
  // otherwise "crie tarefa X" with no project named could land in any area.
  const areaScope = user.role === "admin" ? undefined : user.areaId ?? "__none__";

  async function defaultProjectId(): Promise<string | null> {
    if (areaScope === undefined) {
      const [p] = await db.select({ id: projects.id }).from(projects).limit(1);
      return p?.id ?? null;
    }
    const [p] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.areaId, areaScope))
      .limit(1);
    return p?.id ?? null;
  }

  try {
    switch (command.type) {
      case "create_task": {
        let projectId: string | null = null;

        if (command.project) {
          const [proj] = await db
            .select()
            .from(projects)
            .where(ilike(projects.name, `%${command.project}%`))
            .limit(1);
          projectId = proj?.id || null;
        }

        if (!projectId) projectId = await defaultProjectId();

        if (!projectId) {
          return NextResponse.json({
            ok: false,
            message: "Nenhum projeto acessível encontrado.",
          });
        }

        // Throws AuthorizationError (→ 403) if the user can't touch this area.
        await requireProjectAccess(projectId, { contributor: true });

        const taskId = crypto.randomUUID();
        await db.batch([
          db.insert(tasks).values({
            id: taskId,
            projectId,
            title: command.title,
            priority: command.priority || "media",
            createdBy: userId,
          }),
          db.insert(activityLog).values({
            userId,
            entityType: "task",
            entityId: taskId,
            action: "created",
            details: { title: command.title, via: "voice" },
          }),
        ]);

        return NextResponse.json({
          ok: true,
          message: `Tarefa "${command.title}" criada com sucesso!`,
        });
      }

      case "create_project": {
        let areaId: string | null = null;

        if (command.area) {
          const [area] = await db
            .select()
            .from(areas)
            .where(ilike(areas.name, `%${command.area}%`))
            .limit(1);
          areaId = area?.id || null;
          if (!areaId) {
            const [area2] = await db
              .select()
              .from(areas)
              .where(ilike(areas.slug, `%${command.area}%`))
              .limit(1);
            areaId = area2?.id || null;
          }
        }

        // Fallback: an area the user can actually manage (their own, for heads).
        if (!areaId) areaId = areaScope === undefined ? null : areaScope;
        if (!areaId && areaScope === undefined) {
          const [a] = await db.select({ id: areas.id }).from(areas).limit(1);
          areaId = a?.id || null;
        }

        if (!areaId) {
          return NextResponse.json({
            ok: false,
            message: "Nenhuma área acessível encontrada.",
          });
        }

        await requireAreaAccess(areaId);

        const slug = command.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

        const projectId = crypto.randomUUID();
        await db.batch([
          db.insert(projects).values({
            id: projectId,
            areaId,
            name: command.name,
            slug: slug || `projeto-${projectId.slice(0, 8)}`,
            createdBy: userId,
          }),
          db.insert(activityLog).values({
            userId,
            entityType: "project",
            entityId: projectId,
            action: "created",
            details: { name: command.name, via: "voice" },
          }),
        ]);

        return NextResponse.json({
          ok: true,
          message: `Projeto "${command.name}" criado!`,
        });
      }

      case "update_task": {
        // Match only tasks in areas the user may touch, so voice can't flip the
        // status of a task in another area by title collision.
        const candidates = await db
          .select({ id: tasks.id, title: tasks.title, areaId: projects.areaId })
          .from(tasks)
          .innerJoin(projects, eq(tasks.projectId, projects.id))
          .where(ilike(tasks.title, `%${command.title}%`));

        const task = candidates.find((t) => canContributeToArea(user, t.areaId));

        if (!task) {
          return NextResponse.json({
            ok: false,
            message: `Tarefa "${command.title}" não encontrada (ou sem permissão).`,
          });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updates: any = {
          status: command.status,
          updatedAt: new Date(),
        };
        if (command.status === "concluida") updates.completedAt = new Date();

        await db.batch([
          db.update(tasks).set(updates).where(eq(tasks.id, task.id)),
          db.insert(activityLog).values({
            userId,
            entityType: "task",
            entityId: task.id,
            action: "status_changed",
            details: { title: task.title, newStatus: command.status, via: "voice" },
          }),
        ]);

        return NextResponse.json({
          ok: true,
          message: `Tarefa "${task.title}" atualizada para ${command.status}.`,
        });
      }

      case "add_note": {
        let entityId: string | null = null;

        if (command.project) {
          const [proj] = await db
            .select()
            .from(projects)
            .where(ilike(projects.name, `%${command.project}%`))
            .limit(1);
          entityId = proj?.id || null;
        }

        if (!entityId) entityId = await defaultProjectId();

        if (!entityId) {
          return NextResponse.json({ ok: false, message: "Projeto acessível não encontrado." });
        }

        await requireProjectAccess(entityId, { contributor: true });

        await db.insert(notes).values({
          entityType: "project",
          entityId,
          userId,
          content: command.content,
          transcription: command.content,
        });

        return NextResponse.json({
          ok: true,
          message: "Nota adicionada!",
        });
      }

      default:
        return NextResponse.json({
          ok: false,
          message: "Comando não reconhecido.",
        });
    }
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 403 });
    }
    console.error("Voice command error:", error);
    return NextResponse.json({
      ok: false,
      message: "Erro interno ao processar comando.",
    });
  }
}
