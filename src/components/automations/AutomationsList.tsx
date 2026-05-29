"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Plus, Zap, Trash2, ToggleLeft, ToggleRight, ArrowRight } from "lucide-react";
import {
  createAutomationRule,
  toggleAutomationRule,
  deleteAutomationRule,
} from "@/lib/actions/automations";

type Rule = {
  id: string;
  name: string;
  trigger: string;
  triggerConfig: unknown;
  action: string;
  actionConfig: unknown;
  enabled: boolean;
};

const TRIGGER_LABELS: Record<string, string> = {
  task_status_changed: "Quando tarefa muda de status",
  task_overdue: "Quando tarefa atrasa",
  task_assigned: "Quando tarefa e atribuida",
  project_status_changed: "Quando projeto muda de status",
  kpi_threshold: "Quando KPI ultrapassa limite",
};

const ACTION_LABELS: Record<string, string> = {
  send_notification: "Enviar notificacao",
  send_whatsapp: "Enviar WhatsApp",
  change_status: "Mudar status",
  assign_user: "Atribuir usuario",
  create_activity: "Registrar atividade",
};

const TRIGGERS = Object.keys(TRIGGER_LABELS) as Array<keyof typeof TRIGGER_LABELS>;
const ACTIONS = Object.keys(ACTION_LABELS) as Array<keyof typeof ACTION_LABELS>;

export default function AutomationsList({
  initialRules,
}: {
  initialRules: Rule[];
}) {
  const [rules, setRules] = useState(initialRules);
  const [showAdd, setShowAdd] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [newRule, setNewRule] = useState({
    name: "",
    trigger: "task_status_changed" as "task_status_changed" | "task_overdue" | "task_assigned" | "project_status_changed" | "kpi_threshold",
    action: "send_notification" as "send_notification" | "send_whatsapp" | "change_status" | "assign_user" | "create_activity",
  });

  function handleCreate() {
    if (!newRule.name.trim()) return;
    startTransition(async () => {
      const rule = await createAutomationRule(newRule);
      if (rule) {
        setRules((prev) => [...prev, rule]);
        setNewRule({ name: "", trigger: "task_status_changed", action: "send_notification" });
        setShowAdd(false);
      }
    });
  }

  function handleToggle(ruleId: string, enabled: boolean) {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled } : r))
    );
    startTransition(() => {
      toggleAutomationRule(ruleId, enabled);
    });
  }

  function handleDelete(ruleId: string) {
    if (!confirm("Excluir esta automacao?")) return;
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
    startTransition(() => {
      deleteAutomationRule(ruleId);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-navy flex items-center gap-2">
            <Zap size={20} className="text-cyan" />
            Automacoes
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Regras automaticas: quando algo acontece → uma acao e executada
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg gradient-main text-white text-sm font-medium"
        >
          <Plus size={16} />
          Nova Regra
        </button>
      </div>

      {showAdd && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 p-5 space-y-4"
        >
          <input
            type="text"
            value={newRule.name}
            onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
            placeholder="Nome da automacao (ex: Notificar head quando tarefa atrasa)"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan/40"
            autoFocus
          />

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                Quando
              </label>
              <select
                value={newRule.trigger}
                onChange={(e) =>
                  setNewRule({ ...newRule, trigger: e.target.value as typeof newRule.trigger })
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              >
                {TRIGGERS.map((t) => (
                  <option key={t} value={t}>
                    {TRIGGER_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            <ArrowRight size={20} className="text-gray-300 mt-5 flex-shrink-0" />

            <div className="flex-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                Entao
              </label>
              <select
                value={newRule.action}
                onChange={(e) =>
                  setNewRule({ ...newRule, action: e.target.value as typeof newRule.action })
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              >
                {ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {ACTION_LABELS[a]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={isPending || !newRule.name.trim()}
              className="px-4 py-2 rounded-lg gradient-main text-white text-sm font-medium disabled:opacity-50"
            >
              Criar Regra
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

      {/* Rules list */}
      <div className="space-y-2">
        {rules.map((rule) => (
          <motion.div
            key={rule.id}
            layout
            className={`bg-white rounded-xl border p-4 flex items-center gap-4 transition-all ${
              rule.enabled ? "border-gray-100" : "border-gray-100 opacity-50"
            }`}
          >
            <button
              onClick={() => handleToggle(rule.id, !rule.enabled)}
              className="flex-shrink-0"
            >
              {rule.enabled ? (
                <ToggleRight size={28} className="text-green-500" />
              ) : (
                <ToggleLeft size={28} className="text-gray-300" />
              )}
            </button>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-navy">{rule.name}</p>
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[10px] font-medium">
                  {TRIGGER_LABELS[rule.trigger]}
                </span>
                <ArrowRight size={12} />
                <span className="bg-green-50 text-green-600 px-1.5 py-0.5 rounded text-[10px] font-medium">
                  {ACTION_LABELS[rule.action]}
                </span>
              </p>
            </div>

            <button
              onClick={() => handleDelete(rule.id)}
              className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </motion.div>
        ))}

        {rules.length === 0 && !showAdd && (
          <div className="text-center py-12">
            <Zap size={48} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Nenhuma automacao criada.</p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-2 text-sm text-cyan font-medium hover:underline"
            >
              Criar primeira regra
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
