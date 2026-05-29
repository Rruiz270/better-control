import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
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

  const user = session.user as { name: string; role: string };

  return (
    <SessionProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar userName={user.name} userRole={user.role} />
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
        <MobileBottomNav />
        <VoiceAssistant />
      </div>
    </SessionProvider>
  );
}
