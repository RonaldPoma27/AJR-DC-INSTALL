import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { PASSWORD_RULES } from "@/lib/password";
import { cn, ui } from "@/lib/utils";

function Shell({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-fg-muted">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-fg-subtle">{hint}</p>
      )}
    </div>
  );
}

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> & { label: string; error?: string; hint?: React.ReactNode };

export function TextField({ label, error, hint, className, ...rest }: InputProps) {
  const id = useId();
  return (
    <Shell id={id} label={label} error={error} hint={hint}>
      <input id={id} aria-invalid={Boolean(error)} className={cn(ui.input, error && "border-red-400", className)} {...rest} />
    </Shell>
  );
}

/** Input de contraseña con ícono de "ojo": muestra/oculta el texto todas las veces que haga falta. */
export function PasswordField({ label, error, hint, className, ...rest }: Omit<InputProps, "type">) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <Shell id={id} label={label} error={error} hint={hint}>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={Boolean(error)}
          className={cn(ui.input, "pr-11", error && "border-red-400", className)}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-fg-subtle hover:text-fg"
        >
          {visible ? <EyeOff className="h-[18px] w-[18px]" aria-hidden /> : <Eye className="h-[18px] w-[18px]" aria-hidden />}
        </button>
      </div>
    </Shell>
  );
}

/** Checklist en vivo de la política de contraseña segura. */
export function PasswordRules({ value }: { value: string }) {
  return (
    <ul className="grid gap-1 text-xs sm:grid-cols-2" aria-label="Requisitos de la contraseña">
      {PASSWORD_RULES.map((r) => {
        const ok = r.test(value);
        return (
          <li key={r.id} className={cn("flex items-center gap-1.5", ok ? "text-emerald-600 dark:text-emerald-400" : "text-fg-subtle")}>
            <span aria-hidden>{ok ? "✓" : "○"}</span>
            {r.label}
          </li>
        );
      })}
    </ul>
  );
}

export function SelectField({
  label, error, hint, children, ...rest
}: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "id"> & { label: string; error?: string; hint?: React.ReactNode }) {
  const id = useId();
  return (
    <Shell id={id} label={label} error={error} hint={hint}>
      <select id={id} className={cn(ui.input, error && "border-red-400")} {...rest}>
        {children}
      </select>
    </Shell>
  );
}

export function TextAreaField({
  label, error, hint, counter, ...rest
}: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & { label: string; error?: string; hint?: React.ReactNode; counter?: string }) {
  const id = useId();
  return (
    <Shell id={id} label={label} error={error} hint={hint}>
      <textarea id={id} className={cn(ui.input, error && "border-red-400")} {...rest} />
      {counter && <p className="mt-1 text-right text-xs text-fg-subtle">{counter}</p>}
    </Shell>
  );
}

export function Alert({ kind, children }: { kind: "error" | "success" | "info"; children: React.ReactNode }) {
  const styles = {
    error: "border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
    info: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200",
  };
  return (
    <p role={kind === "error" ? "alert" : "status"} className={cn("rounded-xl border px-3 py-2 text-sm", styles[kind])}>
      {children}
    </p>
  );
}
