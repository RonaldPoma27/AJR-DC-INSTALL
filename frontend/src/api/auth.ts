import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import { clearTokens, setTokens, useHasSession } from "@/lib/session";

export type Role = "ADMIN" | "TECNICO" | "USUARIO";
export interface User {
  id: number;
  email: string;
  full_name: string;
  role: Role;
}

export const ROLE_LABEL: Record<Role, string> = { ADMIN: "Administrador", TECNICO: "Técnico", USUARIO: "Usuario" };
export const isTeam = (role?: Role) => role === "ADMIN" || role === "TECNICO";

export async function login(email: string, password: string) {
  const { data } = await api.post<{ access: string; refresh: string }>("/auth/login/", { email, password });
  setTokens(data.access, data.refresh);
}

export async function register(input: { full_name: string; email: string; password: string }) {
  const { data } = await api.post<{ access: string; refresh: string }>("/auth/register/", input);
  setTokens(data.access, data.refresh);
}

export const fetchMe = async () => (await api.get<User>("/me/")).data;

export function useMe() {
  const hasSession = useHasSession();
  return useQuery({ queryKey: ["me"], queryFn: fetchMe, enabled: hasSession, staleTime: 60_000, retry: false });
}

export function useLogout() {
  const qc = useQueryClient();
  return () => {
    clearTokens();
    qc.clear();
  };
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (full_name: string) => (await api.patch<User>("/me/", { full_name })).data,
    onSuccess: (me) => qc.setQueryData(["me"], me),
  });
}

export const useChangePassword = () =>
  useMutation({
    mutationFn: (v: { current_password: string; new_password: string }) => api.post("/me/password/", v),
  });

export function useChangeEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { current_password: string; new_email: string }) => (await api.post<User>("/me/email/", v)).data,
    onSuccess: (me) => qc.setQueryData(["me"], me),
  });
}
