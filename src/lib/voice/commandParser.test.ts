import { describe, it, expect } from "vitest";
import { parseVoiceCommand, parseDuration } from "./commandParser";

describe("parseDuration", () => {
  it("converte horas para minutos", () => {
    expect(parseDuration("2 horas")).toBe(120);
    expect(parseDuration("1,5 hora")).toBe(90);
  });
  it("entende minutos, 'meia hora' e formato 1h30", () => {
    expect(parseDuration("90 minutos")).toBe(90);
    expect(parseDuration("meia hora")).toBe(30);
    expect(parseDuration("1h30")).toBe(90);
  });
  it("retorna null sem duração", () => {
    expect(parseDuration("no projeto community")).toBeNull();
  });
});

describe("parseVoiceCommand — log_time", () => {
  it("lança tempo com projeto", () => {
    const cmd = parseVoiceCommand("lancei 2 horas no projeto Portal do Aluno");
    expect(cmd).toMatchObject({ type: "log_time", minutes: 120, project: "portal do aluno" });
  });
  it("entende 'registra 90 minutos no Radar 360'", () => {
    const cmd = parseVoiceCommand("registra 90 minutos no Radar 360");
    expect(cmd).toMatchObject({ type: "log_time", minutes: 90, project: "radar 360" });
  });
  it("entende 'gastei meia hora em Community'", () => {
    const cmd = parseVoiceCommand("gastei meia hora em Community");
    expect(cmd).toMatchObject({ type: "log_time", minutes: 30, project: "community" });
  });
});

describe("parseVoiceCommand", () => {
  it("creates a task with a project", () => {
    const cmd = parseVoiceCommand("crie tarefa revisar contrato no projeto Community");
    expect(cmd).toMatchObject({
      type: "create_task",
      title: "revisar contrato",
      project: "community",
    });
  });

  it("extracts priority and strips it from the title", () => {
    const cmd = parseVoiceCommand("crie tarefa urgente revisar contrato");
    expect(cmd).toMatchObject({ type: "create_task", priority: "critica" });
    if (cmd.type === "create_task") {
      expect(cmd.title).not.toContain("urgente");
      expect(cmd.title).toContain("revisar contrato");
    }
  });

  it("creates a project in an area", () => {
    const cmd = parseVoiceCommand("novo projeto Espanhol na area Idiomas");
    expect(cmd).toMatchObject({
      type: "create_project",
      name: "espanhol",
      area: "idiomas",
    });
  });

  // Regression guard: the status regex was built with a template literal where
  // "\s" decayed to the literal letter "s", so EVERY status update silently
  // failed to match. This must keep parsing.
  it("updates task status (the \\s regression case)", () => {
    const cmd = parseVoiceCommand("tarefa relatorio concluida");
    expect(cmd).toMatchObject({
      type: "update_task",
      title: "relatorio",
      status: "concluida",
    });
  });

  it("maps a blocked phrase to the bloqueada status", () => {
    const cmd = parseVoiceCommand("a tarefa onboarding nao vai sair");
    expect(cmd).toMatchObject({ type: "update_task", status: "bloqueada" });
  });

  it("adds a note", () => {
    const cmd = parseVoiceCommand("anote reuniao foi produtiva");
    expect(cmd.type).toBe("add_note");
  });

  it("navigates by keyword", () => {
    const cmd = parseVoiceCommand("abra dashboard");
    expect(cmd).toMatchObject({ type: "navigate", destination: "/dashboard" });
  });

  it("strips the wake word", () => {
    const cmd = parseVoiceCommand("Hello Better crie tarefa teste");
    expect(cmd).toMatchObject({ type: "create_task", title: "teste" });
  });

  it("returns unknown for gibberish", () => {
    expect(parseVoiceCommand("xpto aleatorio sem sentido").type).toBe("unknown");
  });
});
