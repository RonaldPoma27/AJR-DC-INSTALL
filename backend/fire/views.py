from django.db.models import Count, Max
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import SAFE_METHODS, AllowAny, BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from accounts.permissions import IsTeam

from .models import Cliente, Estado, Matafuego
from .qr import qr_png_bytes
from .serializers import ClienteSerializer, ControlSerializer, MatafuegoSerializer

HISTORY_LABELS = {"+": "Creado", "~": "Modificado", "-": "Eliminado"}


class TeamOrOwnReadOnly(BasePermission):
    """Staff: todo. Cliente base: solo lectura de lo suyo (list/retrieve)."""

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.is_team:
            return True
        return request.method in SAFE_METHODS and getattr(view, "action", None) in ("list", "retrieve")


class ClienteViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsTeam]
    serializer_class = ClienteSerializer
    queryset = Cliente.objects.annotate(matafuegos_count=Count("matafuegos"))
    pagination_class = None


class MatafuegoViewSet(viewsets.ModelViewSet):
    serializer_class = MatafuegoSerializer
    permission_classes = [TeamOrOwnReadOnly]
    pagination_class = None

    def get_permissions(self):
        if self.action in ("qr", "historial", "controles", "por_token"):
            return [IsAuthenticated(), IsTeam()]
        return super().get_permissions()

    def get_queryset(self):
        qs = Matafuego.objects.select_related("cliente").annotate(ultimo_control=Max("controles__fecha"))
        user = self.request.user
        if not user.is_team:  # el cliente base ve los matafuegos cuyo cliente tiene SU email
            qs = qs.filter(cliente__email__iexact=user.email)
        return qs

    @action(detail=True, methods=["get"])
    def qr(self, request, pk=None):
        """PNG crudo del QR (sin texto) vinculado al token del matafuego."""
        matafuego = self.get_object()
        response = HttpResponse(qr_png_bytes(matafuego.token_qr), content_type="image/png")
        response["Content-Disposition"] = f'attachment; filename="qr-{matafuego.nro_serie}.png"'
        return response

    @action(detail=True, methods=["get"])
    def historial(self, request, pk=None):
        """Auditoría (django-simple-history): quién y cuándo modificó, con el detalle de cada cambio."""
        records = list(self.get_object().history.select_related("history_user").order_by("-history_date", "-history_id"))
        out = []
        for i, rec in enumerate(records):
            changes = []
            prev = records[i + 1] if i + 1 < len(records) else None
            if rec.history_type == "~" and prev is not None:
                for ch in rec.diff_against(prev).changes:
                    changes.append({"campo": ch.field, "antes": str(ch.old or ""), "despues": str(ch.new or "")})
            user = rec.history_user
            out.append(
                {
                    "id": rec.history_id,
                    "fecha": rec.history_date,
                    "tipo": HISTORY_LABELS.get(rec.history_type, rec.history_type),
                    "usuario": (user.full_name or user.email) if user else "—",
                    "cambios": changes,
                }
            )
        return Response(out)

    @action(detail=True, methods=["get", "post"])
    def controles(self, request, pk=None):
        matafuego = self.get_object()
        if request.method == "GET":
            return Response(ControlSerializer(matafuego.controles.select_related("tecnico")[:20], many=True).data)
        serializer = ControlSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(matafuego=matafuego, tecnico=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path=r"por-token/(?P<token>[0-9a-fA-F-]{36})")
    def por_token(self, request, token=None):
        """Ficha completa para el staff que escanea el QR en campo."""
        matafuego = get_object_or_404(self.get_queryset(), token_qr=token)
        return Response(self.get_serializer(matafuego).data)


class PublicMatafuegoView(APIView):
    """Ficha pública del QR: sin sesión y SIN datos sensibles (ni cliente, ni ubicación, ni Nº de serie)."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "public"

    def get(self, request, token):
        m = get_object_or_404(Matafuego.objects.annotate(ultimo_control=Max("controles__fecha")), token_qr=token)
        return Response(
            {
                "estado": "VENCIDO" if m.estado == Estado.VENCIDO else "VIGENTE",
                "clase": m.clase,
                "fecha_vencimiento": m.fecha_vencimiento_estimado,
                "ultimo_control": m.ultimo_control,
            }
        )
