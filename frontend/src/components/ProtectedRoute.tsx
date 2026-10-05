import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useHasSession } from "@/lib/session";
import { useMe } from "@/api/auth";

export default function ProtectedRoute() {
  const hasSession = useHasSession();
  const location = useLocation();
  const { isLoading } = useMe();

  if (!hasSession) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Cargando">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-brand" />
      </div>
    );
  }
  return <Outlet />;
}
