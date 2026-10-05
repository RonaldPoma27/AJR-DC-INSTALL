from datetime import timedelta

from django.core import mail
from django.db import IntegrityError, transaction
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Role, User
from fire.models import Cliente, Matafuego
from support.models import Chat

PASS = "Abcde1!x"


def make_user(email, role=Role.USUARIO, name=None):
    return User.objects.create_user(email, PASS, full_name=name or email.split("@")[0], role=role)


def client_for(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


class AccountsTests(TestCase):
    def test_only_one_admin(self):
        make_user("a@x.com", Role.ADMIN)
        with self.assertRaises(IntegrityError), transaction.atomic():
            make_user("b@x.com", Role.ADMIN)

    def test_register_creates_usuario_and_enforces_password_policy(self):
        c = APIClient()
        bad = c.post("/api/auth/register/", {"full_name": "N", "email": "n@x.com", "password": "abc"}, format="json")
        self.assertEqual(bad.status_code, 400)
        for pw in ("abcdef1!", "ABCDEF1!", "Abcdefg!", "Abcdefg1", "Ab1!" + "x" * 21):  # falta algo / larga
            r = c.post("/api/auth/register/", {"full_name": "N", "email": "n@x.com", "password": pw}, format="json")
            self.assertEqual(r.status_code, 400, pw)
        ok = c.post(
            "/api/auth/register/", {"full_name": "N", "email": "N@x.com", "password": PASS, "role": "ADMIN"}, format="json"
        )
        self.assertEqual(ok.status_code, 201)
        self.assertEqual(ok.data["user"]["role"], "USUARIO")

    def test_change_password_and_email_need_current_password(self):
        u = make_user("u@x.com")
        c = client_for(u)
        self.assertEqual(c.post("/api/me/password/", {"current_password": "mal", "new_password": "Nueva1!ab"}).status_code, 400)
        self.assertEqual(c.post("/api/me/password/", {"current_password": PASS, "new_password": "Nueva1!ab"}).status_code, 200)
        self.assertEqual(c.post("/api/me/email/", {"current_password": PASS, "new_email": "z@x.com"}).status_code, 400)
        self.assertEqual(c.post("/api/me/email/", {"current_password": "Nueva1!ab", "new_email": "z@x.com"}).status_code, 200)

    def test_admin_assigns_technician_by_email(self):
        admin, u = make_user("a@x.com", Role.ADMIN), make_user("u@x.com")
        self.assertEqual(client_for(u).post("/api/admin/technicians/", {"email": "u@x.com"}).status_code, 403)
        c = client_for(admin)
        self.assertEqual(c.post("/api/admin/technicians/", {"email": "nadie@x.com"}).status_code, 400)
        self.assertEqual(c.post("/api/admin/technicians/", {"email": "U@x.com"}).status_code, 201)
        u.refresh_from_db()
        self.assertEqual(u.role, Role.TECNICO)

    def test_directory_hides_email_from_usuarios(self):
        u, t = make_user("u@x.com"), make_user("t@x.com", Role.TECNICO)
        self.assertNotIn("email", client_for(u).get("/api/team/").data[0])
        self.assertIn("email", client_for(t).get("/api/team/").data[0])


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class SupportTests(TestCase):
    def setUp(self):
        self.user = make_user("u@x.com")
        self.tech = make_user("t@x.com", Role.TECNICO)
        self.admin = make_user("a@x.com", Role.ADMIN)

    def test_antispam_two_consecutive_then_staff_resets(self):
        c = client_for(self.user)
        r = c.post("/api/support/chats/", {"title": "Hola", "message": "uno"}, format="json")
        self.assertEqual(r.status_code, 201)
        chat_id = r.data["id"]
        self.assertEqual(r.data["remaining"], 1)
        self.assertEqual(c.post(f"/api/support/chats/{chat_id}/messages/", {"body": "dos"}).status_code, 201)
        self.assertEqual(c.post(f"/api/support/chats/{chat_id}/messages/", {"body": "tres"}).status_code, 403)
        self.assertEqual(client_for(self.tech).post(f"/api/support/chats/{chat_id}/messages/", {"body": "resp"}).status_code, 201)
        r = c.post(f"/api/support/chats/{chat_id}/messages/", {"body": "otra"})
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["remaining"], 1)

    def test_message_length_limit(self):
        c = client_for(self.user)
        r = c.post("/api/support/chats/", {"title": "T", "message": "x" * 3001}, format="json")
        self.assertEqual(r.status_code, 400)
        r = c.post("/api/support/chats/", {"title": "T", "message": "x" * 3000}, format="json")
        self.assertEqual(r.status_code, 201)

    def test_staff_can_start_chat_with_user_and_user_cannot_see_others(self):
        c = client_for(self.tech)
        r = c.post("/api/support/chats/", {"title": "Aviso", "message": "Hola", "user_id": self.user.id}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["remaining"], None)
        self.assertEqual(r.data["user_id"], self.user.id)
        other = make_user("o@x.com")
        self.assertEqual(client_for(other).get(f"/api/support/chats/{r.data['id']}/").status_code, 404)
        self.assertEqual(c.post("/api/support/chats/", {"title": "x", "message": "y"}, format="json").status_code, 400)

    def test_bell_counts_unread_and_emails_are_sent(self):
        with self.captureOnCommitCallbacks(execute=True):
            r = client_for(self.tech).post(
                "/api/support/chats/", {"title": "Aviso", "message": "Hola", "user_id": self.user.id}, format="json"
            )
        self.assertEqual(client_for(self.user).get("/api/support/unread/").data["count"], 1)
        self.assertEqual([m.to for m in mail.outbox], [[self.user.email]])
        client_for(self.user).get(f"/api/support/chats/{r.data['id']}/")  # lo abre
        self.assertEqual(client_for(self.user).get("/api/support/unread/").data["count"], 0)
        with self.captureOnCommitCallbacks(execute=True):
            client_for(self.user).post(f"/api/support/chats/{r.data['id']}/messages/", {"body": "gracias"})
        self.assertIn(self.tech.email, [a for m in mail.outbox for a in m.to])  # avisa al staff que participó
        self.assertEqual(client_for(self.tech).get("/api/support/unread/").data["count"], 1)


class FireTests(TestCase):
    def setUp(self):
        self.tech = make_user("t@x.com", Role.TECNICO)
        self.user = make_user("cli@x.com")
        self.cliente = Cliente.objects.create(nombre="ACME", email="cli@x.com")
        self.c = client_for(self.tech)

    def payload(self, **kw):
        today = timezone.localdate()
        base = {
            "cliente": self.cliente.id, "nro_serie": "S-1", "clase": "ABC", "ubicacion": "Depósito",
            "fecha_instalacion": str(today - timedelta(days=300)),
            "fecha_vencimiento_estimado": str(today + timedelta(days=65)),
        }
        base.update(kw)
        return base

    def test_semaforo_and_manual_override(self):
        today = timezone.localdate()
        r = self.c.post("/api/matafuegos/", self.payload(), format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["estado"], "VIGENTE")
        mid = r.data["id"]
        r = self.c.patch(f"/api/matafuegos/{mid}/", {"fecha_vencimiento_estimado": str(today + timedelta(days=10))}, format="json")
        self.assertEqual(r.data["estado"], "PROXIMO")
        r = self.c.patch(f"/api/matafuegos/{mid}/", {"fecha_vencimiento_estimado": str(today - timedelta(days=1))}, format="json")
        self.assertEqual((r.data["estado"], r.data["estado_origen"]), ("VENCIDO", "AUTO"))
        r = self.c.patch(f"/api/matafuegos/{mid}/", {"estado_manual": "VIGENTE"}, format="json")
        self.assertEqual((r.data["estado"], r.data["estado_calculado"], r.data["estado_origen"]), ("VIGENTE", "VENCIDO", "MANUAL"))
        r = self.c.patch(f"/api/matafuegos/{mid}/", {"estado_manual": ""}, format="json")
        self.assertEqual(r.data["estado"], "VENCIDO")

    def test_invalid_dates_rejected(self):
        today = str(timezone.localdate())
        r = self.c.post("/api/matafuegos/", self.payload(fecha_instalacion=today, fecha_vencimiento_estimado=today), format="json")
        self.assertEqual(r.status_code, 400)

    def test_qr_is_raw_png(self):
        mid = self.c.post("/api/matafuegos/", self.payload(), format="json").data["id"]
        r = self.c.get(f"/api/matafuegos/{mid}/qr/")
        self.assertEqual(r["Content-Type"], "image/png")
        self.assertTrue(r.content.startswith(b"\x89PNG\r\n\x1a\n"))
        self.assertEqual(client_for(self.user).get(f"/api/matafuegos/{mid}/qr/").status_code, 403)

    def test_public_scan_has_no_sensitive_data_and_tech_scan_has_form(self):
        data = self.c.post("/api/matafuegos/", self.payload(), format="json").data
        pub = APIClient().get(f"/api/public/m/{data['token_qr']}/")
        self.assertEqual(pub.status_code, 200)
        self.assertEqual(pub.data["estado"], "VIGENTE")
        for secret in ("cliente", "cliente_nombre", "ubicacion", "nro_serie", "token_qr"):
            self.assertNotIn(secret, pub.data)
        self.assertEqual(APIClient().get(f"/api/matafuegos/por-token/{data['token_qr']}/").status_code, 401)
        full = self.c.get(f"/api/matafuegos/por-token/{data['token_qr']}/")
        self.assertEqual(full.data["nro_serie"], "S-1")
        r = self.c.post(f"/api/matafuegos/{data['id']}/controles/", {"resultado": "APTO"}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["tecnico_nombre"], "t")
        self.assertEqual(client_for(self.user).post(f"/api/matafuegos/{data['id']}/controles/", {"resultado": "APTO"}).status_code, 403)

    def test_audit_history_records_user(self):
        mid = self.c.post("/api/matafuegos/", self.payload(), format="json").data["id"]
        self.c.patch(f"/api/matafuegos/{mid}/", {"ubicacion": "Oficina"}, format="json")
        h = self.c.get(f"/api/matafuegos/{mid}/historial/").data
        self.assertEqual([x["tipo"] for x in h], ["Modificado", "Creado"])
        self.assertEqual(h[0]["usuario"], "t")
        self.assertEqual(h[0]["cambios"][0]["campo"], "ubicacion")

    def test_cliente_base_sees_only_own_readonly(self):
        self.c.post("/api/matafuegos/", self.payload(), format="json")
        other = Cliente.objects.create(nombre="Otro", email="otro@x.com")
        self.c.post("/api/matafuegos/", self.payload(nro_serie="S-2", cliente=other.id), format="json")
        cu = client_for(self.user)
        rows = cu.get("/api/matafuegos/").data
        self.assertEqual([r["nro_serie"] for r in rows], ["S-1"])
        self.assertNotIn("token_qr", rows[0])
        self.assertEqual(cu.post("/api/matafuegos/", self.payload(nro_serie="S-3"), format="json").status_code, 403)
        self.assertEqual(cu.delete(f"/api/matafuegos/{rows[0]['id']}/").status_code, 403)
