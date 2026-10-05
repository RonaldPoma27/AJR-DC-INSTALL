import logging
from datetime import datetime, timezone as dt_timezone

from django.conf import settings
from django.core.exceptions import PermissionDenied, ValidationError
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import DateTimeField, Exists, OuterRef, Subquery, Value
from django.db.models.functions import Coalesce
from django.utils import timezone

from accounts.models import Role, TEAM_ROLES, User

from .models import Chat, ChatRead, Message

log = logging.getLogger(__name__)
EPOCH = datetime(1970, 1, 1, tzinfo=dt_timezone.utc)


class AntiSpamError(PermissionDenied):
    pass


# ---------------------------------------------------------------- anti-spam
def consecutive_user_messages(chat: Chat) -> int:
    """Cuántos mensajes seguidos de un USUARIO hay al final del hilo (se corta con el primer mensaje del staff)."""
    limit = settings.SUPPORT_MAX_CONSECUTIVE_USER_MESSAGES
    roles = chat.messages.order_by("-created_at", "-id").values_list("sender__role", flat=True)[:limit]
    count = 0
    for role in roles:
        if role != Role.USUARIO:
            break
        count += 1
    return count


def remaining_for(user: User, chat: Chat):
    """None = sin límite (staff). Para USUARIO: cuántos mensajes más puede mandar hasta que el staff responda."""
    if user.role in TEAM_ROLES:
        return None
    return max(0, settings.SUPPORT_MAX_CONSECUTIVE_USER_MESSAGES - consecutive_user_messages(chat))


# ---------------------------------------------------------------- mensajes
def post_message(chat: Chat, sender: User, body: str) -> Message:
    body = (body or "").strip()
    if not body:
        raise ValidationError("El mensaje no puede estar vacío.")
    if len(body) > settings.SUPPORT_MAX_MESSAGE_LENGTH:
        raise ValidationError(f"El mensaje supera los {settings.SUPPORT_MAX_MESSAGE_LENGTH} caracteres.")

    with transaction.atomic():
        chat = Chat.objects.select_for_update().get(pk=chat.pk)  # evita pasarse del límite con envíos simultáneos
        if sender.role == Role.USUARIO:
            if chat.user_id != sender.id:
                raise PermissionDenied("No tenés acceso a este chat.")
            if remaining_for(sender, chat) == 0:
                raise AntiSpamError(
                    "Ya enviaste 2 mensajes seguidos. Esperá la respuesta del equipo para volver a escribir."
                )
        message = Message.objects.create(chat=chat, sender=sender, body=body)
        Chat.objects.filter(pk=chat.pk).update(last_message_at=message.created_at)
        mark_read(chat, sender)
        transaction.on_commit(lambda: notify_new_message(message.pk))
    return message


def mark_read(chat: Chat, user: User) -> None:
    ChatRead.objects.update_or_create(chat=chat, user=user, defaults={"last_read_at": timezone.now()})


def create_chat(*, title: str, body: str, creator: User, target_user: User | None = None) -> Chat:
    """Un USUARIO crea un chat para el equipo; el staff lo crea dirigido a un USUARIO concreto."""
    if creator.role in TEAM_ROLES:
        if target_user is None or target_user.role != Role.USUARIO:
            raise ValidationError("Elegí el usuario destinatario del chat.")
        owner = target_user
    else:
        owner = creator
    with transaction.atomic():
        chat = Chat.objects.create(title=title.strip(), user=owner, created_by=creator)
        post_message(chat, creator, body)
    return chat


# ---------------------------------------------------------------- consultas
def chats_with_meta(user: User):
    """Chats visibles para `user` + último mensaje + bandera `unread` (mensajes de otros que todavía no leyó)."""
    my_read = Subquery(ChatRead.objects.filter(chat=OuterRef("pk"), user=user).values("last_read_at")[:1])
    last = Message.objects.filter(chat=OuterRef("pk")).order_by("-created_at", "-id")
    return (
        Chat.objects.visible_to(user)
        .select_related("user", "created_by")
        .annotate(
            my_read_at=Coalesce(my_read, Value(EPOCH, output_field=DateTimeField())),
            last_body=Subquery(last.values("body")[:1]),
            last_sender_name=Subquery(last.values("sender__full_name")[:1]),
        )
        .annotate(
            unread=Exists(
                Message.objects.filter(chat=OuterRef("pk"), created_at__gt=OuterRef("my_read_at")).exclude(sender=user)
            )
        )
    )


# ---------------------------------------------------------------- email
def notify_new_message(message_id: int) -> None:
    """Email sencillo al/los destinatario(s) del chat cuando entra una respuesta nueva."""
    try:
        message = Message.objects.select_related("chat", "chat__user", "sender").get(pk=message_id)
    except Message.DoesNotExist:
        return
    chat, sender = message.chat, message.sender

    if sender.role in TEAM_ROLES:
        recipients = [chat.user]
    else:
        participants = User.objects.filter(
            role__in=TEAM_ROLES, is_active=True, pk__in=chat.messages.values("sender_id")
        )
        recipients = list(participants) or list(User.objects.filter(role__in=TEAM_ROLES, is_active=True))

    link = f"{settings.PUBLIC_BASE_URL}/soporte/{chat.pk}"
    subject = f"[AJR Data] Nueva respuesta en «{chat.title}»"
    for person in {r.pk: r for r in recipients if r.pk != sender.pk}.values():
        text = (
            f"Hola {person.full_name},\n\n"
            f"{sender.full_name} escribió en el chat «{chat.title}».\n"
            f"Entrá para leerlo y responder:\n{link}\n\n— AJR Data"
        )
        try:
            send_mail(subject, text, settings.DEFAULT_FROM_EMAIL, [person.email])
        except Exception:  # un fallo de SMTP nunca debe romper el chat
            log.exception("No se pudo enviar el aviso de chat a %s", person.email)
