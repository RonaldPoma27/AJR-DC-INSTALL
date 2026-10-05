import { ESTADO_LABEL, type Estado } from "@/api/fire";
import { cn } from "@/lib/utils";

const STYLE: Record<Estado, { chip: string; dot: string }> = {
  VIGENTE: { chip: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300", dot: "bg-emerald-500" },
  PROXIMO: { chip: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300", dot: "bg-amber-500" },
  VENCIDO: { chip: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300", dot: "bg-red-500" },
};

/** Semáforo: verde / amarillo / rojo (el texto acompaña al color para no depender solo de él). */
export default function EstadoBadge({ estado, manual }: { estado: Estado; manual?: boolean }) {
  const s = STYLE[estado];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", s.chip)}>
      <span className={cn("h-2 w-2 rounded-full", s.dot)} aria-hidden />
      {ESTADO_LABEL[estado]}
      {manual && <span className="rounded bg-black/10 px-1 text-[10px] font-bold uppercase dark:bg-white/10">manual</span>}
    </span>
  );
}
