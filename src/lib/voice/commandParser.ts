export type VoiceCommand =
  | { type: "create_task"; project?: string; title: string; priority?: string }
  | { type: "create_project"; area?: string; name: string }
  | { type: "update_task"; title: string; status: string }
  | { type: "add_note"; project?: string; content: string }
  | { type: "navigate"; destination: string }
  | { type: "unknown"; raw: string };

const STATUS_MAP: Record<string, string> = {
  "nao vai sair": "bloqueada",
  "nao vai acontecer": "cancelada",
  "esta bloqueada": "bloqueada",
  "esta atrasada": "bloqueada",
  "foi concluida": "concluida",
  concluida: "concluida",
  concluiu: "concluida",
  terminou: "concluida",
  terminei: "concluida",
  finalizou: "concluida",
  "comecou": "em_andamento",
  "comecei": "em_andamento",
  "iniciei": "em_andamento",
  "em andamento": "em_andamento",
  "pausar": "bloqueada",
  "pausada": "bloqueada",
  cancelar: "cancelada",
  cancelada: "cancelada",
};

const PRIORITY_MAP: Record<string, string> = {
  critica: "critica",
  urgente: "critica",
  alta: "alta",
  importante: "alta",
  media: "media",
  normal: "media",
  baixa: "baixa",
};

const NAV_MAP: Record<string, string> = {
  dashboard: "/dashboard",
  inicio: "/dashboard",
  home: "/dashboard",
  areas: "/areas",
  tarefas: "/tasks",
  relatorios: "/reports",
  equipe: "/team",
  atividade: "/activity",
  configuracoes: "/settings",
  idiomas: "/areas/idiomas",
  tech: "/areas/tech",
  edtech: "/areas/edtech",
  "instituto i10": "/areas/i10",
  i10: "/areas/i10",
};

export function parseVoiceCommand(raw: string): VoiceCommand {
  const text = raw.toLowerCase().trim()
    .replace(/hello better\s*/i, "")
    .replace(/olá better\s*/i, "")
    .replace(/oi better\s*/i, "")
    .trim();

  if (!text) return { type: "unknown", raw };

  // Create task: "crie tarefa X no projeto Y" / "nova tarefa X" / "adicione tarefa X"
  const createTaskMatch = text.match(
    /(?:cri[ea]|nova|adicion[ea]|coloque?)\s+(?:uma?\s+)?tarefa\s+(.+?)(?:\s+(?:no|do|da|para o?|para a?)\s+(?:projeto\s+)?(.+))?$/
  );
  if (createTaskMatch) {
    let title = createTaskMatch[1].trim();
    const project = createTaskMatch[2]?.trim();
    let priority: string | undefined;
    for (const [key, val] of Object.entries(PRIORITY_MAP)) {
      if (title.includes(key)) {
        priority = val;
        title = title.replace(key, "").trim();
      }
    }
    return { type: "create_task", title, project, priority };
  }

  // Create project: "crie projeto X na area Y" / "novo projeto X"
  const createProjectMatch = text.match(
    /(?:cri[ea]|novo|adicion[ea])\s+(?:um?\s+)?projeto\s+(.+?)(?:\s+(?:na|no|da|do|em)\s+(?:area\s+)?(.+))?$/
  );
  if (createProjectMatch) {
    return {
      type: "create_project",
      name: createProjectMatch[1].trim(),
      area: createProjectMatch[2]?.trim(),
    };
  }

  // Update task status: "a tarefa X nao vai sair" / "tarefa X concluida"
  for (const [phrase, status] of Object.entries(STATUS_MAP)) {
    const updateMatch = text.match(
      new RegExp(`(?:a?\s*tarefa\s+(.+?)\s+${phrase}|(.+?)\s+${phrase})`)
    );
    if (updateMatch) {
      const title = (updateMatch[1] || updateMatch[2] || "").trim();
      if (title) return { type: "update_task", title, status };
    }
  }

  // Shortcut: "coloque que hoje a tarefa X nao vai sair"
  const coloqueMatch = text.match(
    /coloque?\s+que?\s+(?:hoje\s+)?(?:a\s+)?tarefa\s+(.+?)\s+(nao vai sair|nao vai acontecer|esta bloqueada|foi concluida|concluida|em andamento|cancelada|pausada)/
  );
  if (coloqueMatch) {
    return {
      type: "update_task",
      title: coloqueMatch[1].trim(),
      status: STATUS_MAP[coloqueMatch[2]] || "bloqueada",
    };
  }

  // Add note: "anote X" / "nota X" / "adicione nota X"
  const noteMatch = text.match(
    /(?:anot[ea]|not[ea]|adicion[ea]\s+(?:uma?\s+)?not[ea])\s+(.+?)(?:\s+(?:no|do|da)\s+(?:projeto\s+)?(.+))?$/
  );
  if (noteMatch) {
    return {
      type: "add_note",
      content: noteMatch[1].trim(),
      project: noteMatch[2]?.trim(),
    };
  }

  // Navigate: "abra X" / "ir para X" / "mostra X"
  const navMatch = text.match(
    /(?:abr[ea]|ir\s+para|mostr[ea]|vai\s+para|v[aá]\s+para)\s+(?:o?\s*|a?\s*)(.+)/
  );
  if (navMatch) {
    const dest = navMatch[1].trim();
    for (const [key, path] of Object.entries(NAV_MAP)) {
      if (dest.includes(key)) return { type: "navigate", destination: path };
    }
  }

  // Direct navigation keywords
  for (const [key, path] of Object.entries(NAV_MAP)) {
    if (text === key) return { type: "navigate", destination: path };
  }

  return { type: "unknown", raw };
}
