"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import include, path
from rest_framework.authtoken.views import obtain_auth_token

from apps.users.views import MeView, RegisterAPIView

urlpatterns = [
    path("admin/", admin.site.urls),
    # Vistas HTML (sesión + templates), no API.
    path("users/", include("apps.users.urls")),
    path("tasks/", include("apps.tasks.urls")),
    # API REST bajo /api/ (usada por el frontend, autenticada por
    # token o sesión según el endpoint).
    path("api/", include("apps.forms.urls")),
    path("api/token/", obtain_auth_token, name="api_token"),
    path("api/me/", MeView.as_view(), name="api_me"),
    path("api/register/", RegisterAPIView.as_view(), name="api_register"),
]
