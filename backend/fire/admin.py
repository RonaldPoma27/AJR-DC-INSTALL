from django.contrib import admin
from simple_history.admin import SimpleHistoryAdmin

from .models import Cliente, Control, Matafuego


@admin.register(Matafuego)
class MatafuegoAdmin(SimpleHistoryAdmin):
    list_display = ("nro_serie", "cliente", "clase", "fecha_vencimiento_estimado", "estado_manual")
    search_fields = ("nro_serie", "cliente__nombre")


admin.site.register(Cliente)
admin.site.register(Control)
