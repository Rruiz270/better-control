export const PROJECT_STATUS_LABELS: Record<string, string> = {
  planejamento: "Planejamento",
  em_execucao: "Em Execucao",
  pausado: "Pausado",
  concluido: "Concluido",
  descontinuado: "Descontinuado",
};

export const PROJECT_STATUS_COLORS: Record<string, string> = {
  planejamento: "bg-blue-100 text-blue-700",
  em_execucao: "bg-green-100 text-green-700",
  pausado: "bg-amber-100 text-amber-700",
  concluido: "bg-gray-100 text-gray-600",
  descontinuado: "bg-red-100 text-red-600",
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  nao_iniciada: "Nao Iniciada",
  em_andamento: "Em Andamento",
  concluida: "Concluida",
  bloqueada: "Bloqueada",
  cancelada: "Cancelada",
};

export const TASK_PRIORITY_LABELS: Record<string, string> = {
  critica: "Critica",
  alta: "Alta",
  media: "Media",
  baixa: "Baixa",
};

export const TASK_PRIORITY_COLORS: Record<string, string> = {
  critica: "bg-red-100 text-red-700",
  alta: "bg-orange-100 text-orange-700",
  media: "bg-blue-100 text-blue-700",
  baixa: "bg-gray-100 text-gray-600",
};

export const KPI_CATEGORY_LABELS: Record<string, string> = {
  financial: "Financeiro",
  operational: "Operacional",
  commercial: "Comercial",
};

export const AREA_CONFIGS: Record<
  string,
  { color: string; icon: string; gradient: string }
> = {
  idiomas: {
    color: "#3B82F6",
    icon: "Languages",
    gradient: "from-blue-600 to-blue-400",
  },
  tech: {
    color: "#8B5CF6",
    icon: "Code",
    gradient: "from-purple-600 to-purple-400",
  },
  edtech: {
    color: "#F59E0B",
    icon: "GraduationCap",
    gradient: "from-amber-500 to-amber-400",
  },
  i10: {
    color: "#00B4D8",
    icon: "Building2",
    gradient: "from-cyan to-green",
  },
};
