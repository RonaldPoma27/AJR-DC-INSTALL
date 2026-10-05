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

export const useChats = () =>
  useQuery({ queryKey: ["chats"], queryFn: async () => (await api.get<ChatSummary[]>("/support/chats/")).data, refetchInterval: 20_000 });

export const useChat = (id?: number) =>
  useQuery({
    queryKey: ["chat", id],
    queryFn: async () => (await api.get<ChatDetail>(`/support/chats/${id}/`)).data,
    enabled: id != null,
    refetchInterval: 10_000,
  });

/** Campanita: consulta periódica (polling) de respuestas nuevas. */
export const useUnread = () => {
  const hasSession = useHasSession();
  return useQuery({
    queryKey: ["unread"],
    queryFn: async () => (await api.get<{ count: number; chats: ChatSummary[] }>("/support/unread/")).data,
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
