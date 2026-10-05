import os

from django.contrib.auth.password_validation import validate_password
from django.core.management.base import BaseCommand, CommandError

from accounts.models import Role, User


class Command(BaseCommand):
    help = "Crea el único ADMIN a partir de ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_FULL_NAME (si no existe ya uno)."

    def handle(self, *args, **options):
        if User.objects.filter(role=Role.ADMIN).exists():
            self.stdout.write("Ya existe un ADMIN; no se hace nada.")
            return
        email = os.environ.get("ADMIN_EMAIL", "").strip()
        password = os.environ.get("ADMIN_PASSWORD", "")
        if not email or not password:
            self.stdout.write(self.style.WARNING("ADMIN_EMAIL/ADMIN_PASSWORD no definidos: no se creó ADMIN."))
            return
        try:
            validate_password(password)
        except Exception as exc:
            raise CommandError(f"ADMIN_PASSWORD no cumple la política: {exc}")
        name = os.environ.get("ADMIN_FULL_NAME", "Administrador")
        existing = User.objects.filter(email__iexact=email).first()
        if existing:
            existing.role = Role.ADMIN
            existing.set_password(password)
            existing.save()
        else:
            User.objects.create_superuser(email=email, password=password, full_name=name)
        self.stdout.write(self.style.SUCCESS(f"ADMIN listo: {email}"))
