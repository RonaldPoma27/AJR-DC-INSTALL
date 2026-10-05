import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import { useHasSession } from "@/lib/session";

export const MAX_MESSAGE = 3000;

export interface ChatSummary {
  id: number;
  title: string;
  user_id: number;
  user_name: string;
  created_by_name: string;
  started_by_staff: boolean;
  last_message_at: string;
  last_message_preview: string;
  last_sender_name: string | null;
  unread: boolean;
}

export interface Message {
  id: number;
  sender_id: number;
  sender_name: string;
  sender_role: "ADMIN" | "TECNICO" | "USUARIO";
  body: string;
  created_at: string;
}

export interface ChatDetail extends ChatSummary {
  messages: Message[];
  /** null = sin límite (staff). Para USUARIO: mensajes que aún puede enviar hasta que el equipo responda. */
  remaining: number | null;
  can_send: boolean;
}

// Función auxiliar para extraer siempre una lista válida
function toArray<T>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

export const useChats = () =>
  useQuery<ChatSummary[]>({
    queryKey: ["chats"],
    queryFn: async () => {
      const res = await api.get<any>("/support/chats/");
      const data = res.data ?? res;
      return toArray<ChatSummary>(data);
    },
    refetchInterval: 20_000,
  });

export const useChat = (id?: number) =>
  useQuery<ChatDetail>({
    queryKey: ["chat", id],
    queryFn: async () => {
      const res = await api.get<any>(`/support/chats/${id}/`);
      const data = res.data ?? res;
      if (data && !Array.isArray(data.messages)) {
        data.messages = toArray<Message>(data.messages);
      }
      return data as ChatDetail;
    },
    enabled: id != null,
    refetchInterval: 10_000,
  });

/** Campanita: consulta periódica (polling) de respuestas nuevas. */
export const useUnread = () => {
  const hasSession = useHasSession();
  return useQuery({
    queryKey: ["unread"],
    queryFn: async () => {
      const res = await api.get<any>("/support/unread/");
      const data = res.data ?? res;
      return {
        count: data?.count ?? 0,
        chats: toArray<ChatSummary>(data?.chats),
      };
    },
    enabled: hasSession,
    refetchInterval: 30_000,
  });
};

function useRefreshChats() {
  const qc = useQueryClient();
  return (id?: number) => {
    qc.invalidateQueries({ queryKey: ["chats"] });
    qc.invalidateQueries({ queryKey: ["unread"] });
    if (id != null) qc.invalidateQueries({ queryKey: ["chat", id] });
  };
}

export function useCreateChat() {
  const refresh = useRefreshChats();
  return useMutation({
    mutationFn: async (v: { title: string; message: string; user_id?: number }) =>
      (await api.post<ChatDetail>("/support/chats/", v)).data,
    onSuccess: (chat) => refresh(chat.id),
  });
}

export function useSendMessage(chatId: number) {
  const qc = useQueryClient();
  const refresh = useRefreshChats();
  return useMutation({
    mutationFn: async (body: string) => (await api.post<ChatDetail>(`/support/chats/${chatId}/messages/`, { body })).data,
    onSuccess: (chat) => {
      qc.setQueryData(["chat", chatId], chat);
      refresh();
    },
  });
}
