from django.conf import settings
from django.db import models
from django.utils import timezone

from accounts.models import TEAM_ROLES


class ChatQuerySet(models.QuerySet):
    def visible_to(self, user):
        """El staff ve todos los chats; un USUARIO solo los suyos."""
        if user.role in TEAM_ROLES:
            return self
        return self.filter(user=user)


class Chat(models.Model):
    title = models.CharField("título", max_length=120)
    # El cliente (USUARIO) con quien es el chat. Si lo inició el cliente, coincide con created_by.
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="support_chats")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    last_message_at = models.DateTimeField(default=timezone.now, db_index=True)

    objects = ChatQuerySet.as_manager()

    class Meta:
        ordering = ["-last_message_at"]

    def __str__(self):
        return self.title

    @property
    def started_by_staff(self):
        return self.created_by.role in TEAM_ROLES and self.created_by_id != self.user_id


class Message(models.Model):
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    body = models.TextField()
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["created_at", "id"]


class ChatRead(models.Model):
    """Hasta cuándo leyó cada persona cada chat (alimenta la campanita)."""

    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name="reads")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    last_read_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = [("chat", "user")]

