from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/", include("accounts.urls")),
    path("api/", include("support.urls")),
    path("api/", include("fire.urls")),
]
