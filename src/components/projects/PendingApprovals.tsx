"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Check, X, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { decideProject } from "@/lib/actions/projects";

type Pending = {
  id: string; name: string; areaName: string | null; reason: string | null;
  revenue: string | null; cost: string | null; requester: string | null;
};

export default function PendingApprovals({ pending }: { pending: Pending[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();
  if (!pending.length) return null;

  function decide(id: string, decision: "approved" | "rejected") {
    setBusy(id);
    start(async () => {
      try { await decideProject(id, decision); router.refresh(); } finally { setBusy(null); }
    });
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <BellRing size={16} className="text-amber-600" />
        <h3 className="text-sm font-bold text-amber-800">{pending.length} projeto(s) aguardando sua aprovação</h3>
      </div>
      <div className="space-y-2">
        {pending.map((p) => {
          const margin = (Number(p.revenue) || 0) - (Number(p.cost) || 0);
          return (
            <div key={p.id} className="bg-white rounded-lg border border-amber-100 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-navy">{p.name} <span className="text-xs font-normal text-gray-400">· {p.areaName}</span></p>
                  <p className="text-xs text-gray-500">por {p.requester ?? "—"}</p>
                  {p.reason && <p className="text-xs text-gray-600 mt-1 italic">“{p.reason}”</p>}
                  {(p.revenue || p.cost) && (
                    <p className="text-xs text-gray-500 mt-1 flex gap-3">
                      <span className="flex items-center gap-1"><TrendingUp size={11} className="text-green-500" />R$ {Math.round(Number(p.revenue) || 0).toLocaleString("pt-BR")}</span>
                      <span className="flex items-center gap-1"><TrendingDown size={11} className="text-red-500" />R$ {Math.round(Number(p.cost) || 0).toLocaleString("pt-BR")}</span>
                      <span>margem <b className={margin < 0 ? "text-red-600" : "text-green-700"}>R$ {Math.round(margin).toLocaleString("pt-BR")}</b></span>
                    </p>
                  )}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => decide(p.id, "approved")} disabled={busy === p.id} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green/15 text-green text-xs font-bold hover:bg-green/25">{busy === p.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}Aprovar</button>
                  <button onClick={() => decide(p.id, "rejected")} disabled={busy === p.id} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-bold hover:bg-red-100"><X size={12} />Recusar</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
