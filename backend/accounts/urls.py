from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path("auth/register/", views.RegisterView.as_view()),
    path("auth/login/", views.LoginView.as_view()),
    path("auth/refresh/", TokenRefreshView.as_view()),
    path("me/", views.MeView.as_view()),
    path("me/password/", views.ChangePasswordView.as_view()),
    path("me/email/", views.ChangeEmailView.as_view()),
    path("team/", views.TeamListView.as_view()),
    path("admin/technicians/", views.TechnicianListAssignView.as_view()),
    path("admin/technicians/<int:pk>/", views.TechnicianDetailView.as_view()),
]
