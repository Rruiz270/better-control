import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import Sidebar from "@/components/layout/Sidebar";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import SessionProvider from "@/components/layout/SessionProvider";
import VoiceAssistant from "@/components/voice/VoiceAssistant";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { id: string; name: string; role: string };
  // Força a troca de senha no 1º login (senha temporária). /change-password fica
  // fora deste layout, então não há loop de redirect.
  const [u] = await db.select({ mustChange: users.mustChangePassword }).from(users).where(eq(users.id, user.id)).limit(1);
  if (u?.mustChange) redirect("/change-password");

  return (
    <SessionProvider>
      {/* App-shell de altura fixa: a casca ocupa exatamente a viewport e SÓ o
          <main> rola. Sidebar e header ficam fixos (não "desce a página inteira"). */}
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar userName={user.name} userRole={user.role} />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">{children}</main>
        <MobileBottomNav />
        <VoiceAssistant />
      </div>
    </SessionProvider>
  );
}
