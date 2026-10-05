import { useRef, useState } from "react";
import { Plus, Save } from "lucide-react";
import { CLASES, ESTADO_LABEL, useClientes, useCreateCliente, useSaveMatafuego, type Estado, type Matafuego } from "@/api/fire";
import { errorMessage } from "@/lib/errors";
import { addYearsISO, todayISO } from "@/lib/format";
import { Alert, SelectField, TextField } from "@/components/forms/Fields";
import { cn, ui } from "@/lib/utils";

const NEW = "__new__";

interface Values {
  cliente: string;
  nuevoCliente: string;
  nro_serie: string;
  clase: string;
  ubicacion: string;
  fecha_instalacion: string;
  fecha_vencimiento_estimado: string;
  venc_ph: string;
  estado_manual: string;
}

/**
 * Un solo formulario para el alta ágil (fila horizontal sobre la planilla) y la edición (modal).
 * Alta: al guardar conserva cliente/clase/fechas y vuelve al Nº de serie, para cargar varios seguidos.
 */
export default function MatafuegoForm({ initial, layout, onSaved }: { initial?: Matafuego; layout: "inline" | "modal"; onSaved?: () => void }) {
  const { data: clientes } = useClientes();
  const createCliente = useCreateCliente();
  const save = useSaveMatafuego();
  const formRef = useRef<HTMLFormElement>(null);
  const vencTouched = useRef(Boolean(initial));
  const today = todayISO();
  const [v, setV] = useState<Values>({
    cliente: initial ? String(initial.cliente) : "",
    nuevoCliente: "",
    nro_serie: initial?.nro_serie ?? "",
    clase: initial?.clase ?? "ABC",
    ubicacion: initial?.ubicacion ?? "",
    fecha_instalacion: initial?.fecha_instalacion ?? today,
    fecha_vencimiento_estimado: initial?.fecha_vencimiento_estimado ?? addYearsISO(today, 1),
    venc_ph: initial?.venc_ph ?? "",
    estado_manual: initial?.estado_manual ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const busy = save.isPending || createCliente.isPending;

  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.value;
    setV((prev) => {
      const next = { ...prev, [k]: value };
      // Agilidad: si no tocaron el vencimiento, lo sugerimos a 1 año de la instalación.
      if (k === "fecha_instalacion" && !vencTouched.current && value) next.fecha_vencimiento_estimado = addYearsISO(value, 1);
      return next;
    });
    if (k === "fecha_vencimiento_estimado") vencTouched.current = true;
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    try {
      let clienteId = Number(v.cliente);
      if (v.cliente === NEW) clienteId = (await createCliente.mutateAsync(v.nuevoCliente.trim())).id;
      await save.mutateAsync({
        id: initial?.id,
        data: {
          cliente: clienteId,
          nro_serie: v.nro_serie.trim(),
          clase: v.clase as Matafuego["clase"],
          ubicacion: v.ubicacion.trim(),
          fecha_instalacion: v.fecha_instalacion,
          fecha_vencimiento_estimado: v.fecha_vencimiento_estimado,
          venc_ph: v.venc_ph || null,
          ...(initial ? { estado_manual: v.estado_manual as Estado | "" } : {}),
        },
      });
      if (initial) {
        onSaved?.();
      } else {
        setOk(`Matafuego ${v.nro_serie.trim()} agregado.`);
        setV((p) => ({ ...p, cliente: v.cliente === NEW ? "" : p.cliente, nuevoCliente: "", nro_serie: "", ubicacion: "" }));
        formRef.current?.querySelector<HTMLInputElement>("input[name=nro_serie]")?.focus();
      }
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const grid = layout === "inline" ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-4" : "grid gap-3 sm:grid-cols-2";
  const clienteOk = v.cliente === NEW ? v.nuevoCliente.trim() : v.cliente;

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-3">
      <div className={grid}>
        <TextField label="Nº de serie" name="nro_serie" value={v.nro_serie} onChange={set("nro_serie")} required maxLength={60} />
        <SelectField label="Clase" value={v.clase} onChange={set("clase")} required>
          {CLASES.map((c) => (
            <option key={c} value={c}>
              {c === "CO2" ? "CO₂" : c === "AGUA" ? "Agua" : c}
            </option>
          ))}
        </SelectField>
        <SelectField label="Cliente" value={v.cliente} onChange={set("cliente")} required>
          <option value="">Elegí un cliente…</option>
          {clientes?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
          <option value={NEW}>＋ Nuevo cliente…</option>
        </SelectField>
        {v.cliente === NEW ? (
          <TextField label="Nombre del nuevo cliente" value={v.nuevoCliente} onChange={set("nuevoCliente")} required maxLength={200} />
        ) : (
          <TextField label="Ubicación" value={v.ubicacion} onChange={set("ubicacion")} required maxLength={200} placeholder="Ej: Depósito, planta baja" />
        )}
        {v.cliente === NEW && <TextField label="Ubicación" value={v.ubicacion} onChange={set("ubicacion")} required maxLength={200} />}
        <TextField label="Instalación" type="date" value={v.fecha_instalacion} onChange={set("fecha_instalacion")} required />
        <TextField label="Vencimiento estimado" type="date" value={v.fecha_vencimiento_estimado} onChange={set("fecha_vencimiento_estimado")} required />
        <TextField label="Venc. PH (opcional)" type="date" value={v.venc_ph} onChange={set("venc_ph")} />
        {initial && (
          <SelectField label="Ajuste manual del semáforo" value={v.estado_manual} onChange={set("estado_manual")} hint="«Automático» calcula por fechas.">
            <option value="">Automático (por fechas)</option>
            {(Object.keys(ESTADO_LABEL) as Estado[]).map((s) => (
              <option key={s} value={s}>
                Forzar: {ESTADO_LABEL[s]}
              </option>
            ))}
          </SelectField>
        )}
      </div>
      {error && <Alert kind="error">{error}</Alert>}
      {ok && <Alert kind="success">{ok}</Alert>}
      <div className={cn("flex", layout === "modal" ? "justify-end" : "justify-start")}>
        <button type="submit" disabled={busy || !clienteOk || !v.nro_serie.trim()} className={cn(ui.btn, ui.primary)}>
          {initial ? <Save className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
          {busy ? "Guardando…" : initial ? "Guardar cambios" : "Agregar matafuego"}
        </button>
      </div>
    </form>
  );
}
