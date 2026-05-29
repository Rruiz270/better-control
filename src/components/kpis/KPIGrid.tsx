"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Plus, Minus, TrendingUp, DollarSign, BarChart3, Users, X } from "lucide-react";
import { createKpi, updateKpi, deleteKpi } from "@/lib/actions/kpis";
import { KPI_CATEGORY_LABELS } from "@/lib/constants";

type Kpi = {
  id: string;
  name: string;
  category: string;
  type: string;
  targetValue: string | null;
  currentValue: string | null;
  unit: string | null;
  period: string | null;
  isCustom: boolean;
  projectId: string;
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  financial: DollarSign,
  operational: BarChart3,
  commercial: Users,
};

export default function KPIGrid({
  projectId,
  initialKpis,
}: {
  projectId: string;
  initialKpis: Kpi[];
}) {
  const [kpiList, setKpiList] = useState(initialKpis);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [newKpi, setNewKpi] = useState({
    name: "",
    category: "financial" as "financial" | "operational" | "commercial",
    type: "number" as "currency" | "percentage" | "number" | "ratio",
    targetValue: "",
    unit: "",
  });

  function handleAdd() {
    if (!newKpi.name.trim()) return;
    startTransition(async () => {
      const kpi = await createKpi({
        projectId,
        name: newKpi.name,
        category: newKpi.category,
        type: newKpi.type,
        targetValue: newKpi.targetValue || undefined,
        unit: newKpi.unit || undefined,
      });
      if (kpi) {
        setKpiList((prev) => [...prev, kpi]);
        setNewKpi({ name: "", category: "financial", type: "number", targetValue: "", unit: "" });
        setShowAdd(false);
      }
    });
  }

  function handleDelete(kpiId: string) {
    if (!confirm("Remover este KPI?")) return;
    startTransition(async () => {
      await deleteKpi(kpiId);
      setKpiList((prev) => prev.filter((k) => k.id !== kpiId));
    });
  }

  function handleUpdateValue(kpiId: string, value: string) {
    startTransition(async () => {
      await updateKpi(kpiId, { currentValue: value });
      setKpiList((prev) =>
        prev.map((k) => (k.id === kpiId ? { ...k, currentValue: value } : k))
      );
      setEditingId(null);
    });
  }

  function formatValue(kpi: Kpi, value: string | null) {
    if (!value) return "—";
    const num = Number(value);
    if (kpi.type === "currency") return `R$ ${num.toLocaleString("pt-BR")}`;
    if (kpi.type === "percentage") return `${num}%`;
    return num.toLocaleString("pt-BR");
  }

  function getProgress(kpi: Kpi) {
    if (!kpi.targetValue || !kpi.currentValue) return 0;
    return Math.min(100, Math.round((Number(kpi.currentValue) / Number(kpi.targetValue)) * 100));
  }

  const grouped = {
    financial: kpiList.filter((k) => k.category === "financial"),
    operational: kpiList.filter((k) => k.category === "operational"),
    commercial: kpiList.filter((k) => k.category === "commercial"),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
          {kpiList.length} KPIs
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg gradient-main text-white text-sm font-medium"
          >
            <Plus size={16} />
            Adicionar
          </button>
        </div>
      </div>

      {showAdd && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 p-4 space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Nome do KPI"
              value={newKpi.name}
              onChange={(e) => setNewKpi({ ...newKpi, name: e.target.value })}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan/40"
              autoFocus
            />
            <select
              value={newKpi.category}
              onChange={(e) =>
                setNewKpi({ ...newKpi, category: e.target.value as "financial" | "operational" | "commercial" })
              }
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
            >
              <option value="financial">Financeiro</option>
              <option value="operational">Operacional</option>
              <option value="commercial">Comercial</option>
            </select>
            <select
              value={newKpi.type}
              onChange={(e) =>
                setNewKpi({ ...newKpi, type: e.target.value as "currency" | "percentage" | "number" | "ratio" })
              }
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
            >
              <option value="currency">Moeda (R$)</option>
              <option value="percentage">Porcentagem (%)</option>
              <option value="number">Numero</option>
              <option value="ratio">Razao</option>
            </select>
            <input
              type="number"
              placeholder="Meta (target)"
              value={newKpi.targetValue}
              onChange={(e) => setNewKpi({ ...newKpi, targetValue: e.target.value })}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan/40"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={isPending || !newKpi.name.trim()}
              className="px-4 py-2 rounded-lg gradient-main text-white text-sm font-medium disabled:opacity-50"
            >
              Criar KPI
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-500 text-sm"
            >
              Cancelar
            </button>
          </div>
        </motion.div>
      )}

      {(Object.entries(grouped) as [string, Kpi[]][]).map(
        ([category, items]) =>
          items.length > 0 && (
            <section key={category}>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                {(() => {
                  const Icon = CATEGORY_ICONS[category] || BarChart3;
                  return <Icon size={14} />;
                })()}
                {KPI_CATEGORY_LABELS[category]}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {items.map((kpi) => {
                  const progress = getProgress(kpi);
                  return (
                    <motion.div
                      key={kpi.id}
                      layout
                      className="bg-white rounded-xl border border-gray-100 p-4 relative group"
                    >
                      <button
                        onClick={() => handleDelete(kpi.id)}
                        className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all"
                      >
                        <Minus size={14} />
                      </button>

                      <p className="text-xs text-gray-400 mb-1">{kpi.name}</p>

                      {editingId === kpi.id ? (
                        <input
                          type="number"
                          defaultValue={kpi.currentValue || ""}
                          autoFocus
                          onBlur={(e) => handleUpdateValue(kpi.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdateValue(kpi.id, (e.target as HTMLInputElement).value);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="w-full text-xl font-bold text-navy px-2 py-1 rounded border border-cyan/40 focus:outline-none"
                        />
                      ) : (
                        <p
                          className="text-xl font-bold text-navy cursor-pointer hover:text-cyan transition-colors"
                          onClick={() => setEditingId(kpi.id)}
                        >
                          {formatValue(kpi, kpi.currentValue)}
                        </p>
                      )}

                      {kpi.targetValue && (
                        <>
                          <p className="text-xs text-gray-400 mt-1">
                            Meta: {formatValue(kpi, kpi.targetValue)}
                          </p>
                          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                progress >= 100
                                  ? "bg-green"
                                  : progress >= 70
                                    ? "bg-cyan"
                                    : "bg-amber-400"
                              }`}
                              style={{ width: `${Math.min(100, progress)}%` }}
                            />
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <TrendingUp size={10} className="text-gray-400" />
                            <span className="text-xs text-gray-400">
                              {progress}%
                            </span>
                          </div>
                        </>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )
      )}

      {kpiList.length === 0 && !showAdd && (
        <p className="text-sm text-gray-400 text-center py-8">
          Nenhum KPI definido. Clique em + para adicionar.
        </p>
      )}
    </div>
  );
}
