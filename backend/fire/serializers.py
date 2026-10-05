from rest_framework import serializers

from .models import Cliente, Control, Matafuego


class ClienteSerializer(serializers.ModelSerializer):
    matafuegos_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Cliente
        fields = ("id", "nombre", "email", "telefono", "direccion", "matafuegos_count")


class MatafuegoSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source="cliente.nombre", read_only=True)
    estado = serializers.CharField(read_only=True)
    estado_calculado = serializers.CharField(read_only=True)
    estado_origen = serializers.CharField(read_only=True)
    dias_restantes = serializers.IntegerField(read_only=True)
    vida_util_pct = serializers.IntegerField(read_only=True)
    ultimo_control = serializers.DateTimeField(read_only=True, default=None)

    class Meta:
        model = Matafuego
        fields = (
            "id", "cliente", "cliente_nombre", "nro_serie", "clase", "ubicacion",
            "fecha_instalacion", "fecha_vencimiento_estimado", "venc_ph", "token_qr",
            "estado_manual", "estado", "estado_calculado", "estado_origen",
            "dias_restantes", "vida_util_pct", "ultimo_control",
        )
        read_only_fields = ("token_qr",)

    def validate(self, attrs):
        inst = self.instance
        install = attrs.get("fecha_instalacion", getattr(inst, "fecha_instalacion", None))
        venc = attrs.get("fecha_vencimiento_estimado", getattr(inst, "fecha_vencimiento_estimado", None))
        if install and venc and venc <= install:
            raise serializers.ValidationError(
                {"fecha_vencimiento_estimado": "El vencimiento debe ser posterior a la instalación."}
            )
        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        if request and not request.user.is_team:  # el cliente base no ve el token ni los ajustes internos
            data.pop("token_qr", None)
            data.pop("estado_manual", None)
        return data


class ControlSerializer(serializers.ModelSerializer):
    tecnico_nombre = serializers.CharField(source="tecnico.full_name", read_only=True, default="")

    class Meta:
        model = Control
        fields = ("id", "fecha", "resultado", "manometro_ok", "precinto_ok", "observaciones", "tecnico_nombre")
        read_only_fields = ("id", "fecha", "tecnico_nombre")
