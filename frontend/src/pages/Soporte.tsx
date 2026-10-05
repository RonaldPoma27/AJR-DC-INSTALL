import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MessageSquarePlus, MessagesSquare } from "lucide-react";
import ChatList from "@/components/support/ChatList";
import ChatThread from "@/components/support/ChatThread";
import NewChatModal from "@/components/support/NewChatModal";
import { cn, ui } from "@/lib/utils";

export default function Soporte() {
  const { chatId } = useParams();
  const activeId = chatId ? Number(chatId) : undefined;
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-fg">Comentarios / Soporte</h1>
          <p className="text-sm text-fg-subtle">Historial de chats y consultas con el equipo.</p>
        </div>
        <button type="button" onClick={() => setCreating(true)} className={cn(ui.btn, ui.primary)}>
          <MessageSquarePlus className="h-4 w-4" aria-hidden /> Crear chat
        </button>
      </div>

      <div className={cn(ui.card, "grid overflow-hidden md:h-[calc(100vh-14rem)] md:min-h-[30rem] md:grid-cols-[320px_1fr]")}>
        {/* Historial: en móvil se oculta cuando hay un chat abierto */}
        <aside className={cn("overflow-y-auto border-r", activeId && "hidden md:block")} aria-label="Historial de chats">
          <ChatList activeId={activeId} />
        </aside>
        <section className={cn("min-w-0", !activeId && "hidden md:block")}>
          {activeId ? (
            <ChatThread chatId={activeId} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-10 text-center text-fg-subtle">
              <MessagesSquare className="h-10 w-10" aria-hidden />
              <p className="text-sm">Elegí un chat de la lista o creá uno nuevo.</p>
            </div>
          )}
        </section>
      </div>

      {creating && (
        <NewChatModal
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            navigate(`/soporte/${id}`);
          }}
        />
      )}
    </div>
  );
}
