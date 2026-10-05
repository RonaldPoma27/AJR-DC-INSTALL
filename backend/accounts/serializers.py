from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Role, User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "full_name", "role")
        read_only_fields = fields


class TeamMemberSerializer(serializers.ModelSerializer):
    """Directorio: el email solo lo ve el staff."""

    class Meta:
        model = User
        fields = ("id", "full_name", "role", "email", "date_joined")
        read_only_fields = fields

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        if not (request and request.user.is_authenticated and request.user.is_team):
            data.pop("email", None)
        return data


def _email_taken(email, exclude_id=None):
    qs = User.objects.filter(email__iexact=email)
    if exclude_id:
        qs = qs.exclude(pk=exclude_id)
    return qs.exists()


class RegisterSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_email(self, value):
        if _email_taken(value):
            raise serializers.ValidationError("Ya existe una cuenta con ese email.")
        return value.lower()

    def validate(self, attrs):
        validate_password(attrs["password"])
        return attrs

    def create(self, validated):
        # El registro público SIEMPRE crea un USUARIO: ADMIN/TECNICO nunca se eligen desde acá.
        return User.objects.create_user(
            email=validated["email"],
            password=validated["password"],
            full_name=validated["full_name"].strip(),
            role=Role.USUARIO,
        )


class ProfileSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)


class _CurrentPasswordMixin:
    def validate_current_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("La contraseña actual no es correcta.")
        return value


class ChangePasswordSerializer(_CurrentPasswordMixin, serializers.Serializer):
    current_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        if attrs["current_password"] == attrs["new_password"]:
            raise serializers.ValidationError({"new_password": ["La nueva contraseña debe ser distinta de la actual."]})
        validate_password(attrs["new_password"], self.context["request"].user)
        return attrs


class ChangeEmailSerializer(_CurrentPasswordMixin, serializers.Serializer):
    current_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_email = serializers.EmailField()

    def validate_new_email(self, value):
        if _email_taken(value, exclude_id=self.context["request"].user.pk):
            raise serializers.ValidationError("Ya existe una cuenta con ese email.")
        return value.lower()


class AssignTechnicianSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        user = User.objects.filter(email__iexact=value, is_active=True).first()
        if not user:
            raise serializers.ValidationError("No hay un usuario registrado con ese correo.")
        if user.role == Role.ADMIN:
            raise serializers.ValidationError("Ese usuario es el administrador.")
        if user.role == Role.TECNICO:
            raise serializers.ValidationError("Ese usuario ya es técnico.")
        self.context["target"] = user
        return value
