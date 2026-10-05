from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.db.models import Q


class Role(models.TextChoices):
    ADMIN = "ADMIN", "Administrador"
    TECNICO = "TECNICO", "Técnico"
    USUARIO = "USUARIO", "Usuario"


TEAM_ROLES = (Role.ADMIN, Role.TECNICO)


class UserManager(BaseUserManager):
    use_in_migrations = True

    def get_by_natural_key(self, username):
        return self.get(email__iexact=username)

    def _create(self, email, password, **extra):
        if not email:
            raise ValueError("El email es obligatorio.")
        user = self.model(email=self.normalize_email(email).lower(), **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra):
        extra.setdefault("role", Role.USUARIO)
        return self._create(email, password, **extra)

    def create_superuser(self, email, password=None, **extra):
        extra["role"] = Role.ADMIN
        return self._create(email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    full_name = models.CharField("nombre completo", max_length=150)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.USUARIO, db_index=True)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = UserManager()
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        constraints = [
            # Regla de negocio: existe como máximo UN usuario ADMIN en todo el sistema (a nivel base de datos).
            models.UniqueConstraint(fields=["role"], condition=Q(role="ADMIN"), name="single_admin"),
        ]

    def save(self, *args, **kwargs):
        self.email = self.email.strip().lower()
        self.is_superuser = self.role == Role.ADMIN
        super().save(*args, **kwargs)

    @property
    def is_staff(self):  # acceso al /django-admin/ solo para el ADMIN
        return self.role == Role.ADMIN

    @property
    def is_team(self):
        return self.role in TEAM_ROLES

    def __str__(self):
        return f"{self.full_name} <{self.email}>"
