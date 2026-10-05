import { Fragment, useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, History, Pencil, QrCode, Search, Trash2 } from "lucide-react";
import {
  CLASES, ESTADO_LABEL, downloadQr, useDeleteMatafuego, useSaveMatafuego,
  type Estado, type Matafuego,
} from "@/api/fire";
import { errorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { Alert } from "@/components/forms/Fields";
import EstadoBadge from "@/components/ui/EstadoBadge";
import Modal from "@/components/ui/Modal";
import HistorialModal from "./HistorialModal";
import MatafuegoForm from "./MatafuegoForm";
import { cn, ui } from "@/lib/utils";

const RANK: Record<Estado, number> = { VENCIDO: 0, PROXIMO: 1, VIGENTE: 2 };

const FILTER_KIND: Record<string, "text" | "estado" | "clase"> = {
  estado: "estado", nro_serie: "text", clase: "clase", cliente_nombre: "text", ubicacion: "text",
};
const cellFilter = "w-full min-w-[5.5rem] rounded-lg border bg-surface px-2 py-1 text-xs font-normal text-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/40";

function LifeBar({ pct, estado }: { pct: number; estado: Estado }) {
  const color = estado === "VENCIDO" ? "bg-red-500" : estado === "PROXIMO" ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2" title={`${pct}% de la vida útil transcurrido`}>
      <div className="h-2 w-16 overflow-hidden rounded-full bg-surface-2">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-fg-subtle">{pct}%</span>
    </div>
  );
}

export default function MatafuegoTable({ data, canEdit }: { data: Matafuego[]; canEdit: boolean }) {
  // Normaliza data a un arreglo seguro (soporta arrays directos, paginación DRF { results: [...] } o fallos)
  const items = useMemo<Matafuego[]>(() => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray((data as any).results)) return (data as any).results;
    return [];
  }, [data]);

  const save = useSaveMatafuego();
  const del = useDeleteMatafuego();
  const [sorting, setSorting] = useState<SortingState>([{ id: "fecha_vencimiento_estimado", desc: false }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [editing, setEditing] = useState<Matafuego | null>(null);
  const [history, setHistory] = useState<Matafuego | null>(null);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  async function run(fn: () => Promise<unknown>, okText?: string) {
    setMessage(null);
    try {
      await fn();
      if (okText) setMessage({ kind: "success", text: okText });
    } catch (err) {
      setMessage({ kind: "error", text: errorMessage(err) });
    }
  }

  const columns = useMemo<ColumnDef<Matafuego>[]>(() => {
    const cols: ColumnDef<Matafuego>[] = [
      {
        id: "estado",
        header: "Estado",
        accessorFn: (m) => m.estado,
        cell: ({ row }) => <EstadoBadge estado={row.original.estado} manual={row.original.estado_origen === "MANUAL"} />,
        sortingFn: (a, b) => RANK[a.original.estado] - RANK[b.original.estado],
        filterFn: "equalsString",
      },
      { id: "nro_serie", header: "Nº de serie", accessorKey: "nro_serie", cell: (c) => <span className="font-medium text-fg">{c.getValue<string>()}</span> },
      { id: "clase", header: "Clase", accessorKey: "clase", filterFn: "equalsString" },
      { id: "cliente_nombre", header: "Cliente", accessorKey: "cliente_nombre" },
      { id: "ubicacion", header: "Ubicación", accessorKey: "ubicacion" },
      { id: "fecha_instalacion", header: "Instalación", accessorKey: "fecha_instalacion", cell: (c) => formatDate(c.getValue<string>()), enableColumnFilter: false },
      {
        id: "fecha_vencimiento_estimado",
        header: "Vencimiento",
        accessorKey: "fecha_vencimiento_estimado",
        enableColumnFilter: false,
        cell: ({ row }) => {
          const d = row.original.dias_restantes;
          return (
            <div>
              <p>{formatDate(row.original.fecha_vencimiento_estimado)}</p>
              <p className={cn("text-xs", d <= 0 ? "text-red-600 dark:text-red-400" : "text-fg-subtle")}>
                {d <= 0 ? `vencido hace ${-d} d` : `faltan ${d} d`}
              </p>
            </div>
          );
        },
      },
      {
        id: "venc_ph", header: "Venc. PH", accessorFn: (m) => m.venc_ph ?? undefined, sortUndefined: "last",
        cell: (c) => formatDate(c.getValue<string | undefined>()), enableColumnFilter: false,
      },
      {
        id: "vida_util_pct", header: "Vida útil", accessorKey: "vida_util_pct", enableColumnFilter: false, enableGlobalFilter: false,
        cell: ({ row }) => <LifeBar pct={row.original.vida_util_pct} estado={row.original.estado} />,
      },
      { id: "ultimo_control", header: "Último control", accessorFn: (m) => m.ultimo_control ?? undefined, sortUndefined: "last", cell: (c) => formatDate(c.getValue<string | undefined>()), enableColumnFilter: false },
    ];

    if (canEdit) {
      cols.push(
        {
          id: "ajuste",
          header: "Ajuste manual",
          enableSorting: false, enableColumnFilter: false, enableGlobalFilter: false,
          cell: ({ row }) => (
            <select
              aria-label={`Ajuste manual del estado de ${row.original.nro_serie}`}
              value={row.original.estado_manual ?? ""}
              onChange={(e) => run(() => save.mutateAsync({ id: row.original.id, data: { estado_manual: e.target.value as Estado | "" } }))}
              className={cn(cellFilter, row.original.estado_manual && "border-brand font-semibold")}
            >
              <option value="">Automático</option>
              {(Object.keys(ESTADO_LABEL) as Estado[]).map((s) => (
                <option key={s} value={s}>
                  {ESTADO_LABEL[s]}
                </option>
              ))}
            </select>
          ),
        },
        {
          id: "acciones",
          header: "Acciones",
          enableSorting: false, enableColumnFilter: false, enableGlobalFilter: false,
          cell: ({ row }) => {
            const m = row.original;
            const btn = "rounded-lg p-1.5 text-fg-muted hover:bg-surface-2 hover:text-fg";
            return (
              <div className="flex items-center gap-0.5">
                <button type="button" className={btn} title="Descargar QR (PNG)" aria-label={`Descargar QR de ${m.nro_serie}`} onClick={() => run(() => downloadQr(m))}>
                  <QrCode className="h-4 w-4" aria-hidden />
                </button>
                <button type="button" className={btn} title="Historial" aria-label={`Historial de ${m.nro_serie}`} onClick={() => setHistory(m)}>
                  <History className="h-4 w-4" aria-hidden />
                </button>
                <button type="button" className={btn} title="Editar" aria-label={`Editar ${m.nro_serie}`} onClick={() => setEditing(m)}>
                  <Pencil className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  className={cn(btn, "hover:text-red-600")}
                  title="Eliminar"
                  aria-label={`Eliminar ${m.nro_serie}`}
                  onClick={() => window.confirm(`¿Eliminar el matafuego ${m.nro_serie}? Queda registrado en el historial.`) && run(() => del.mutateAsync(m.id), "Matafuego eliminado.")}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            );
          },
        },
      );
    }
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit]);

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  });

  const counts = useMemo(() => {
    const c: Record<Estado, number> = { VIGENTE: 0, PROXIMO: 0, VENCIDO: 0 };
    items.forEach((m) => {
      if (m && m.estado && c[m.estado] !== undefined) {
        c[m.estado]++;
      }
    });
    return c;
  }, [items]);

  const estadoFilter = (columnFilters.find((f) => f.id === "estado")?.value as string | undefined) ?? "";
  const setFilter = (id: string, value: string) =>
    setColumnFilters((prev) => [...prev.filter((f) => f.id !== id), ...(value ? [{ id, value }] : [])]);
  const filtersActive = columnFilters.length > 0 || globalFilter !== "";
  const { pageIndex, pageSize } = table.getState().pagination;
  const total = table.getFilteredRowModel().rows.length;

  return (
    <div className="space-y-3">
      {/* Resumen del semáforo: también sirve de filtro rápido */}
      <div className="flex flex-wrap items-center gap-2">
        {(["VIGENTE", "PROXIMO", "VENCIDO"] as Estado[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter("estado", estadoFilter === s ? "" : s)}
            aria-pressed={estadoFilter === s}
            className={cn("rounded-full ring-2 ring-transparent", estadoFilter === s && "ring-brand")}
          >
            <EstadoBadge estado={s} />
            <span className="sr-only">: {counts[s]}</span>
            <span aria-hidden className="-ml-1 rounded-r-full bg-surface-2 py-1 pl-2 pr-2.5 text-xs font-semibold tabular-nums text-fg-muted">
              {counts[s]}
            </span>
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <input
            type="search"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Buscar en toda la planilla…"
            aria-label="Buscar en toda la planilla"
            className={cn(ui.input, "pl-9")}
          />
        </div>
        {filtersActive && (
          <button type="button" onClick={() => { setColumnFilters([]); setGlobalFilter(""); }} className={cn(ui.btn, ui.secondary, "px-3 py-1.5")}>
            Limpiar filtros
          </button>
        )}
      </div>

      {message && <Alert kind={message.kind}>{message.text}</Alert>}

      <div className={cn(ui.card, "overflow-x-auto")}>
        <table className="w-full min-w-[64rem] border-collapse text-left text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-wide text-fg-muted">
            {table.getHeaderGroups().map((hg) => (
              <Fragment key={hg.id}>
                <tr>
                  {hg.headers.map((h) => {
                    const sorted = h.column.getIsSorted();
                    return (
                      <th key={h.id} scope="col" aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"} className="whitespace-nowrap px-3 py-2.5 font-semibold">
                        {h.column.getCanSort() ? (
                          <button type="button" onClick={h.column.getToggleSortingHandler()} className="inline-flex items-center gap-1 uppercase hover:text-fg">
                            {flexRender(h.column.columnDef.header, h.getContext())}
                            {sorted === "asc" ? <ArrowUp className="h-3.5 w-3.5" aria-hidden /> : sorted === "desc" ? <ArrowDown className="h-3.5 w-3.5" aria-hidden /> : <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" aria-hidden />}
                          </button>
                        ) : (
                          flexRender(h.column.columnDef.header, h.getContext())
                        )}
                      </th>
                    );
                  })}
                </tr>
                {/* Segunda fila: filtros por columna */}
                <tr className="border-t">
                  {hg.headers.map((h) => {
                    const kind = FILTER_KIND[h.column.id];
                    const value = (h.column.getFilterValue() as string | undefined) ?? "";
                    return (
                      <th key={h.id} className="px-3 pb-2 pt-1.5 normal-case">
                        {kind === "text" && (
                          <input type="search" value={value} onChange={(e) => setFilter(h.column.id, e.target.value)} placeholder="Filtrar…" aria-label={`Filtrar por ${String(h.column.columnDef.header)}`} className={cellFilter} />
                        )}
                        {kind === "estado" && (
                          <select value={value} onChange={(e) => setFilter("estado", e.target.value)} aria-label="Filtrar por estado" className={cellFilter}>
                            <option value="">Todos</option>
                            {(Object.keys(ESTADO_LABEL) as Estado[]).map((s) => (
                              <option key={s} value={s}>{ESTADO_LABEL[s]}</option>
                            ))}
                          </select>
                        )}
                        {kind === "clase" && (
                          <select value={value} onChange={(e) => setFilter("clase", e.target.value)} aria-label="Filtrar por clase" className={cellFilter}>
                            <option value="">Todas</option>
                            {CLASES.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </Fragment>
            ))}
          </thead>
          <tbody className="divide-y">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-surface-2/60">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="whitespace-nowrap px-3 py-2.5 text-fg-muted">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-10 text-center text-sm text-fg-subtle">
                  {items.length === 0 ? "Todavía no hay matafuegos cargados." : "Ningún matafuego coincide con los filtros."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-fg-muted">
        <p>
          {total === 0 ? "0 resultados" : `${pageIndex * pageSize + 1}–${Math.min((pageIndex + 1) * pageSize, total)} de ${total}`}
        </p>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2">
            Filas
            <select value={pageSize} onChange={(e) => table.setPageSize(Number(e.target.value))} className={cn(cellFilter, "w-auto")}>
              {[10, 15, 25, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="Página anterior" className={cn(ui.btn, ui.secondary, "p-2")}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <span className="tabular-nums">
            {table.getPageCount() === 0 ? 0 : pageIndex + 1} / {table.getPageCount()}
          </span>
          <button type="button" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Página siguiente" className={cn(ui.btn, ui.secondary, "p-2")}>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      {editing && (
        <Modal title={`Editar · ${editing.nro_serie}`} onClose={() => setEditing(null)} wide>
          <MatafuegoForm initial={editing} layout="modal" onSaved={() => setEditing(null)} />
        </Modal>
      )}
      {history && <HistorialModal matafuego={history} onClose={() => setHistory(null)} />}
    </div>
  );
}
