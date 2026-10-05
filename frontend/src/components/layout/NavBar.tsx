import { Menu, X } from "lucide-react";
import Logo from "./Logo";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";

export default function NavBar({ drawerOpen, onToggleDrawer }: { drawerOpen: boolean; onToggleDrawer: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink text-white">
      <nav className="flex h-16 items-center gap-3 px-4 sm:px-6" aria-label="Principal">
        <button
          type="button"
          onClick={onToggleDrawer}
          aria-label={drawerOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={drawerOpen}
          aria-controls="sidebar-drawer"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-200 hover:bg-white/10 md:hidden"
        >
          {drawerOpen ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
        </button>
        <Logo to="/matafuegos" />
        <span className="hidden text-sm font-medium text-gray-300 sm:block">Gestión de matafuegos</span>
        <div className="ml-auto flex items-center gap-1">
          <NotificationBell />
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
