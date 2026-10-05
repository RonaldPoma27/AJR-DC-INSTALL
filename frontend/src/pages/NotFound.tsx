import { Link } from "react-router-dom";
import PublicShell from "@/components/PublicShell";
import { ui, cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <PublicShell>
      <div className="text-center">
        <p className="text-5xl font-bold text-accent">404</p>
        <p className="mt-2 text-fg-muted">No encontramos esa página.</p>
        <Link to="/" className={cn(ui.btn, ui.primary, "mt-6")}>
          Volver al inicio
        </Link>
      </div>
    </PublicShell>
  );
}
