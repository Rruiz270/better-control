"use client";

import { useState, useMemo, useTransition } from "react";
import { Users, Package, Search } from "lucide-react";
import { assignSupplierCostCenter, assignSupplierArea, type SupplierRow } from "@/lib/actions/expenses";

type Opt = { id: string; name: string; color: string };

const brl = (n: number) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;

export default function ExpenseLedger({
  suppliers,
  costCenters,
  verticais,
  total,
  year,
}: {
  suppliers: SupplierRow[];
  costCenters: Opt[];
  verticais: Opt[];
  total: number;
  year: number;
}) {
  const [rows, setRows] = useState(suppliers);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "pessoa" | "fornecedor">("all");
  const [, startTransition] = useTransition();

  const arById = useMemo(() => new Map(verticais.map((a) => [a.id, a])), [verticais]);
  // Resumo por vertical (a dimensão "de quem é o custo").
  const areaTotal = useMemo(() => {
    const m = new Map<string | null, number>();
    for (const r of rows) m.set(r.areaId, (m.get(r.areaId) ?? 0) + r.total);
    return m;
  }, [rows]);

  const filtered = rows.filter(
    (r) =>
      (kind === "all" || r.kind === kind) &&
      (r.name.toLowerCase().includes(q.toLowerCase()) || (r.taxId ?? "").includes(q))
  );

  function setCategoria(entityKey: string, costCenterId: string) {
    const cc = costCenterId || null;
    setRows((prev) => prev.map((r) => (r.entityKey === entityKey ? { ...r, costCenterId: cc } : r)));
    startTransition(async () => { try { await assignSupplierCostCenter(entityKey, cc); } catch {} });
  }
  function setVertical(entityKey: string, areaId: string) {
    const a = areaId || null;
    setRows((prev) => prev.map((r) => (r.entityKey === entityKey ? { ...r, areaId: a } : r)));
    startTransition(async () => { try { await assignSupplierArea(entityKey, a); } catch {} });
  }

  return (
    <div className="space-y-5">
      {/* Resumo por VERTICAL */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {verticais.map((a) => (
          <div key={a.id} className="bg-white rounded-xl border border-gray-100 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.color }} />
              <span className="text-[10px] font-bold text-gray-400 uppercase truncate">{a.name}</span>
            </div>
            <p className="text-base font-bold text-navy">{brl(areaTotal.get(a.id) ?? 0)}</p>
          </div>
        ))}
        <div className="bg-amber-50 rounded-xl border border-amber-100 p-3">
          <span className="text-[10px] font-bold text-amber-500 uppercase">Sem vertical</span>
          <p className="text-base font-bold text-amber-600">{brl(areaTotal.get(null) ?? 0)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar fornecedor, pessoa ou CNPJ…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan/40"
          />
        </div>
        {(["all", "pessoa", "fornecedor"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`px-3 py-2 rounded-lg text-xs font-bold ${kind === k ? "bg-navy text-white" : "bg-gray-50 text-gray-500"}`}
          >
            {k === "all" ? "Todos" : k === "pessoa" ? "Pessoas" : "Fornecedores"}
          </button>
        ))}
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} de {rows.length} · total {brl(total)}</span>
      </div>

      {/* Lista — 2 dimensões: Vertical + Categoria */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase">
          <span className="col-span-5">Fornecedor / Pessoa</span>
          <span className="col-span-2 text-right">Total {year}</span>
          <span className="col-span-2">Vertical</span>
          <span className="col-span-3">Categoria</span>
        </div>
        {filtered.map((r, i) => (
          <div key={r.entityKey} className={`grid grid-cols-1 md:grid-cols-12 gap-2 px-4 py-2.5 md:items-center ${i < filtered.length - 1 ? "border-b border-gray-50" : ""}`}>
            <div className="col-span-5 flex items-center gap-2 min-w-0">
              {r.kind === "pessoa" ? <Users size={14} className="text-cyan flex-shrink-0" /> : <Package size={14} className="text-gray-300 flex-shrink-0" />}
              <span className="text-sm text-navy truncate">{r.name}</span>
              {r.taxId && <span className="text-[10px] text-gray-300 flex-shrink-0">{r.taxId}</span>}
            </div>
            <span className="col-span-2 text-right text-sm font-bold text-navy tnum">{brl(r.total)}</span>
            <div className="col-span-2">
              <select
                value={r.areaId ?? ""}
                onChange={(e) => setVertical(r.entityKey, e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-cyan/40"
                style={r.areaId ? { borderColor: arById.get(r.areaId)?.color } : {}}
              >
                <option value="">— vertical —</option>
                {verticais.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
              </select>
            </div>
            <div className="col-span-3">
              <select
                value={r.costCenterId ?? ""}
                onChange={(e) => setCategoria(r.entityKey, e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-cyan/40"
              >
                <option value="">— categoria —</option>
                {costCenters.map((cc) => (<option key={cc.id} value={cc.id}>{cc.name}</option>))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
