"use client";

import { useState, useEffect, useTransition } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Send, Trash2 } from "lucide-react";
import { getNotesByEntity, createNote, deleteNote } from "@/lib/actions/notes";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Note = {
  id: string;
  content: string | null;
  audioUrl: string | null;
  transcription: string | null;
  createdAt: Date;
  userName: string;
};

export default function NotesList({
  entityType,
  entityId,
}: {
  entityType: "project" | "task";
  entityId: string;
}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getNotesByEntity(entityType, entityId).then((data) =>
      setNotes(data.map((n) => ({ ...n, createdAt: new Date(n.createdAt) })))
    );
  }, [entityType, entityId]);

  function handleSend() {
    const content = text.trim() || transcription.trim();
    if (!content) return;
    startTransition(async () => {
      const note = await createNote({
        entityType,
        entityId,
        content,
        transcription: transcription || undefined,
      });
      if (note) {
        setNotes((prev) => [
          { ...note, userName: "Voce", createdAt: new Date(note.createdAt) },
          ...prev,
        ]);
        setText("");
        setTranscription("");
      }
    });
  }

  function handleDelete(noteId: string) {
    startTransition(async () => {
      await deleteNote(noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    });
  }

  function toggleRecording() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    if (isRecording) {
      setIsRecording(false);
      win._speechRecognition?.stop();
      return;
    }

    const SpeechRecognitionAPI =
      win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      alert("Seu navegador nao suporta reconhecimento de voz.");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let final = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript + " ";
        }
      }
      if (final) setTranscription((prev) => prev + final);
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    win._speechRecognition = recognition;
    recognition.start();
    setIsRecording(true);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <textarea
          value={text || transcription}
          onChange={(e) => {
            setText(e.target.value);
            setTranscription("");
          }}
          placeholder="Escreva uma nota ou grave com voz..."
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan/40 resize-none mb-3"
        />

        <div className="flex items-center justify-between">
          <button
            onClick={toggleRecording}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isRecording
                ? "bg-red-500 text-white animate-pulse"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
            {isRecording ? "Parar" : "Gravar Voz"}
          </button>

          <button
            onClick={handleSend}
            disabled={isPending || (!text.trim() && !transcription.trim())}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl gradient-main text-white text-sm font-medium disabled:opacity-50"
          >
            <Send size={16} />
            Enviar
          </button>
        </div>

        {isRecording && (
          <div className="mt-3 flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs text-red-500 font-medium">
              Gravando... fale agora
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {notes.map((note) => (
          <motion.div
            key={note.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-100 p-4 group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full gradient-main flex items-center justify-center text-[8px] font-bold text-white">
                  {note.userName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <span className="text-xs font-medium text-gray-600">
                  {note.userName}
                </span>
                <span className="text-xs text-gray-400">
                  {formatDistanceToNow(note.createdAt, {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </div>
              <button
                onClick={() => handleDelete(note.id)}
                className="p-1 rounded opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
            {note.content && (
              <p className="text-sm text-gray-700">{note.content}</p>
            )}
            {note.transcription && note.transcription !== note.content && (
              <p className="text-xs text-gray-400 mt-1 italic">
                Transcricao: {note.transcription}
              </p>
            )}
          </motion.div>
        ))}

        {notes.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">
            Nenhuma nota ainda. Escreva ou grave uma nota de voz.
          </p>
        )}
      </div>
    </div>
  );
}
