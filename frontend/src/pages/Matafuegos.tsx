import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { isTeam, useMe } from "@/api/auth";
import { useMatafuegos } from "@/api/fire";
import { Alert } from "@/components/forms/Fields";
import MatafuegoForm from "@/components/fire/MatafuegoForm";
import MatafuegoTable from "@/components/fire/MatafuegoTable";
import { cn, ui } from "@/lib/utils";

export default function Matafuegos() {
  const { data: me } = useMe();
  const team = isTeam(me?.role);
  const { data, isLoading, isError } = useMatafuegos();
  const [altaOpen, setAltaOpen] = useState(true);

  return (
    <div className="mx-auto max-w-[100rem] space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-fg">Gestión de matafuegos</h1>
        <p className="text-sm text-fg-subtle">
          {team
            ? "Planilla interactiva: ordená por columna, filtrá, cargá nuevos equipos y descargá sus códigos QR."
            : "Estado de los matafuegos asociados a tu email."}
        </p>
      </div>

      {team && (
        <section className={cn(ui.card, "p-4 sm:p-5")}>
          <button
            type="button"
            onClick={() => setAltaOpen((v) => !v)}
            aria-expanded={altaOpen}
            className="flex w-full items-center justify-between gap-2 text-left"
          >
            <span className="flex items-center gap-2 text-base font-semibold text-fg">
              <Plus className="h-5 w-5 text-accent" aria-hidden /> Alta rápida de matafuego
            </span>
            <ChevronDown className={cn("h-5 w-5 text-fg-subtle transition-transform", altaOpen && "rotate-180")} aria-hidden />
          </button>
          {altaOpen && (
            <div className="mt-4">
              <MatafuegoForm layout="inline" />
            </div>
          )}
        </section>
      )}

      {isLoading && <p className="text-sm text-fg-subtle">Cargando…</p>}
      {isError && <Alert kind="error">No pudimos cargar los matafuegos.</Alert>}
      {data && (team || data.length > 0) && <MatafuegoTable data={data} canEdit={team} />}
      {data && !team && data.length === 0 && (
        <div className={cn(ui.card, "p-8 text-center text-sm text-fg-subtle")}>
          Todavía no hay matafuegos asociados a <strong className="text-fg">{me?.email}</strong>. Si ya sos cliente de AJR Data,
          pedinos que carguen ese email en tu ficha.
        </div>
      )}
    </div>
  );
}
