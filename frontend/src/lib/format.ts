const dateFmt = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" });

/** Las fechas "YYYY-MM-DD" se interpretan como locales (new Date("2026-01-05") las correría un día en Argentina). */
export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return dateFmt.format(new Date(y, m - 1, d));
}

export const formatDateTime = (iso?: string | null) => (iso ? dateTimeFmt.format(new Date(iso)) : "—");

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const addYearsISO = (iso: string, years: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  const out = new Date(y + years, m - 1, d);
  return `${out.getFullYear()}-${String(out.getMonth() + 1).padStart(2, "0")}-${String(out.getDate()).padStart(2, "0")}`;
};

export function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase() || "?";
}
