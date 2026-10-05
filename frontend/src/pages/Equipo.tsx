import { useMemo, useState } from "react";
import { Search, UserMinus, UserPlus } from "lucide-react";
import { ROLE_LABEL, useMe, type Role } from "@/api/auth";
import { useAssignTechnician, useRevokeTechnician, useTeam } from "@/api/team";
import { errorMessage } from "@/lib/errors";
import { initials } from "@/lib/format";
import { Alert, TextField } from "@/components/forms/Fields";
import { cn, ui } from "@/lib/utils";

const ROLE_CHIP: Record<Role, string> = {
  ADMIN: "bg-brand/10 text-accent",
  TECNICO: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
  USUARIO: "bg-surface-2 text-fg-muted",
};

/** Solo ADMIN: asigna el rol de TÉCNICO a un usuario ya registrado, por su email. */
function TechniciansManager() {
  const { data: members } = useTeam();
  const assign = useAssignTechnician();
  const revoke = useRevokeTechnician();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const technicians = members?.filter((m) => m.role === "TECNICO") ?? [];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    try {
      const m = await assign.mutateAsync(email.trim());
      setEmail("");
      setStatus({ kind: "success", text: `${m.full_name} ahora es técnico.` });
    } catch (err) {
      setStatus({ kind: "error", text: errorMessage(err) });
    }
  }

  async function onRevoke(id: number, name: string) {
    if (!window.confirm(`¿Quitar el rol de técnico a ${name}? Pasará a ser usuario.`)) return;
    setStatus(null);
    try {
      await revoke.mutateAsync(id);
      setStatus({ kind: "success", text: `${name} volvió a ser usuario.` });
    } catch (err) {
      setStatus({ kind: "error", text: errorMessage(err) });
    }
  }

  return (
    <section className={cn(ui.card, "p-5 sm:p-6")}>
      <h2 className="text-lg font-semibold text-fg">Gestión de técnicos</h2>
      <p className="mt-0.5 text-sm text-fg-subtle">Asigná el rol de técnico a una persona que ya se registró, usando su correo.</p>
      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <TextField label="Email del usuario registrado" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <button type="submit" disabled={assign.isPending || !email} className={cn(ui.btn, ui.primary, "sm:mb-0")}>
          <UserPlus className="h-4 w-4" aria-hidden /> Asignar técnico
        </button>
      </form>
      {status && (
        <div className="mt-3">
          <Alert kind={status.kind}>{status.text}</Alert>
        </div>
      )}
      <h3 className="mt-5 text-sm font-semibold text-fg-muted">Técnicos actuales ({technicians.length})</h3>
      {technicians.length === 0 ? (
        <p className="mt-2 text-sm text-fg-subtle">Todavía no hay técnicos.</p>
      ) : (
        <ul className="mt-2 divide-y rounded-xl border">
          {technicians.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-fg">{t.full_name}</p>
                <p className="truncate text-xs text-fg-subtle">{t.email}</p>
              </div>
              <button type="button" onClick={() => onRevoke(t.id, t.full_name)} className={cn(ui.btn, ui.danger, "px-3 py-1.5")}>
                <UserMinus className="h-4 w-4" aria-hidden /> Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Equipo() {
  const { data: me } = useMe();
  const { data: members, isLoading, isError } = useTeam();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (members ?? []).filter((m) => !q || m.full_name.toLowerCase().includes(q) || ROLE_LABEL[m.role].toLowerCase().includes(q));
  }, [members, query]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-fg">Equipo</h1>
          <p className="text-sm text-fg-subtle">Directorio de usuarios registrados{members ? ` (${members.length})` : ""}.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o rol" aria-label="Buscar en el equipo" className={cn(ui.input, "pl-9")} />
        </div>
      </div>

      {me?.role === "ADMIN" && <TechniciansManager />}

      {isLoading && <p className="text-sm text-fg-subtle">Cargando…</p>}
      {isError && <Alert kind="error">No pudimos cargar el directorio.</Alert>}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((m) => (
          <li key={m.id} className={cn(ui.card, "flex items-center gap-3 p-4")}>
            <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-base font-semibold text-white">
              {initials(m.full_name)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-fg">
                {m.full_name}
                {m.id === me?.id && <span className="ml-1 text-xs font-normal text-fg-subtle">(vos)</span>}
              </p>
              {m.email && <p className="truncate text-xs text-fg-subtle">{m.email}</p>}
              <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold", ROLE_CHIP[m.role])}>{ROLE_LABEL[m.role]}</span>
            </div>
          </li>
        ))}
      </ul>
      {!isLoading && filtered.length === 0 && <p className="text-center text-sm text-fg-subtle">No hay resultados.</p>}
    </div>
  );
}
