from django.urls import path

from . import views

urlpatterns = [
    path("support/chats/", views.ChatListCreateView.as_view()),
    path("support/chats/<int:pk>/", views.ChatDetailView.as_view()),
    path("support/chats/<int:pk>/messages/", views.MessageCreateView.as_view()),
    path("support/unread/", views.UnreadView.as_view()),
]
