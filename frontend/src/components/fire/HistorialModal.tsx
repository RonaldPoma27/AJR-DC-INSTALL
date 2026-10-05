import { useHistorial, type Matafuego } from "@/api/fire";
import { formatDateTime } from "@/lib/format";
import Modal from "@/components/ui/Modal";
import { Alert } from "@/components/forms/Fields";

const FIELD_LABEL: Record<string, string> = {
  cliente: "Cliente",
  nro_serie: "Nº de serie",
  clase: "Clase",
  ubicacion: "Ubicación",
  fecha_instalacion: "Instalación",
  fecha_vencimiento_estimado: "Vencimiento estimado",
  venc_ph: "Venc. PH",
  estado_manual: "Ajuste manual",
};

/** Auditoría (django-simple-history): quién y cuándo modificó el matafuego, y qué cambió. */
export default function HistorialModal({ matafuego, onClose }: { matafuego: Matafuego; onClose: () => void }) {
  const { data, isLoading, isError } = useHistorial(matafuego.id);
  return (
    <Modal title={`Historial · ${matafuego.nro_serie}`} onClose={onClose}>
      {isLoading && <p className="text-sm text-fg-subtle">Cargando…</p>}
      {isError && <Alert kind="error">No pudimos cargar el historial.</Alert>}
      <ol className="space-y-3">
        {data?.map((r) => (
          <li key={r.id} className="rounded-xl border p-3">
            <p className="text-sm font-semibold text-fg">
              {r.tipo} <span className="font-normal text-fg-muted">por {r.usuario}</span>
            </p>
            <p className="text-xs text-fg-subtle">{formatDateTime(r.fecha)}</p>
            {r.cambios.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-fg-muted">
                {r.cambios.map((c) => (
                  <li key={c.campo}>
                    <span className="font-medium">{FIELD_LABEL[c.campo] ?? c.campo}:</span> {c.antes || "—"} → {c.despues || "—"}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </Modal>
  );
}
