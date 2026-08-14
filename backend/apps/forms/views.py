from django.db.models import Q
from rest_framework import viewsets

from .models import Form, FormResponse

from .permissions import (
    IsFormCreatorOrReadOnly,
    IsResponseOwnerOrStaff,
)

from .serializers import (
    FormResponseDetailSerializer,
    FormResponseSerializer,
    FormSerializer,
)

# =========================================================
# FORMULARIOS
# =========================================================


class FormViewSet(viewsets.ModelViewSet):

    serializer_class = FormSerializer
    permission_classes = [IsFormCreatorOrReadOnly]

    def get_queryset(self):
        queryset = Form.objects.select_related("created_by").prefetch_related(
            "fields__choices"
        )

        user = self.request.user

        if not user.is_authenticated:
            return queryset.filter(is_active=True)

        if user.is_staff or user.is_superuser:
            return queryset

        return queryset.filter(Q(is_active=True) | Q(created_by=user))

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


# =========================================================
# RESPUESTAS
# =========================================================


class FormResponseViewSet(viewsets.ModelViewSet):
    """
    Respuestas de formularios.

    No se habilitan PUT/PATCH: una vez enviada, una respuesta
    no se edita (evita que se puedan alterar document_number,
    form, etc. saltándose las validaciones de negocio que solo
    corren en la creación). Solo se permite crear, consultar y
    eliminar.
    """

    http_method_names = ["get", "post", "delete", "head", "options"]

    permission_classes = [IsResponseOwnerOrStaff]

    def get_serializer_class(self):
        if self.action == "create":
            return FormResponseSerializer
        return FormResponseDetailSerializer

    def get_queryset(self):
        queryset = FormResponse.objects.select_related(
            "form",
            "respondent",
        ).prefetch_related(
            "answers__field",
            "answers__selected_choices",
        )

        user = self.request.user

        if not user.is_authenticated:
            return queryset.none()

        if user.is_staff or user.is_superuser:
            return queryset

        return queryset.filter(form__created_by=user)

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(respondent=user if user.is_authenticated else None)
