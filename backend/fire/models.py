import uuid
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from simple_history.models import HistoricalRecords


class Cliente(models.Model):
    nombre = models.CharField(max_length=200)
    email = models.EmailField(blank=True)
    telefono = models.CharField(max_length=40, blank=True)
    direccion = models.CharField(max_length=250, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


class Estado(models.TextChoices):
    VIGENTE = "VIGENTE", "Vigente"
    PROXIMO = "PROXIMO", "Próximo a vencer"
    VENCIDO = "VENCIDO", "Vencido"


class Clase(models.TextChoices):
    A = "A", "A"
    B = "B", "B"
    C = "C", "C"
    ABC = "ABC", "ABC"
    BC = "BC", "BC"
    D = "D", "D"
    K = "K", "K"
    CO2 = "CO2", "CO₂"
    AGUA = "AGUA", "Agua"


class Matafuego(models.Model):
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name="matafuegos")
    nro_serie = models.CharField("Nº de serie", max_length=60, unique=True)
    clase = models.CharField(max_length=5, choices=Clase.choices)
    ubicacion = models.CharField("ubicación", max_length=200)
    fecha_instalacion = models.DateField("fecha de instalación")
    fecha_vencimiento_estimado = models.DateField("vencimiento estimado")
    venc_ph = models.DateField("vencimiento PH", null=True, blank=True)
    token_qr = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    # Ajuste manual del semáforo. Vacío = automático.
    estado_manual = models.CharField(max_length=10, choices=Estado.choices, blank=True, default="")

    history = HistoricalRecords()  # auditoría: qué usuario y cuándo modificó cada matafuego

    class Meta:
        ordering = ["fecha_vencimiento_estimado", "nro_serie"]
        verbose_name_plural = "matafuegos"

    def __str__(self):
        return self.nro_serie

    def clean(self):
        if self.fecha_instalacion and self.fecha_vencimiento_estimado:
            if self.fecha_vencimiento_estimado <= self.fecha_instalacion:
                raise ValidationError("El vencimiento debe ser posterior a la instalación.")

    # ---- semáforo híbrido -------------------------------------------------
    @property
    def dias_restantes(self) -> int:
        return (self.fecha_vencimiento_estimado - timezone.localdate()).days

    @property
    def vida_util_pct(self) -> int:
        """% de la vida útil transcurrido entre instalación y vencimiento (0–100)."""
        total = (self.fecha_vencimiento_estimado - self.fecha_instalacion).days
        if total <= 0:
            return 100
        elapsed = (timezone.localdate() - self.fecha_instalacion).days
        return max(0, min(100, round(elapsed * 100 / total)))

    @property
    def estado_calculado(self) -> str:
        restantes = self.dias_restantes
        if restantes <= 0:
            return Estado.VENCIDO
        if restantes <= settings.FIRE_WARNING_DAYS:
            return Estado.PROXIMO
        return Estado.VIGENTE

    @property
    def estado(self) -> str:
        """Estado efectivo: el ajuste manual (si existe) manda sobre el cálculo automático."""
        return self.estado_manual or self.estado_calculado

    @property
    def estado_origen(self) -> str:
        return "MANUAL" if self.estado_manual else "AUTO"


class Control(models.Model):
    """Control en campo cargado por un técnico al escanear el QR."""

    class Resultado(models.TextChoices):
        APTO = "APTO", "Apto"
        OBSERVADO = "OBSERVADO", "Con observaciones"
        NO_APTO = "NO_APTO", "No apto"

    matafuego = models.ForeignKey(Matafuego, on_delete=models.CASCADE, related_name="controles")
    tecnico = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    fecha = models.DateTimeField(default=timezone.now)
    resultado = models.CharField(max_length=10, choices=Resultado.choices)
    manometro_ok = models.BooleanField("manómetro en zona verde", default=True)
    precinto_ok = models.BooleanField("precinto y traba intactos", default=True)
    observaciones = models.TextField(blank=True, max_length=1000)

    class Meta:
        ordering = ["-fecha", "-id"]


