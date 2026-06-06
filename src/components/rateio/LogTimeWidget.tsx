"use client";

import { useState, useTransition } from "react";
import { Clock, Loader2, Check } from "lucide-react";
import { logTime, type RateioContext } from "@/lib/actions/rateio";

const PRESETS = [30, 60, 120, 240];

export default function LogTimeWidget({
  projects,
}: {
  projects: RateioContext["projects"];
}) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [minutes, setMinutes] = useState(60);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!projectId || minutes <= 0) return;
    setMsg(null);
    startTransition(async () => {
      try {
        await logTime({ projectId, minutes, note: note || undefined });
        setMsg("Tempo lançado!");
        setNote("");
      } catch {
        setMsg("Erro ao lançar tempo.");
      }
    });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h3 className="text-sm font-bold text-navy mb-4 flex items-center gap-2">
        <Clock size={16} className="text-cyan" />
        Lançar tempo
      </h3>

      <div className="space-y-3">
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-cyan/40"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          {PRESETS.map((m) => (
            <button
              key={m}
              onClick={() => setMinutes(m)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${
                minutes === m
                  ? "bg-cyan/20 text-cyan"
                  : "bg-gray-50 text-gray-400 hover:bg-gray-100"
              }`}
            >
              {m >= 60 ? `${m / 60}h` : `${m}min`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="w-24 px-3 py-2 rounded-lg border border-gray-200 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-cyan/40"
          />
          <span className="text-xs text-gray-400">minutos</span>
        </div>

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nota (opcional)"
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-cyan/40"
        />

        <button
          onClick={submit}
          disabled={pending}
          className="w-full py-2.5 rounded-lg gradient-accent text-navy-dark text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          Lançar
        </button>

        {msg && (
          <p
            className={`text-xs text-center ${
              msg.includes("Erro") ? "text-red-500" : "text-green-600"
            }`}
          >
            {msg}
          </p>
        )}

        <p className="text-[11px] text-gray-400 text-center pt-1">
          Dica: pelo microfone diga <em>“lancei 2 horas no {projects[0]?.name ?? "projeto"}”</em>.
        </p>
      </div>
    </div>
  );
}
