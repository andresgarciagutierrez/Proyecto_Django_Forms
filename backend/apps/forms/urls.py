from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    FormResponseViewSet,
    FormViewSet,
)

router = DefaultRouter()
router.register("forms", FormViewSet, basename="form")
router.register("responses", FormResponseViewSet, basename="response")

urlpatterns = [
    path("", include(router.urls)),
]
