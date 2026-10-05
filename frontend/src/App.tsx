import { Navigate, Route, Routes } from "react-router-dom";
import { useHasSession } from "@/lib/session";
import AppLayout from "@/components/layout/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import PublicMatafuego from "@/pages/PublicMatafuego";
import Cuenta from "@/pages/Cuenta";
import Matafuegos from "@/pages/Matafuegos";
import Soporte from "@/pages/Soporte";
import Equipo from "@/pages/Equipo";
import NotFound from "@/pages/NotFound";

export default function App() {
  const hasSession = useHasSession();
  return (
    <Routes>
      {/* Públicas (sin layout) */}
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Register />} />
      <Route path="/m/:token" element={<PublicMatafuego />} />

      {/* Con sesión: Navbar + Sidebar */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/cuenta" element={<Cuenta />} />
          <Route path="/matafuegos" element={<Matafuegos />} />
          <Route path="/soporte" element={<Soporte />} />
          <Route path="/soporte/:chatId" element={<Soporte />} />
          <Route path="/equipo" element={<Equipo />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to={hasSession ? "/matafuegos" : "/login"} replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
