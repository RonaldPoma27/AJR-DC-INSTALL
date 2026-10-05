import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { clearTokens, getAccess, getRefresh, setTokens } from "@/lib/session";

export const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string> | null = null;

async function refreshAccess(): Promise<string> {
  const refresh = getRefresh();
  if (!refresh) throw new Error("sin refresh");
  const { data } = await axios.post<{ access: string }>("/api/auth/refresh/", { refresh });
  setTokens(data.access);
  return data.access;
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const isAuthCall = original?.url?.startsWith("/auth/");
    if (error.response?.status === 401 && original && !original._retry && !isAuthCall && getAccess()) {
      original._retry = true;
      try {
        refreshing = refreshing ?? refreshAccess().finally(() => (refreshing = null));
        const token = await refreshing;
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        clearTokens(); // refresh vencido: cierra la sesión (las rutas protegidas redirigen a /login)
      }
    }
    return Promise.reject(error);
  },
);
