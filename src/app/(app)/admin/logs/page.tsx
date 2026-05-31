export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdmin, type SessionUser } from "@/lib/policy";
import Header from "@/components/layout/Header";
import AuditLog from "@/components/admin/AuditLog";
import { getAuditLog } from "@/lib/actions/activity";

export default async function AdminLogsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!isAdmin(session.user as SessionUser)) redirect("/dashboard");

  const entries = await getAuditLog(300);

  return (
    <div className="min-h-screen">
      <Header title="Admin · Logs de Mudanças" />
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <AuditLog entries={entries} />
      </div>
    </div>
  );
}
