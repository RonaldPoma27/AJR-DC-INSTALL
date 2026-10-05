import { useState } from "react";
import { isTeam, useMe } from "@/api/auth";
import { MAX_MESSAGE, useCreateChat } from "@/api/support";
import { useTeam } from "@/api/team";
import { errorMessage } from "@/lib/errors";
import { Alert, SelectField, TextAreaField, TextField } from "@/components/forms/Fields";
import Modal from "@/components/ui/Modal";
import { cn, ui } from "@/lib/utils";

/** "Crear Chat": exige título. Los usuarios escriben al equipo; el staff elige a qué usuario escribirle. */
export default function NewChatModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const { data: me } = useMe();
  const staff = isTeam(me?.role);
  const { data: members } = useTeam();
  const create = useCreateChat();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const clients = (members ?? []).filter((m) => m.role === "USUARIO");
  const canSubmit = title.trim() && message.trim() && (!staff || userId);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const chat = await create.mutateAsync({ title: title.trim(), message: message.trim(), ...(staff ? { user_id: Number(userId) } : {}) });
      onCreated(chat.id);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Modal title="Crear chat" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        {staff && (
          <SelectField label="Usuario destinatario" value={userId} onChange={(e) => setUserId(e.target.value)} required>
            <option value="">Elegí un usuario…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name} {c.email ? `· ${c.email}` : ""}
              </option>
            ))}
          </SelectField>
        )}
        <TextField label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} placeholder="Ej: Consulta por recarga de matafuegos" />
        <TextAreaField
          label="Mensaje"
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={MAX_MESSAGE}
          required
          counter={`${message.length}/${MAX_MESSAGE}`}
        />
        {error && <Alert kind="error">{error}</Alert>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={cn(ui.btn, ui.secondary)}>
            Cancelar
          </button>
          <button type="submit" disabled={create.isPending || !canSubmit} className={cn(ui.btn, ui.primary)}>
            {create.isPending ? "Creando…" : "Crear chat"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
