from django.db.models import Case, IntegerField, Value, When
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Role, User
from .permissions import IsAdminRole
from .serializers import (
    AssignTechnicianSerializer,
    ChangeEmailSerializer,
    ChangePasswordSerializer,
    ProfileSerializer,
    RegisterSerializer,
    TeamMemberSerializer,
    UserSerializer,
)


class LoginView(TokenObtainPairView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"


class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {"user": UserSerializer(user).data, "access": str(refresh.access_token), "refresh": str(refresh)},
            status=status.HTTP_201_CREATED,
        )


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = ProfileSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        request.user.full_name = serializer.validated_data["full_name"].strip()
        request.user.save(update_fields=["full_name"])
        return Response(UserSerializer(request.user).data)


class ChangePasswordView(APIView):
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        return Response({"detail": "Contraseña actualizada."})


class ChangeEmailView(APIView):
    def post(self, request):
        serializer = ChangeEmailSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.email = serializer.validated_data["new_email"]
        request.user.save(update_fields=["email"])
        return Response(UserSerializer(request.user).data)


class TeamListView(generics.ListAPIView):
    """Directorio de todos los usuarios registrados (Equipo)."""

    serializer_class = TeamMemberSerializer
    pagination_class = None

    def get_queryset(self):
        rank = Case(
            When(role=Role.ADMIN, then=Value(0)),
            When(role=Role.TECNICO, then=Value(1)),
            default=Value(2),
            output_field=IntegerField(),
        )
        return User.objects.filter(is_active=True).order_by(rank, "full_name")


class TechnicianListAssignView(APIView):
    """Solo ADMIN: lista técnicos y asigna el rol a un usuario ya registrado por su email."""

    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        qs = User.objects.filter(role=Role.TECNICO).order_by("full_name")
        return Response(TeamMemberSerializer(qs, many=True, context={"request": request}).data)

    def post(self, request):
        serializer = AssignTechnicianSerializer(data=request.data, context={})
        serializer.is_valid(raise_exception=True)
        target = serializer.context["target"]
        target.role = Role.TECNICO
        target.save(update_fields=["role"])
        return Response(TeamMemberSerializer(target, context={"request": request}).data, status=status.HTTP_201_CREATED)


class TechnicianDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def delete(self, request, pk):
        try:
            user = User.objects.get(pk=pk, role=Role.TECNICO)
        except User.DoesNotExist:
            return Response({"detail": "Técnico no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        user.role = Role.USUARIO
        user.save(update_fields=["role"])
        return Response(status=status.HTTP_204_NO_CONTENT)
