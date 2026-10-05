import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { login } from "@/api/auth";
import { useHasSession } from "@/lib/session";
import { Alert, PasswordField, TextField } from "@/components/forms/Fields";
import PublicShell from "@/components/PublicShell";
import { cn, ui } from "@/lib/utils";

export default function Login() {
  const hasSession = useHasSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (hasSession && !loading) return <Navigate to={from ?? "/matafuegos"} replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      qc.clear();
      navigate(from && from.startsWith("/") && !from.startsWith("//") ? from : "/matafuegos", { replace: true });
    } catch (err) {
      setError(
        isAxiosError(err) && err.response?.status === 401
          ? "Email o contraseña incorrectos."
          : isAxiosError(err) && err.response?.status === 429
            ? "Demasiados intentos. Esperá un momento y probá de nuevo."
            : "No pudimos iniciar sesión. Probá de nuevo en unos minutos.",
      );
      setLoading(false);
    }
  }

  return (
    <PublicShell>
      <div className={cn(ui.card, "p-6 sm:p-8")}>
        <h1 className="text-2xl font-bold text-fg">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-fg-subtle">Gestión de matafuegos · AJR Data</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
          <PasswordField label="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          {error && <Alert kind="error">{error}</Alert>}
          <button type="submit" disabled={loading} className={cn(ui.btn, ui.primary, "w-full py-3")}>
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-fg-subtle">
          ¿No tenés cuenta?{" "}
          <Link to="/registro" className="font-medium text-accent hover:underline">
            Registrate
          </Link>
        </p>
      </div>
    </PublicShell>
  );
}
