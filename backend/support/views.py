from django.core.exceptions import PermissionDenied, ValidationError
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Role, User

from . import services
from .models import Chat
from .serializers import (
    ChatCreateSerializer,
    ChatSummarySerializer,
    MessageCreateSerializer,
    MessageSerializer,
)


class SpamLimit(APIException):
    status_code = 403
    default_code = "spam_limit"


def _chat_detail(chat, user, summary=None):
    summary = summary or services.chats_with_meta(user).get(pk=chat.pk)
    data = ChatSummarySerializer(summary).data
    remaining = services.remaining_for(user, chat)
    data["messages"] = MessageSerializer(chat.messages.select_related("sender"), many=True).data
    data["remaining"] = remaining
    data["can_send"] = remaining is None or remaining > 0
    return data


def _run(fn):
    """Traduce los errores de dominio a respuestas HTTP claras."""
    try:
        return fn()
    except services.AntiSpamError as exc:
        raise SpamLimit(str(exc))
    except PermissionDenied as exc:
        return Response({"detail": str(exc) or "Sin permiso."}, status=status.HTTP_403_FORBIDDEN)
    except ValidationError as exc:
        return Response({"detail": " ".join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)


class ChatListCreateView(APIView):
    def get(self, request):
        qs = services.chats_with_meta(request.user)
        return Response(ChatSummarySerializer(qs, many=True).data)

    def post(self, request):
        serializer = ChatCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        target = None
        if request.user.is_team:
            target = User.objects.filter(pk=serializer.validated_data.get("user_id"), role=Role.USUARIO).first()

        def go():
            chat = services.create_chat(
                title=serializer.validated_data["title"],
                body=serializer.validated_data["message"],
                creator=request.user,
                target_user=target,
            )
            return Response(_chat_detail(chat, request.user), status=status.HTTP_201_CREATED)

        return _run(go)


class ChatDetailView(APIView):
    def get(self, request, pk):
        summary = get_object_or_404(services.chats_with_meta(request.user), pk=pk)
        data = _chat_detail(summary, request.user, summary)  # `unread` refleja el estado ANTES de abrirlo
        services.mark_read(summary, request.user)
        return Response(data)


class MessageCreateView(APIView):
    def post(self, request, pk):
        chat = get_object_or_404(Chat.objects.visible_to(request.user), pk=pk)
        serializer = MessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        def go():
            services.post_message(chat, request.user, serializer.validated_data["body"])
            return Response(_chat_detail(chat, request.user), status=status.HTTP_201_CREATED)

        return _run(go)


class UnreadView(APIView):
    """Alimenta la campanita: chats con respuestas que todavía no leíste."""

    def get(self, request):
        qs = services.chats_with_meta(request.user).filter(unread=True)
        return Response({"count": qs.count(), "chats": ChatSummarySerializer(qs[:8], many=True).data})
