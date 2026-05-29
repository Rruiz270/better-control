"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { parseVoiceCommand, type VoiceCommand } from "@/lib/voice/commandParser";

type FeedbackState = {
  status: "idle" | "listening" | "processing" | "success" | "error";
  message: string;
  transcript: string;
};

export default function VoiceAssistant() {
  const router = useRouter();
  const [state, setState] = useState<FeedbackState>({
    status: "idle",
    message: "",
    transcript: "",
  });
  const [showOverlay, setShowOverlay] = useState(false);
  const recognitionRef = useRef<ReturnType<typeof createRecognition> | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  function createRecognition() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const SpeechAPI = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechAPI) return null;
    const r = new SpeechAPI();
    r.lang = "pt-BR";
    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 1;
    return r;
  }

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const executeCommand = useCallback(
    async (cmd: VoiceCommand) => {
      setState((s) => ({ ...s, status: "processing", message: "Processando..." }));

      try {
        switch (cmd.type) {
          case "create_task": {
            const res = await fetch("/api/voice/execute", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ command: cmd }),
            });
            const data = await res.json();
            setState((s) => ({
              ...s,
              status: "success",
              message: data.message || `Tarefa "${cmd.title}" criada!`,
            }));
            setTimeout(() => router.refresh(), 1000);
            break;
          }
          case "create_project": {
            const res = await fetch("/api/voice/execute", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ command: cmd }),
            });
            const data = await res.json();
            setState((s) => ({
              ...s,
              status: "success",
              message: data.message || `Projeto "${cmd.name}" criado!`,
            }));
            setTimeout(() => router.refresh(), 1000);
            break;
          }
          case "update_task": {
            const res = await fetch("/api/voice/execute", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ command: cmd }),
            });
            const data = await res.json();
            setState((s) => ({
              ...s,
              status: data.ok ? "success" : "error",
              message: data.message,
            }));
            if (data.ok) setTimeout(() => router.refresh(), 1000);
            break;
          }
          case "add_note": {
            const res = await fetch("/api/voice/execute", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ command: cmd }),
            });
            const data = await res.json();
            setState((s) => ({
              ...s,
              status: "success",
              message: data.message || "Nota adicionada!",
            }));
            break;
          }
          case "navigate":
            setState((s) => ({
              ...s,
              status: "success",
              message: `Navegando...`,
            }));
            router.push(cmd.destination);
            break;
          case "unknown":
            setState((s) => ({
              ...s,
              status: "error",
              message: `Nao entendi: "${cmd.raw}"`,
            }));
            break;
        }
      } catch {
        setState((s) => ({
          ...s,
          status: "error",
          message: "Erro ao executar comando.",
        }));
      }

      setTimeout(() => {
        setShowOverlay(false);
        setState({ status: "idle", message: "", transcript: "" });
      }, 2500);
    },
    [router]
  );

  const startListening = useCallback(() => {
    const recognition = createRecognition();
    if (!recognition) {
      setState({
        status: "error",
        message: "Navegador nao suporta reconhecimento de voz.",
        transcript: "",
      });
      setShowOverlay(true);
      setTimeout(() => {
        setShowOverlay(false);
        setState({ status: "idle", message: "", transcript: "" });
      }, 2500);
      return;
    }

    recognitionRef.current = recognition;
    setShowOverlay(true);
    setState({ status: "listening", message: "Ouvindo... fale seu comando", transcript: "" });

    let finalTranscript = "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t;
        } else {
          interim = t;
        }
      }
      setState((s) => ({
        ...s,
        transcript: finalTranscript || interim,
      }));
    };

    recognition.onend = () => {
      if (finalTranscript) {
        const cmd = parseVoiceCommand(finalTranscript);
        executeCommand(cmd);
      } else {
        setState({
          status: "error",
          message: "Nao captei nada. Tente novamente.",
          transcript: "",
        });
        setTimeout(() => {
          setShowOverlay(false);
          setState({ status: "idle", message: "", transcript: "" });
        }, 2000);
      }
    };

    recognition.onerror = () => {
      setState({
        status: "error",
        message: "Erro no microfone. Tente novamente.",
        transcript: "",
      });
      setTimeout(() => {
        setShowOverlay(false);
        setState({ status: "idle", message: "", transcript: "" });
      }, 2000);
    };

    recognition.start();

    timeoutRef.current = setTimeout(() => {
      recognition.stop();
    }, 10000);
  }, [executeCommand]);

  useEffect(() => {
    return () => stopListening();
  }, [stopListening]);

  const statusIcon = {
    idle: <Mic size={24} />,
    listening: <MicOff size={24} />,
    processing: <Loader2 size={24} className="animate-spin" />,
    success: <CheckCircle size={24} />,
    error: <AlertCircle size={24} />,
  };

  const statusColor = {
    idle: "gradient-main",
    listening: "bg-red-500 animate-pulse",
    processing: "bg-amber-500",
    success: "bg-green-500",
    error: "bg-red-600",
  };

  return (
    <>
      {/* Floating Mic Button */}
      <button
        onClick={state.status === "listening" ? stopListening : startListening}
        className={`fixed bottom-24 md:bottom-8 right-4 md:right-8 z-50 w-14 h-14 rounded-full ${statusColor[state.status]} text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center`}
      >
        {statusIcon[state.status]}
      </button>

      {/* Voice Overlay */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center"
          >
            <div
              className="absolute inset-0 bg-navy-dark/80 backdrop-blur-md"
              onClick={() => {
                stopListening();
                setShowOverlay(false);
                setState({ status: "idle", message: "", transcript: "" });
              }}
            />

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative z-10 w-full max-w-md mx-4"
            >
              <div className="bg-white rounded-3xl p-8 shadow-2xl text-center">
                <button
                  onClick={() => {
                    stopListening();
                    setShowOverlay(false);
                    setState({ status: "idle", message: "", transcript: "" });
                  }}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100"
                >
                  <X size={20} className="text-gray-400" />
                </button>

                {/* Pulsing circles for listening state */}
                <div className="relative w-24 h-24 mx-auto mb-6">
                  {state.status === "listening" && (
                    <>
                      <div className="absolute inset-0 rounded-full bg-cyan/20 animate-ping" />
                      <div className="absolute inset-2 rounded-full bg-cyan/30 animate-ping animation-delay-200" />
                    </>
                  )}
                  <div
                    className={`relative w-24 h-24 rounded-full flex items-center justify-center ${statusColor[state.status]} text-white`}
                  >
                    {statusIcon[state.status]}
                  </div>
                </div>

                <h2 className="text-lg font-bold text-navy mb-1">
                  {state.status === "listening"
                    ? "Hello Better"
                    : state.status === "processing"
                      ? "Processando..."
                      : state.status === "success"
                        ? "Feito!"
                        : state.status === "error"
                          ? "Ops!"
                          : "Better Control"}
                </h2>

                <p className="text-sm text-gray-500 mb-4">{state.message}</p>

                {state.transcript && (
                  <div className="bg-gray-50 rounded-xl p-3 mb-4">
                    <p className="text-sm text-gray-700 italic">
                      &quot;{state.transcript}&quot;
                    </p>
                  </div>
                )}

                {state.status === "listening" && (
                  <div className="space-y-1 text-left bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Comandos
                    </p>
                    <p className="text-xs text-gray-500">
                      &quot;Crie tarefa [titulo] no projeto [nome]&quot;
                    </p>
                    <p className="text-xs text-gray-500">
                      &quot;Novo projeto [nome] na area [tech/idiomas]&quot;
                    </p>
                    <p className="text-xs text-gray-500">
                      &quot;Tarefa [nome] concluida&quot;
                    </p>
                    <p className="text-xs text-gray-500">
                      &quot;Abra dashboard / areas / relatorios&quot;
                    </p>
                    <p className="text-xs text-gray-500">
                      &quot;Anote [mensagem] no projeto [nome]&quot;
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
