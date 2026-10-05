import { Link, useLocation, useParams } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import { isTeam, useMe } from "@/api/auth";
import { useControles, useFichaStaff, usePublicFicha } from "@/api/fire";
import { useHasSession } from "@/lib/session";
import { formatDate, formatDateTime } from "@/lib/format";
import PublicShell from "@/components/PublicShell";
import ControlForm from "@/components/fire/ControlForm";
import EstadoBadge from "@/components/ui/EstadoBadge";
import { cn, ui } from "@/lib/utils";

const RESULTADO: Record<string, string> = { APTO: "Apto", OBSERVADO: "Con observaciones", NO_APTO: "No apto" };

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-fg-subtle">{label}</dt>
      <dd className="text-right font-medium text-fg">{value}</dd>
    </div>
  );
}

/** Staff logueado: ficha completa + historial de controles + formulario de control en campo. */
function StaffPanel({ token }: { token: string }) {
  const { data: m, isLoading } = useFichaStaff(token, true);
  const { data: controles } = useControles(m?.id);
  if (isLoading || !m) return null;
  return (
    <>
      <section className={cn(ui.card, "mt-6 p-5")}>
        <h2 className="mb-1 font-semibold text-fg">Datos del equipo</h2>
        <dl className="divide-y">
          <Row label="Nº de serie" value={m.nro_serie} />
          <Row label="Cliente" value={m.cliente_nombre} />
          <Row label="Ubicación" value={m.ubicacion} />
          <Row label="Instalación" value={formatDate(m.fecha_instalacion)} />
          <Row label="Vencimiento estimado" value={formatDate(m.fecha_vencimiento_estimado)} />
          <Row label="Venc. PH" value={formatDate(m.venc_ph)} />
          <Row label="Semáforo" value={<EstadoBadge estado={m.estado} manual={m.estado_origen === "MANUAL"} />} />
        </dl>
      </section>

      <section className={cn(ui.card, "mt-6 p-5")}>
        <h2 className="mb-4 font-semibold text-fg">Cargar nuevo control</h2>
        <ControlForm matafuegoId={m.id} />
      </section>

      {controles && controles.length > 0 && (
        <section className={cn(ui.card, "mt-6 p-5")}>
          <h2 className="mb-2 font-semibold text-fg">Últimos controles</h2>
          <ul className="divide-y">
            {controles.map((c) => (
              <li key={c.id} className="py-2.5 text-sm">
                <p className="font-medium text-fg">
                  {RESULTADO[c.resultado]} <span className="font-normal text-fg-subtle">· {formatDateTime(c.fecha)} · {c.tecnico_nombre || "—"}</span>
                </p>
                {c.observaciones && <p className="text-fg-muted">{c.observaciones}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/** /m/:token — lo que ve cualquier persona al escanear el QR. */
export default function PublicMatafuego() {
  const { token = "" } = useParams();
  const location = useLocation();
  const hasSession = useHasSession();
  const { data: me } = useMe();
  const { data, isLoading, isError } = usePublicFicha(token);
  const staff = isTeam(me?.role);

  return (
    <PublicShell wide>
      {isLoading && <p className="text-center text-sm text-fg-subtle">Cargando…</p>}
      {isError && (
        <div className={cn(ui.card, "p-8 text-center")}>
          <p className="text-lg font-semibold text-fg">Código QR no válido</p>
          <p className="mt-1 text-sm text-fg-subtle">No encontramos ningún matafuego asociado a este código.</p>
        </div>
      )}
      {data && (
        <div
          className={cn(
            "rounded-2xl border-2 p-8 text-center",
            data.estado === "VIGENTE" ? "border-emerald-400 bg-emerald-50 dark:border-emerald-500/50 dark:bg-emerald-500/10" : "border-red-400 bg-red-50 dark:border-red-500/50 dark:bg-red-500/10",
          )}
        >
          {data.estado === "VIGENTE" ? (
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600 dark:text-emerald-400" aria-hidden />
          ) : (
            <XCircle className="mx-auto h-16 w-16 text-red-600 dark:text-red-400" aria-hidden />
          )}
          <p className={cn("mt-3 text-4xl font-extrabold tracking-wide", data.estado === "VIGENTE" ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300")}>
            {data.estado}
          </p>
          <dl className="mx-auto mt-5 max-w-xs divide-y divide-black/10 text-left dark:divide-white/10">
            <Row label="Clase" value={data.clase} />
            <Row label="Vencimiento" value={formatDate(data.fecha_vencimiento)} />
            <Row label="Último control" value={formatDate(data.ultimo_control)} />
          </dl>
        </div>
      )}

      {data && staff && <StaffPanel token={token} />}

      {data && (
        <p className="mt-6 text-center text-sm text-fg-subtle">
          {hasSession ? (
            <Link to="/matafuegos" className="font-medium text-accent hover:underline">Ir a la gestión de matafuegos</Link>
          ) : (
            <>
              ¿Sos técnico de AJR Data?{" "}
              <Link to="/login" state={{ from: location.pathname }} className="font-medium text-accent hover:underline">
                Iniciá sesión
              </Link>{" "}
              para cargar un control.
            </>
          )}
        </p>
      )}
    </PublicShell>
  );
}
