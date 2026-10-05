import { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FireExtinguisher, LogOut, MessagesSquare, User, Users, type LucideIcon } from "lucide-react";
import { ROLE_LABEL, useLogout, useMe } from "@/api/auth";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

const ITEMS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/cuenta", label: "Mi cuenta", icon: User },
  { to: "/matafuegos", label: "Gestión de matafuegos", icon: FireExtinguisher },
  { to: "/soporte", label: "Comentarios / Soporte", icon: MessagesSquare },
  { to: "/equipo", label: "Equipo", icon: Users },
];

function SidebarContent() {
  const { data: me } = useMe();
  const logout = useLogout();
  const name = me?.full_name || me?.email || "";

  return (
    <div className="flex h-full flex-col">
      {/* 1. Cabecera: nombre completo + rol */}
      <div className="flex items-center gap-3 border-b px-4 py-4">
        {me ? (
          <>
            <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
              {initials(name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-fg" title={me.email}>
                {name}
              </p>
              <p className="text-xs font-medium uppercase tracking-wide text-accent">{ROLE_LABEL[me.role]}</p>
            </div>
          </>
        ) : (
          <div className="h-10 w-full animate-pulse rounded-xl bg-surface-2" />
        )}
      </div>

      <nav aria-label="Cuenta" className="flex-1 space-y-1 overflow-y-auto p-3">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-fg-muted hover:bg-surface-2 hover:text-fg",
                isActive && "bg-brand/10 text-accent hover:bg-brand/10 hover:text-accent",
              )
            }
          >
            <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t p-3">
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-fg-muted hover:bg-surface-2 hover:text-fg"
        >
          <LogOut className="h-[18px] w-[18px]" aria-hidden />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

/** Computadora: columna fija a la izquierda. */
export function SidebarDesktop() {
  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 border-r bg-surface md:block">
      <SidebarContent />
    </aside>
  );
}

/** Smartphone: cajón colapsable que se abre desde la Navbar. */
export function SidebarDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { pathname } = useLocation();
  useEffect(onClose, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 top-16 z-30 md:hidden">
      <button type="button" aria-label="Cerrar menú" onClick={onClose} className="absolute inset-0 bg-black/50" />
      <div id="sidebar-drawer" role="dialog" aria-modal="true" aria-label="Menú" className="relative h-full w-72 max-w-[85vw] border-r bg-surface shadow-xl">
        <SidebarContent />
      </div>
    </div>
  );
}
