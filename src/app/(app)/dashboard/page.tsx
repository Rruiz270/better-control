import { auth } from "@/lib/auth";
import { getDashboardStats } from "@/lib/actions/areas";
import { getRecentActivity } from "@/lib/actions/activity";
import AreaHighlightCard, {
  AreaSmallCard,
} from "@/components/dashboard/AreaHighlightCard";
import Header from "@/components/layout/Header";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default async function DashboardPage() {
  const session = await auth();
  const stats = await getDashboardStats();
  const activity = await getRecentActivity(10);

  const [featured, ...others] = stats;
  const userName = session?.user?.name?.split(" ")[0] || "Usuario";

  return (
    <div className="min-h-screen">
      <Header title={`Ola, ${userName}`} />

      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        {featured && <AreaHighlightCard area={featured} />}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {others.map((area) => (
            <AreaSmallCard key={area.id} area={area} />
          ))}
        </div>

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
