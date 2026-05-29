import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks, projects, areas, notes, activityLog } from "@/db/schema";
import { eq, ilike, and } from "drizzle-orm";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Nao autorizado" }, { status: 401 });
  }

  const { command } = await req.json();
  const userId = session.user.id;

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

        if (!projectId) {
          const allProjects = await db.select().from(projects).limit(1);
          projectId = allProjects[0]?.id || null;
        }

        if (!projectId) {
          return NextResponse.json({
            ok: false,
            message: "Nenhum projeto encontrado.",
          });
        }

        const [task] = await db
          .insert(tasks)
          .values({
            projectId,
            title: command.title,
            priority: command.priority || "media",
            createdBy: userId,
          })
          .returning();

        await db.insert(activityLog).values({
          userId,
          entityType: "task",
          entityId: task.id,
          action: "created",
          details: { title: task.title, via: "voice" },
        });

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

        if (!areaId) {
          const allAreas = await db.select().from(areas).limit(1);
          areaId = allAreas[0]?.id || null;
        }

        if (!areaId) {
          return NextResponse.json({
            ok: false,
            message: "Nenhuma area encontrada.",
          });
        }

        const slug = command.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

        const [proj] = await db
          .insert(projects)
          .values({
            areaId,
            name: command.name,
            slug: slug || `projeto-${Date.now()}`,
            createdBy: userId,
          })
          .returning();

        await db.insert(activityLog).values({
          userId,
          entityType: "project",
          entityId: proj.id,
          action: "created",
          details: { name: command.name, via: "voice" },
        });

        return NextResponse.json({
          ok: true,
          message: `Projeto "${command.name}" criado!`,
        });
      }

      case "update_task": {
        const [task] = await db
          .select()
          .from(tasks)
          .where(ilike(tasks.title, `%${command.title}%`))
          .limit(1);

        if (!task) {
          return NextResponse.json({
            ok: false,
            message: `Tarefa "${command.title}" nao encontrada.`,
          });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updates: any = {
          status: command.status,
          updatedAt: new Date(),
        };
        if (command.status === "concluida") updates.completedAt = new Date();

        await db.update(tasks).set(updates).where(eq(tasks.id, task.id));

        await db.insert(activityLog).values({
          userId,
          entityType: "task",
          entityId: task.id,
          action: "status_changed",
          details: { title: task.title, newStatus: command.status, via: "voice" },
        });

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

        if (!entityId) {
          const allProjects = await db.select().from(projects).limit(1);
          entityId = allProjects[0]?.id || null;
        }

        if (!entityId) {
          return NextResponse.json({ ok: false, message: "Projeto nao encontrado." });
        }

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
          message: "Comando nao reconhecido.",
        });
    }
  } catch (error) {
    console.error("Voice command error:", error);
    return NextResponse.json({
      ok: false,
      message: "Erro interno ao processar comando.",
    });
  }
}
