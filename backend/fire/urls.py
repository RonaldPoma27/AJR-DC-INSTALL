from django.urls import path
from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register("clientes", views.ClienteViewSet, basename="cliente")
router.register("matafuegos", views.MatafuegoViewSet, basename="matafuego")

urlpatterns = [
    path("public/m/<uuid:token>/", views.PublicMatafuegoView.as_view()),
    *router.urls,
]
