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


class FormViewSet(viewsets.ModelViewSet):

    serializer_class = FormSerializer

    permission_classes = [
        IsFormCreatorOrReadOnly,
    ]

    def get_queryset(self):

        queryset = Form.objects.select_related("created_by").prefetch_related(
            "fields__choices"
        )

        user = self.request.user

        # --------------------------------------------------
        # ANÓNIMO
        # --------------------------------------------------

        if not user.is_authenticated:
            return queryset.filter(is_active=True)

        # --------------------------------------------------
        # STAFF / SUPERUSER
        # --------------------------------------------------

        if user.is_staff or user.is_superuser:
            return queryset

        # --------------------------------------------------
        # USUARIO AUTENTICADO
        # --------------------------------------------------

        return queryset.filter(Q(is_active=True) | Q(created_by=user))

    def perform_create(self, serializer):

        serializer.save(created_by=self.request.user)


class FormResponseViewSet(viewsets.ModelViewSet):

    permission_classes = [
        IsResponseOwnerOrStaff,
    ]

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

        # --------------------------------------------------
        # ANÓNIMO
        # --------------------------------------------------

        if not user.is_authenticated:
            return queryset.none()

        # --------------------------------------------------
        # STAFF / SUPERUSER
        # --------------------------------------------------

        if user.is_staff or user.is_superuser:
            return queryset

        # --------------------------------------------------
        # USUARIO AUTENTICADO
        # --------------------------------------------------

        return queryset.filter(form__created_by=user)

    def perform_create(self, serializer):

        user = self.request.user

        if user.is_authenticated:

            serializer.save(respondent=user)

        else:

            serializer.save(respondent=None)
