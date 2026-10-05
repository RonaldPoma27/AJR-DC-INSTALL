import { Link } from "react-router-dom";
import { isTeam, useMe } from "@/api/auth";
import { useChats } from "@/api/support";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function ChatList({ activeId }: { activeId?: number }) {
  const { data: me } = useMe();
  const { data: chats, isLoading, isError } = useChats();

  if (isLoading) return <p className="p-4 text-sm text-fg-subtle">Cargando chats…</p>;
  if (isError) return <p className="p-4 text-sm text-red-600 dark:text-red-400">No pudimos cargar los chats.</p>;
  if (!chats?.length) return <p className="p-6 text-center text-sm text-fg-subtle">Todavía no hay chats. Creá el primero con «Crear chat».</p>;

  return (
    <ul className="divide-y">
      {chats.map((c) => (
        <li key={c.id}>
          <Link
            to={`/soporte/${c.id}`}
            aria-current={c.id === activeId ? "true" : undefined}
            className={cn("block px-4 py-3 hover:bg-surface-2", c.id === activeId && "bg-brand/10")}
          >
            <div className="flex items-start justify-between gap-2">
              <p className={cn("truncate text-sm text-fg", c.unread ? "font-bold" : "font-medium")}>{c.title}</p>
              {c.unread && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" aria-label="Sin leer" />}
            </div>
            {isTeam(me?.role) && <p className="truncate text-xs text-accent">{c.user_name}</p>}
            <p className="truncate text-xs text-fg-muted">
              {c.last_sender_name}: {c.last_message_preview}
            </p>
            <p className="mt-0.5 text-[11px] text-fg-subtle">{formatDateTime(c.last_message_at)}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
