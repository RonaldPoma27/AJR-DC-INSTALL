from io import BytesIO

import qrcode
from django.conf import settings
from qrcode.constants import ERROR_CORRECT_M


def public_url(token) -> str:
    return f"{settings.PUBLIC_BASE_URL}/m/{token}"


def qr_png_bytes(token) -> bytes:
    """PNG crudo del QR: solo el código (con su zona de silencio estándar), sin texto ni marcos."""
    qr = qrcode.QRCode(version=None, error_correction=ERROR_CORRECT_M, box_size=12, border=4)
    qr.add_data(public_url(token))
    qr.make(fit=True)
    image = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()
