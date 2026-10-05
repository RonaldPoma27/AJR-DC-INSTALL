import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bell } from "lucide-react";
import { useUnread } from "@/api/support";
import { formatDateTime } from "@/lib/format";

/** Campanita con contador dinámico: avisa de respuestas nuevas en los chats de soporte (consulta cada 30 s). */
export default function NotificationBell() {
  const { data } = useUnread();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const count = data?.count ?? 0;

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={count ? `Notificaciones: ${count} sin leer` : "Notificaciones"}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-300 hover:bg-white/10 hover:text-white"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-ink">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-2xl border bg-surface text-fg shadow-xl">
          <p className="border-b px-4 py-3 text-sm font-semibold">Respuestas nuevas</p>
          {count === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-fg-subtle">No tenés respuestas nuevas.</p>
          ) : (
            <ul className="max-h-80 divide-y overflow-y-auto">
              {data!.chats.map((c) => (
                <li key={c.id}>
                  <Link to={`/soporte/${c.id}`} className="block px-4 py-3 hover:bg-surface-2">
                    <p className="truncate text-sm font-medium">{c.title}</p>
                    <p className="truncate text-xs text-fg-muted">
                      {c.last_sender_name}: {c.last_message_preview}
                    </p>
                    <p className="mt-0.5 text-[11px] text-fg-subtle">{formatDateTime(c.last_message_at)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link to="/soporte" className="block border-t px-4 py-2.5 text-center text-sm font-medium text-accent hover:bg-surface-2">
            Ver todos los chats
          </Link>
        </div>
      )}
    </div>
  );
}
