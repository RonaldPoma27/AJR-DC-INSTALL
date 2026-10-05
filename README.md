# AJR Data · Gestión de matafuegos con QR

Django + DRF + PostgreSQL (backend) · React + Vite + Tailwind v4 + TanStack Query/Table (frontend) · Docker.

## Puesta en marcha (Docker)

```bash
cp .env.example .env      # completá POSTGRES_PASSWORD, DJANGO_SECRET_KEY, ADMIN_*, PUBLIC_BASE_URL, dominio
docker compose up --build
```
Abrí `http://localhost:8080`. Al arrancar, el backend migra la base y crea el **único ADMIN**
con `ADMIN_EMAIL` / `ADMIN_PASSWORD` (si todavía no existe). Los mails salen por la consola del contenedor
`backend` hasta que configures SMTP en `.env`.

**Para la nube:** poné `PUBLIC_BASE_URL` con tu dominio real (es lo que codifica cada QR y los links de los emails),
`DJANGO_ALLOWED_HOSTS`, `DJANGO_CSRF_TRUSTED_ORIGINS` y `DJANGO_SECURE_COOKIES=1`; terminá el HTTPS en tu balanceador
(nginx respeta `X-Forwarded-Proto`). Solo el servicio `frontend` expone puerto.

## Desarrollo local (sin Docker)

```bash
# Backend  (SQLite para probar rápido)
cd backend && pip install -r requirements.txt
export DB_ENGINE=sqlite DJANGO_DEBUG=1 ADMIN_EMAIL=admin@x.com ADMIN_PASSWORD='Admin123!x'
python manage.py migrate && python manage.py ensure_admin && python manage.py runserver
python manage.py test            # 15 tests de las reglas de negocio

# Frontend (proxy de /api → :8000)
cd frontend && npm install && npm run dev      # http://localhost:5173
```

## Qué incluye

| Requisito | Dónde |
|---|---|
| Roles ADMIN / TECNICO / USUARIO; **un solo ADMIN** (restricción única en la base) | `accounts/models.py` |
| ADMIN asigna técnicos por email | `Equipo` (solo ADMIN) · `/api/admin/technicians/` |
| Contraseña 7–24, mayús., minús., número y especial (back y front) + ojito en todos los inputs | `accounts/validators.py` · `lib/password.ts` · `PasswordField` |
| Cambiar email/contraseña exige la contraseña actual | `accounts/serializers.py` |
| Chats: título obligatorio, 3.000 caracteres, **máx. 2 mensajes seguidos del usuario** hasta que responda el staff; el staff puede iniciar chats | `support/services.py` |
| Email automático por cada respuesta; campanita con contador (polling 30 s) | `support/services.py` · `NotificationBell.tsx` |
| Planilla TanStack Table: orden, filtros múltiples, paginación, alta rápida | `MatafuegoTable.tsx` · `MatafuegoForm.tsx` |
| **Semáforo híbrido**: automático por fechas + override manual (`estado_manual`) | `fire/models.py` |
| QR crudo: PNG puro, sin texto | `fire/qr.py` · `GET /api/matafuegos/:id/qr/` |
| Auditoría con `django-simple-history` (quién/cuándo/qué cambió) | modal «Historial» |
| `/m/:token`: ficha pública VIGENTE/VENCIDO sin datos sensibles; si escanea un TÉCNICO/ADMIN, aparece el formulario de control | `PublicMatafuego.tsx` |

## Decisiones a revisar

- **Semáforo:** vencido si hoy ≥ vencimiento; «próximo» si faltan ≤ `FIRE_WARNING_DAYS` (30). La instalación valida el rango y alimenta la barra de «vida útil». `venc_ph` se muestra pero **no** entra al semáforo (fácil de sumar en `Matafuego.estado_calculado`).
- **Ficha pública:** muestra solo estado, clase, vencimiento y último control (sin cliente, ubicación ni Nº de serie). «Próximo a vencer» se presenta como VIGENTE.
- **Cliente base (USUARIO):** en «Gestión de matafuegos» ve, en solo lectura, los equipos cuyo cliente tiene **su mismo email**.
- **Emails:** del usuario → al staff que ya participó en el chat (o a todo el staff si es el primer mensaje); del staff → al usuario.
- **Tablas:** orden/filtro/paginación se hacen en el navegador (cómodo hasta unos miles de equipos); si crece, pasar a paginación en servidor.
- **Sesión:** JWT (acceso 30 min, refresh 7 días) en `localStorage`.
- Django admin en `/django-admin/` (solo ADMIN).
