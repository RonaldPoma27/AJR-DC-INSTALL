import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { isTeam, useMe } from "@/api/auth";
import { MAX_MESSAGE, useChat, useSendMessage } from "@/api/support";
import { errorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { Alert } from "@/components/forms/Fields";
import { cn, ui } from "@/lib/utils";

export default function ChatThread({ chatId }: { chatId: number }) {
  const { data: me } = useMe();
  const { data: chat, isLoading, isError } = useChat(chatId);
  const send = useSendMessage(chatId);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const count = chat?.messages.length ?? 0;

  useEffect(() => endRef.current?.scrollIntoView({ block: "end" }), [count, chatId]);
  useEffect(() => {
    setBody("");
    setError(null);
  }, [chatId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !chat?.can_send) return;
    setError(null);
    try {
      await send.mutateAsync(body.trim());
      setBody("");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (isLoading) return <p className="p-6 text-sm text-fg-subtle">Cargando…</p>;
  if (isError || !chat) return <p className="p-6 text-sm text-red-600 dark:text-red-400">No encontramos este chat.</p>;

  const staff = isTeam(me?.role);
  const blocked = !chat.can_send;

  return (
    <div className="flex h-full min-h-[28rem] flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Link to="/soporte" aria-label="Volver a los chats" className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-2 md:hidden">
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </Link>
        <div className="min-w-0">
          <h2 className="truncate font-semibold text-fg">{chat.title}</h2>
          <p className="truncate text-xs text-fg-subtle">
            {staff ? `Con ${chat.user_name}` : "Con el equipo de AJR Data"} · iniciado por {chat.created_by_name}
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-app/60 p-4" aria-live="polite">
        {chat.messages.map((m) => {
          const mine = m.sender_id === me?.id;
          const fromTeam = m.sender_role !== "USUARIO";
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm sm:max-w-[75%]",
                  mine ? "rounded-br-md bg-brand text-white" : "rounded-bl-md border bg-surface text-fg",
                )}
              >
                {!mine && (
                  <p className="mb-0.5 text-xs font-semibold text-accent">
                    {m.sender_name}
                    {fromTeam && <span className="ml-1 rounded bg-brand/10 px-1 text-[10px] uppercase">Equipo</span>}
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={cn("mt-1 text-right text-[11px]", mine ? "text-white/70" : "text-fg-subtle")}>{formatDateTime(m.created_at)}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={onSubmit} className="space-y-2 border-t p-3">
        {!staff && (
          <p className={cn("text-xs", blocked ? "font-medium text-amber-700 dark:text-amber-300" : "text-fg-subtle")}>
            {blocked
              ? "Enviaste 2 mensajes seguidos. Podrás volver a escribir cuando el equipo responda."
              : `Podés enviar ${chat.remaining} mensaje${chat.remaining === 1 ? "" : "s"} más hasta que el equipo responda.`}
          </p>
        )}
        {error && <Alert kind="error">{error}</Alert>}
        <div className="flex items-end gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) onSubmit(e);
            }}
            rows={2}
            maxLength={MAX_MESSAGE}
            disabled={blocked}
            placeholder={blocked ? "Esperando respuesta del equipo…" : "Escribí tu mensaje (Ctrl+Enter para enviar)"}
            aria-label="Mensaje"
            className={cn(ui.input, "resize-none")}
          />
          <button type="submit" disabled={blocked || send.isPending || !body.trim()} aria-label="Enviar mensaje" className={cn(ui.btn, ui.primary, "h-10 w-10 shrink-0 p-0")}>
            <Send className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <p className="text-right text-[11px] text-fg-subtle">
          {body.length}/{MAX_MESSAGE}
        </p>
      </form>
    </div>
  );
}
