import { getRecentActivity } from "@/lib/actions/activity";
import Header from "@/components/layout/Header";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const ACTION_LABELS: Record<string, string> = {
  created: "criou",
  updated: "atualizou",
  deleted: "excluiu",
  status_changed: "mudou status de",
  completed: "concluiu",
};

export default async function ActivityPage() {
  const activity = await getRecentActivity(50);

  return (
    <div className="min-h-screen">
      <Header title="Historico de Atividade" />

      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-100">
          {activity.map((entry, i) => (
            <div
              key={entry.id}
              className={`flex items-start gap-3 p-4 ${
                i < activity.length - 1 ? "border-b border-gray-50" : ""
              }`}
            >
              <div className="w-8 h-8 rounded-full gradient-accent flex items-center justify-center text-[10px] font-bold text-navy-dark flex-shrink-0 mt-0.5">
                {entry.userName
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">{entry.userName}</span>{" "}
                  <span className="text-gray-500">
                    {ACTION_LABELS[entry.action] || entry.action}
                  </span>{" "}
                  <span className="font-medium">{entry.entityType}</span>
                  {entry.details &&
                    typeof entry.details === "object" &&
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (entry.details as any).title && (
                      <span className="text-gray-500">
                        {" "}
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        &quot;{(entry.details as any).title}&quot;
                      </span>
                    )}
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
          {activity.length === 0 && (
            <p className="p-8 text-sm text-gray-400 text-center">
              Nenhuma atividade registrada.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
