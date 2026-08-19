from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    FormResponseViewSet,
    FormViewSet,
)

# Configuración del enrutador DRF
router = DefaultRouter()
router.register("forms", FormViewSet, basename="form")
router.register("responses", FormResponseViewSet, basename="response")

urlpatterns = [
    # Rutas automáticas del router REST (/forms/, /forms/<id>/, /responses/, etc.)
    path("", include(router.urls)),
]
