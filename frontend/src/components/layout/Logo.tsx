import { Link } from "react-router-dom";

/**
 * El logo es un PNG con fondo casi negro (sin transparencia). `mix-blend-lighten` funde ese negro
 * con la barra oscura y el recorte deja solo la marca. (Técnica rescatada del proyecto de referencia.)
 */
export default function Logo({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} aria-label="AJR Data — ir al inicio" className="relative block h-12 w-28 shrink-0 overflow-hidden rounded-lg">
      <img
        src="/logo.png"
        alt="AJR Data"
        width={140}
        height={140}
        className="absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 mix-blend-lighten"
        style={{ width: 140, height: 140 }}
      />
    </Link>
  );
}
