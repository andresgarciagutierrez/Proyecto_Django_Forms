from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    FormResponseViewSet,
    FormViewSet,
)

router = DefaultRouter()


# =========================================================
# FORMULARIOS
# =========================================================

router.register(
    "forms",
    FormViewSet,
    basename="form",
)


# =========================================================
# RESPUESTAS
# =========================================================

router.register(
    "responses",
    FormResponseViewSet,
    basename="response",
)


# =========================================================
# URLS
# =========================================================

urlpatterns = [
    path(
        "",
        include(router.urls),
    ),
]
