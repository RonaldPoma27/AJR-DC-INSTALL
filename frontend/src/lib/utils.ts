import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/** Clases compartidas: botones redondeados, tarjetas e inputs. */
export const ui = {
  btn: "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
  primary: "bg-brand text-white hover:bg-brand-dark",
  secondary: "border bg-surface text-fg hover:bg-surface-2",
  danger: "border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10",
  card: "rounded-2xl border bg-surface shadow-sm",
  input:
    "w-full rounded-xl border bg-surface px-3 py-2 text-sm text-fg focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60",
};
