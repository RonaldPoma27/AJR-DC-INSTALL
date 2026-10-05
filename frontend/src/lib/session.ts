import { useSyncExternalStore } from "react";

const ACCESS = "ajr_access";
const REFRESH = "ajr_refresh";
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};

export const getAccess = () => read(ACCESS);
export const getRefresh = () => read(REFRESH);

export function setTokens(access: string, refresh?: string) {
  try {
    localStorage.setItem(ACCESS, access);
    if (refresh) localStorage.setItem(REFRESH, refresh);
  } catch {
    /* ignorar */
  }
  emit();
}

export function clearTokens() {
  try {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
  } catch {
    /* ignorar */
  }
  emit();
}

/** Reactivo: cualquier componente se re-renderiza al iniciar / cerrar sesión (incluido el cierre forzado por refresh vencido). */
export function useHasSession() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => Boolean(getAccess()),
  );
}
