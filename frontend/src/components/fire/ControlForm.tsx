import { useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { useAddControl, type ControlInput } from "@/api/fire";
import { errorMessage } from "@/lib/errors";
import { Alert, SelectField, TextAreaField } from "@/components/forms/Fields";
import { cn, ui } from "@/lib/utils";

/** Formulario de control en campo: aparece solo cuando un TÉCNICO/ADMIN logueado escanea el QR. */
export default function ControlForm({ matafuegoId }: { matafuegoId: number }) {
  const add = useAddControl(matafuegoId);
  const [form, setForm] = useState<ControlInput>({ resultado: "APTO", manometro_ok: true, precinto_ok: true, observaciones: "" });
  const [status, setStatus] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    try {
      await add.mutateAsync(form);
      setForm({ resultado: "APTO", manometro_ok: true, precinto_ok: true, observaciones: "" });
      setStatus({ kind: "success", text: "Control registrado." });
    } catch (err) {
      setStatus({ kind: "error", text: errorMessage(err) });
    }
  }

  const check = (k: "manometro_ok" | "precinto_ok", label: string) => (
    <label className="flex items-center gap-2 text-sm text-fg-muted">
      <input type="checkbox" checked={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.checked }))} className="h-4 w-4 rounded border-line accent-brand" />
      {label}
    </label>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <SelectField label="Resultado del control" value={form.resultado} onChange={(e) => setForm((f) => ({ ...f, resultado: e.target.value as ControlInput["resultado"] }))}>
        <option value="APTO">Apto</option>
        <option value="OBSERVADO">Con observaciones</option>
        <option value="NO_APTO">No apto</option>
      </SelectField>
      <div className="grid gap-2 sm:grid-cols-2">
        {check("manometro_ok", "Manómetro en zona verde")}
        {check("precinto_ok", "Precinto y traba intactos")}
      </div>
      <TextAreaField
        label="Observaciones"
        rows={3}
        maxLength={1000}
        value={form.observaciones}
        onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
        counter={`${form.observaciones.length}/1000`}
      />
      {status && <Alert kind={status.kind}>{status.text}</Alert>}
      <button type="submit" disabled={add.isPending} className={cn(ui.btn, ui.primary, "w-full py-3")}>
        <ClipboardCheck className="h-4 w-4" aria-hidden /> {add.isPending ? "Guardando…" : "Registrar control"}
      </button>
    </form>
  );
}
