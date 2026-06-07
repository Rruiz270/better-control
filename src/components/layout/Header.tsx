"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, RefreshCw } from "lucide-react";

// Cron diário do sync (Vercel) — 06:00 UTC. O countdown aponta p/ a próxima rodada.
const CRON_UTC_HOUR = 6;

function nextSync(): Date {
  const now = new Date();
  const n = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), CRON_UTC_HOUR, 0, 0));
  if (n.getTime() <= now.getTime()) n.setUTCDate(n.getUTCDate() + 1);
  return n;
}

function SyncCountdown() {
  const [left, setLeft] = useState("");
  useEffect(() => {
    const tick = () => {
      const ms = nextSync().getTime() - Date.now();
      const h = Math.floor(ms / 3.6e6);
      const m = Math.floor((ms % 3.6e6) / 6e4);
      const s = Math.floor((ms % 6e4) / 1000);
      setLeft(`${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span
      className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5"
      title="Despesas e os indicadores dos cockpits/DRE são sincronizados da OMIE/Vindi/BMA pelo cron diário (06:00 UTC). As telas de listagem já são ao vivo a cada acesso."
    >
      <RefreshCw size={12} className="text-cyan" />
      Próxima atualização em <b className="text-navy tabular-nums">{left}</b>
    </span>
  );
}

export default function Header({ title }: { title?: string }) {
  const pathname = usePathname();
  const isFinanceiro = pathname.startsWith("/financeiro") || pathname.startsWith("/despesas");

  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
      <h1 className="text-lg font-bold text-navy tracking-tight">
        {title || "Better Control"}
      </h1>
      <div className="flex items-center gap-2">
        {isFinanceiro && <SyncCountdown />}
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell size={20} className="text-gray-500" />
        </button>
      </div>
    </header>
  );
}
