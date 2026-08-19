"""
URL configuration for config project.
"""

from django.contrib import admin
from django.urls import include, path
from rest_framework.authtoken.views import obtain_auth_token

from apps.forms.views import health_check
from apps.users.views import MeView, RegisterAPIView

urlpatterns = [
    # Panel de administración de Django
    path("admin/", admin.site.urls),
    # Vistas HTML (Sesión + Templates web)
    path("users/", include("apps.users.urls")),
    path("tasks/", include("apps.tasks.urls")),
    # =========================================================
    # API REST (Endpoints Globales)
    # =========================================================
    path("api/ping/", health_check, name="api_ping"),
    path("api/token/", obtain_auth_token, name="api_token"),
    path("api/me/", MeView.as_view(), name="api_me"),
    path("api/register/", RegisterAPIView.as_view(), name="api_register"),
    # Recurso dinámico de Formularios y Respuestas
    path("api/", include("apps.forms.urls")),
]
