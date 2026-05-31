"use client";

import { useState, useTransition } from "react";
import { Save, Loader2, Check } from "lucide-react";
import { updateAreaConfig } from "@/lib/actions/areas";

type Area = {
  id: string;
  name: string;
  profile: "receita" | "suporte";
  targetMultiplier: string;
};

function AreaRow({ area }: { area: Area }) {
  const [profile, setProfile] = useState<"receita" | "suporte">(area.profile);
  const [multiplier, setMultiplier] = useState(area.targetMultiplier);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const dirty = profile !== area.profile || multiplier !== area.targetMultiplier;

  function save() {
    startTransition(async () => {
      await updateAreaConfig(area.id, { profile, targetMultiplier: Number(multiplier) || 0 });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  return (
    <div className="flex items-center gap-3 py-3 border-t border-gray-100 first:border-t-0">
      <span className="flex-1 text-sm font-medium text-navy">{area.name}</span>
      <select
        value={profile}
        onChange={(e) => setProfile(e.target.value as "receita" | "suporte")}
        className="px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
      >
        <option value="receita">Receita</option>
        <option value="suporte">Custo/Entrega</option>
      </select>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={multiplier}
          onChange={(e) => setMultiplier(e.target.value)}
          className="w-16 text-right px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
        />
        <span className="text-xs text-gray-400">x</span>
      </div>
      <button
        onClick={save}
        disabled={!dirty || isPending}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg gradient-main text-white text-xs font-medium disabled:opacity-40"
      >
        {isPending ? (
          <Loader2 size={12} className="animate-spin" />
        ) : saved ? (
          <Check size={12} />
        ) : (
          <Save size={12} />
        )}
        {saved ? "Salvo" : "Salvar"}
      </button>
    </div>
  );
}

export default function AreaConfigPanel({ areas }: { areas: Area[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h3 className="text-sm font-bold text-navy mb-1">Configuração de Áreas</h3>
      <p className="text-xs text-gray-400 mb-3">
        Perfil define se a área usa Forecast (Receita) ou Valor Gerado manual (Custo/Entrega). O
        multiplicador é a meta da regra 30x (valor gerado ÷ custo).
      </p>
      {areas.map((area) => (
        <AreaRow key={area.id} area={area} />
      ))}
    </div>
  );
}
