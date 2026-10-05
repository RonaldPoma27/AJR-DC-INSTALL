import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { register } from "@/api/auth";
import { useHasSession } from "@/lib/session";
import { errorMessage } from "@/lib/errors";
import { isStrongPassword } from "@/lib/password";
import { Alert, PasswordField, PasswordRules, TextField } from "@/components/forms/Fields";
import PublicShell from "@/components/PublicShell";
import { cn, ui } from "@/lib/utils";

export default function Register() {
  const hasSession = useHasSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (hasSession && !loading) return <Navigate to="/matafuegos" replace />;

  const mismatch = form.confirm.length > 0 && form.confirm !== form.password;
  const canSubmit = form.full_name.trim() && form.email && isStrongPassword(form.password) && form.password === form.confirm;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      await register({ full_name: form.full_name.trim(), email: form.email.trim(), password: form.password });
      qc.clear();
      navigate("/matafuegos", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <PublicShell>
      <div className={cn(ui.card, "p-6 sm:p-8")}>
        <h1 className="text-2xl font-bold text-fg">Crear cuenta</h1>
        <p className="mt-1 text-sm text-fg-subtle">Registrate para ver tus matafuegos y escribirnos por soporte.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <TextField label="Nombre completo" value={form.full_name} onChange={set("full_name")} required maxLength={150} autoComplete="name" />
          <TextField label="Email" type="email" value={form.email} onChange={set("email")} required autoComplete="username" />
          <PasswordField label="Contraseña" value={form.password} onChange={set("password")} required maxLength={24} autoComplete="new-password" />
          <PasswordRules value={form.password} />
          <PasswordField
            label="Repetir contraseña"
            value={form.confirm}
            onChange={set("confirm")}
            required
            maxLength={24}
            autoComplete="new-password"
            error={mismatch ? "Las contraseñas no coinciden." : undefined}
          />
          {error && <Alert kind="error">{error}</Alert>}
          <button type="submit" disabled={loading || !canSubmit} className={cn(ui.btn, ui.primary, "w-full py-3")}>
            {loading ? "Creando cuenta..." : "Registrarme"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-fg-subtle">
          ¿Ya tenés cuenta?{" "}
          <Link to="/login" className="font-medium text-accent hover:underline">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </PublicShell>
  );
}
