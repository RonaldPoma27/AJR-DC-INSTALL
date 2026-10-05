from rest_framework.permissions import BasePermission

from .models import Role


class IsTeam(BasePermission):
    """ADMIN o TECNICO."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_team)


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == Role.ADMIN)
