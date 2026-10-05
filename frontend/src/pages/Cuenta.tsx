import { useState } from "react";
import { useChangeEmail, useChangePassword, useMe, useUpdateProfile, ROLE_LABEL } from "@/api/auth";
import { errorMessage } from "@/lib/errors";
import { isStrongPassword } from "@/lib/password";
import { Alert, PasswordField, PasswordRules, TextField } from "@/components/forms/Fields";
import { cn, ui } from "@/lib/utils";

type Status = { kind: "success" | "error"; text: string } | null;

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className={cn(ui.card, "p-5 sm:p-6")}>
      <h2 className="text-lg font-semibold text-fg">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-fg-subtle">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ProfileCard() {
  const { data: me } = useMe();
  const update = useUpdateProfile();
  const [name, setName] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const value = name ?? me?.full_name ?? "";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    try {
      await update.mutateAsync(value.trim());
      setName(null);
      setStatus({ kind: "success", text: "Perfil actualizado." });
    } catch (err) {
      setStatus({ kind: "error", text: errorMessage(err) });
    }
  }

  return (
    <Card title="Perfil" subtitle={me ? `${me.email} · ${ROLE_LABEL[me.role]}` : undefined}>
      <form onSubmit={onSubmit} className="space-y-4">
        <TextField label="Nombre completo" value={value} onChange={(e) => setName(e.target.value)} required maxLength={150} />
        {status && <Alert kind={status.kind}>{status.text}</Alert>}
        <button type="submit" disabled={update.isPending || !value.trim() || value.trim() === me?.full_name} className={cn(ui.btn, ui.primary)}>
          Guardar cambios
        </button>
      </form>
    </Card>
  );
}

function EmailCard() {
  const change = useChangeEmail();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    try {
      const me = await change.mutateAsync({ current_password: password, new_email: email.trim() });
      setEmail("");
      setPassword("");
      setStatus({ kind: "success", text: `Listo: tu email ahora es ${me.email}.` });
    } catch (err) {
      setStatus({ kind: "error", text: errorMessage(err) });
    }
  }

  return (
    <Card title="Cambiar email" subtitle="Por seguridad, confirmá con tu contraseña actual.">
      <form onSubmit={onSubmit} className="space-y-4">
        <TextField label="Nuevo email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <PasswordField label="Contraseña actual" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        {status && <Alert kind={status.kind}>{status.text}</Alert>}
        <button type="submit" disabled={change.isPending || !email || !password} className={cn(ui.btn, ui.primary)}>
          Cambiar email
        </button>
      </form>
    </Card>
  );
}

function PasswordCard() {
  const change = useChangePassword();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [status, setStatus] = useState<Status>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const mismatch = form.confirm.length > 0 && form.confirm !== form.next;
  const canSubmit = form.current && isStrongPassword(form.next) && form.next === form.confirm;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus(null);
    try {
      await change.mutateAsync({ current_password: form.current, new_password: form.next });
      setForm({ current: "", next: "", confirm: "" });
      setStatus({ kind: "success", text: "Contraseña actualizada." });
    } catch (err) {
      setStatus({ kind: "error", text: errorMessage(err) });
    }
  }

  return (
    <Card title="Cambiar contraseña" subtitle="Seguridad de la cuenta.">
      <form onSubmit={onSubmit} className="space-y-4">
        <PasswordField label="Contraseña actual" value={form.current} onChange={set("current")} required autoComplete="current-password" />
        <PasswordField label="Nueva contraseña" value={form.next} onChange={set("next")} required maxLength={24} autoComplete="new-password" />
        <PasswordRules value={form.next} />
        <PasswordField
          label="Repetir nueva contraseña"
          value={form.confirm}
          onChange={set("confirm")}
          required
          maxLength={24}
          autoComplete="new-password"
          error={mismatch ? "Las contraseñas no coinciden." : undefined}
        />
        {status && <Alert kind={status.kind}>{status.text}</Alert>}
        <button type="submit" disabled={change.isPending || !canSubmit} className={cn(ui.btn, ui.primary)}>
          Cambiar contraseña
        </button>
      </form>
    </Card>
  );
}

export default function Cuenta() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-fg">Mi cuenta</h1>
      <ProfileCard />
      <div className="grid gap-6 lg:grid-cols-2">
        <EmailCard />
        <PasswordCard />
      </div>
    </div>
  );
}
