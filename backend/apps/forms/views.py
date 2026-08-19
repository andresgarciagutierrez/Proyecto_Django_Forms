from django.db.models import Q, ProtectedError
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

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

    def destroy(self, request, *args, **kwargs):
        """
        Captura de errores de restricción de clave foránea (PROTECT)
        para evitar HTTP 500 si el formulario contiene respuestas.
        """
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {
                    "detail": "No se puede eliminar el formulario porque tiene respuestas o datos vinculados protegidos."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


# =========================================================
# RESPUESTAS
# =========================================================


class FormResponseViewSet(viewsets.ModelViewSet):
    """
    Respuestas de formularios.

    No se habilitan PUT/PATCH: una vez enviada, una respuesta
    no se edita. Solo se permite crear, consultar y eliminar.
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

        # Permite acceder si el usuario es el creador del formulario O el autor de la respuesta
        return queryset.filter(Q(form__created_by=user) | Q(respondent=user))

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(respondent=user if user.is_authenticated else None)

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {
                    "detail": "No se puede eliminar la respuesta debido a registros de auditoría o dependencias asociadas."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


# =========================================================
# HEALTH CHECK
# =========================================================


@api_view(["GET", "HEAD", "OPTIONS"])
@permission_classes([AllowAny])
def health_check(request):
    """
    Endpoint público para pruebas de conectividad y ping desde el cliente.
    """
    return Response({"status": "ok"})
