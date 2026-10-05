import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export type Estado = "VIGENTE" | "PROXIMO" | "VENCIDO";
export const ESTADO_LABEL: Record<Estado, string> = { VIGENTE: "Vigente", PROXIMO: "Próximo a vencer", VENCIDO: "Vencido" };
export const CLASES = ["A", "B", "C", "ABC", "BC", "D", "K", "CO2", "AGUA"] as const;
export type Clase = (typeof CLASES)[number];

export interface Cliente {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
  matafuegos_count: number;
}

export interface Matafuego {
  id: number;
  cliente: number;
  cliente_nombre: string;
  nro_serie: string;
  clase: Clase;
  ubicacion: string;
  fecha_instalacion: string;
  fecha_vencimiento_estimado: string;
  venc_ph: string | null;
  token_qr?: string; // solo staff
  estado_manual?: Estado | ""; // solo staff; "" = automático
  estado: Estado;
  estado_calculado: Estado;
  estado_origen: "AUTO" | "MANUAL";
  dias_restantes: number;
  vida_util_pct: number;
  ultimo_control: string | null;
}

export type MatafuegoInput = Pick<
  Matafuego,
  "cliente" | "nro_serie" | "clase" | "ubicacion" | "fecha_instalacion" | "fecha_vencimiento_estimado" | "venc_ph"
> & { estado_manual?: Estado | "" };

export interface Control {
  id: number;
  fecha: string;
  resultado: "APTO" | "OBSERVADO" | "NO_APTO";
  manometro_ok: boolean;
  precinto_ok: boolean;
  observaciones: string;
  tecnico_nombre: string;
}
export type ControlInput = Omit<Control, "id" | "fecha" | "tecnico_nombre">;

export interface HistoryRecord {
  id: number;
  fecha: string;
  tipo: "Creado" | "Modificado" | "Eliminado";
  usuario: string;
  cambios: { campo: string; antes: string; despues: string }[];
}

export interface PublicFicha {
  estado: "VIGENTE" | "VENCIDO";
  clase: string;
  fecha_vencimiento: string;
  ultimo_control: string | null;
}

export const useMatafuegos = () =>
  useQuery({ queryKey: ["matafuegos"], queryFn: async () => (await api.get<Matafuego[]>("/matafuegos/")).data });

export const useClientes = (enabled = true) =>
  useQuery({ queryKey: ["clientes"], queryFn: async () => (await api.get<Cliente[]>("/clientes/")).data, enabled });

export function useCreateCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nombre: string) => (await api.post<Cliente>("/clientes/", { nombre })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clientes"] }),
  });
}

export function useSaveMatafuego() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id?: number; data: Partial<MatafuegoInput> }) =>
      id ? (await api.patch<Matafuego>(`/matafuegos/${id}/`, data)).data : (await api.post<Matafuego>("/matafuegos/", data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["matafuegos"] }),
  });
}

export function useDeleteMatafuego() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/matafuegos/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["matafuegos"] }),
  });
}

export const useHistorial = (id: number) =>
  useQuery({ queryKey: ["historial", id], queryFn: async () => (await api.get<HistoryRecord[]>(`/matafuegos/${id}/historial/`)).data });

/** Descarga el PNG crudo del QR (la API exige sesión de staff, por eso se baja como blob). */
export async function downloadQr(m: Pick<Matafuego, "id" | "nro_serie">) {
  const { data } = await api.get<Blob>(`/matafuegos/${m.id}/qr/`, { responseType: "blob" });
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = `qr-${m.nro_serie}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// --- escaneo de QR ---
export const usePublicFicha = (token: string) =>
  useQuery({ queryKey: ["public", token], queryFn: async () => (await api.get<PublicFicha>(`/public/m/${token}/`)).data, retry: false });

export const useFichaStaff = (token: string, enabled: boolean) =>
  useQuery({
    queryKey: ["ficha-staff", token],
    queryFn: async () => (await api.get<Matafuego>(`/matafuegos/por-token/${token}/`)).data,
    enabled,
    retry: false,
  });

export const useControles = (id?: number) =>
  useQuery({ queryKey: ["controles", id], queryFn: async () => (await api.get<Control[]>(`/matafuegos/${id}/controles/`)).data, enabled: id != null });

export function useAddControl(matafuegoId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: ControlInput) => (await api.post<Control>(`/matafuegos/${matafuegoId}/controles/`, data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["controles", matafuegoId] });
      qc.invalidateQueries({ queryKey: ["ficha-staff"] });
      qc.invalidateQueries({ queryKey: ["matafuegos"] });
    },
  });
}
