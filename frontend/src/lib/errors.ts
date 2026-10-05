import { isAxiosError } from "axios";

/** Convierte cualquier error de la API (DRF) en un texto legible. */
export function errorMessage(err: unknown, fallback = "Ocurrió un error inesperado. Probá de nuevo."): string {
  if (!isAxiosError(err)) return fallback;
  if (!err.response || err.response.status >= 500) return "No pudimos conectar con el servidor. Probá de nuevo en unos minutos.";
  if (err.response.status === 429) return "Demasiados intentos. Esperá un momento y probá de nuevo.";
  const data = err.response.data;
  if (typeof data === "string") return fallback;
  const parts: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") parts.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(data);
  return parts.length ? [...new Set(parts)].join(" ") : fallback;
}
