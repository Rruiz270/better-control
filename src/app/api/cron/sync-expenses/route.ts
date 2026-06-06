import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin, type SessionUser } from "@/lib/policy";
import { runExpensesSync } from "@/lib/expensesSync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Cron diário da Vercel (ou disparo manual por admin). A Vercel envia
// `Authorization: Bearer ${CRON_SECRET}` quando CRON_SECRET está no env.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const fromCron = secret && authHeader === `Bearer ${secret}`;

  if (!fromCron) {
    const session = await auth();
    if (!session?.user || !isAdmin(session.user as SessionUser)) {
      return NextResponse.json({ ok: false, message: "Não autorizado" }, { status: 401 });
    }
  }

  try {
    const result = await runExpensesSync(2026);
    return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() });
  } catch (e) {
    console.error("sync-expenses error:", e);
    return NextResponse.json({ ok: false, message: (e as Error).message }, { status: 500 });
  }
}
