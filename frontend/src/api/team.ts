import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { Role } from "./auth";

export interface Member {
  id: number;
  full_name: string;
  role: Role;
  email?: string;
  date_joined: string;
}

export const useTeam = () =>
  useQuery<Member[]>({
    queryKey: ["team"],
    queryFn: async () => {
      const res = await api.get<any>("/team/");
      const data = res.data ?? res;
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.results)) return data.results;
      return [];
    },
  });

export function useAssignTechnician() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (email: string) => (await api.post<Member>("/admin/technicians/", { email })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team"] }),
  });
}

export function useRevokeTechnician() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/technicians/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team"] }),
  });
}
