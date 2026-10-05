import { useCallback, useState } from "react";
import { Outlet } from "react-router-dom";
import NavBar from "./NavBar";
import { SidebarDesktop, SidebarDrawer } from "./Sidebar";

/** Marco de la app con sesión: Navbar arriba (con campanita) + Sidebar a la izquierda. */
export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar drawerOpen={drawerOpen} onToggleDrawer={() => setDrawerOpen((v) => !v)} />
      <div className="flex flex-1">
        <SidebarDesktop />
        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
      <SidebarDrawer open={drawerOpen} onClose={closeDrawer} />
    </div>
  );
}
