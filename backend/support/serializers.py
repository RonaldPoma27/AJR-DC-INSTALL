from django.conf import settings
from rest_framework import serializers

from .models import Message


class MessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.IntegerField(read_only=True)
    sender_name = serializers.CharField(source="sender.full_name", read_only=True)
    sender_role = serializers.CharField(source="sender.role", read_only=True)

    class Meta:
        model = Message
        fields = ("id", "sender_id", "sender_name", "sender_role", "body", "created_at")


class ChatSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    user_id = serializers.IntegerField()
    user_name = serializers.CharField(source="user.full_name")
    created_by_name = serializers.CharField(source="created_by.full_name")
    started_by_staff = serializers.BooleanField()
    last_message_at = serializers.DateTimeField()
    last_message_preview = serializers.SerializerMethodField()
    last_sender_name = serializers.CharField(allow_null=True)
    unread = serializers.BooleanField()

    def get_last_message_preview(self, obj):
        return (getattr(obj, "last_body", "") or "")[:140]


class ChatCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=120)
    message = serializers.CharField(max_length=settings.SUPPORT_MAX_MESSAGE_LENGTH)
    user_id = serializers.IntegerField(required=False)


class MessageCreateSerializer(serializers.Serializer):
    body = serializers.CharField(max_length=settings.SUPPORT_MAX_MESSAGE_LENGTH)
