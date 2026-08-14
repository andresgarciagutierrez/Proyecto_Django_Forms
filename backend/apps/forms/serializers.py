from django.db import transaction
from rest_framework import serializers

from .models import (
    FieldChoice,
    Form,
    FormAnswer,
    FormField,
    FormResponse,
)

# =========================================================
# OPCIONES
# =========================================================


class FieldChoiceSerializer(serializers.ModelSerializer):

    # order es opcional: si no se envía, se autoasigna por
    # posición dentro de la lista (ver FormSerializer).
    order = serializers.IntegerField(required=False, default=None)

    class Meta:
        model = FieldChoice
        fields = ["id", "text", "order"]
        read_only_fields = ["id"]

    def validate_text(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError(
                "El texto de la opción no puede estar vacío."
            )
        return value


# =========================================================
# CAMPOS
# =========================================================


class FormFieldSerializer(serializers.ModelSerializer):

    id = serializers.IntegerField(required=False)
    order = serializers.IntegerField(required=False, default=None)
    choices = FieldChoiceSerializer(many=True, required=False)

    CHOICE_TYPES = {
        FormField.FieldType.SINGLE_CHOICE,
        FormField.FieldType.MULTIPLE_CHOICE,
    }

    class Meta:
        model = FormField
        fields = ["id", "label", "field_type", "is_required", "order", "choices"]

    def validate(self, attrs):
        field_type = attrs.get("field_type")
        choices = attrs.get("choices", [])

        if field_type in self.CHOICE_TYPES:
            valid_choices = [c for c in choices if c.get("text", "").strip()]
            if len(valid_choices) < 2:
                raise serializers.ValidationError(
                    {
                        "choices": "Los campos de selección requieren al menos "
                        "2 opciones con texto."
                    }
                )
        elif choices:
            raise serializers.ValidationError(
                {"choices": "Este tipo de campo no permite opciones."}
            )

        return attrs


# =========================================================
# FORMULARIOS
# =========================================================


class FormSerializer(serializers.ModelSerializer):

    fields = FormFieldSerializer(many=True, required=False)
    created_by = serializers.ReadOnlyField(source="created_by.username")

    class Meta:
        model = Form
        fields = [
            "id",
            "title",
            "description",
            "created_by",
            "allow_multiple_responses",
            "is_active",
            "created_at",
            "fields",
        ]
        read_only_fields = ["id", "created_by", "created_at"]

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("El título no puede estar vacío.")
        return value

    # ---------------------------------------------------------
    # Helpers reutilizables (evitan duplicar la creación de
    # FormField + FieldChoice en create() y update()).
    #
    # Si "order" no viene en el payload, se autoasigna según
    # la posición en la lista, evitando que varios registros
    # colisionen en el valor por defecto (0) del modelo.
    # ---------------------------------------------------------

    @staticmethod
    def _create_choices(field, choices_data):
        for index, choice_data in enumerate(choices_data):
            choice_data.pop("id", None)
            if choice_data.get("order") is None:
                choice_data["order"] = index
            FieldChoice.objects.create(field=field, **choice_data)

    @classmethod
    def _create_fields(cls, form, fields_data):
        for index, field_data in enumerate(fields_data):
            choices_data = field_data.pop("choices", [])
            field_data.pop("id", None)
            if field_data.get("order") is None:
                field_data["order"] = index
            field = FormField.objects.create(form=form, **field_data)
            cls._create_choices(field, choices_data)

    @transaction.atomic
    def create(self, validated_data):
        fields_data = validated_data.pop("fields", [])

        # "created_by" ya viene en validated_data: la vista lo
        # inyecta con serializer.save(created_by=request.user).
        form = Form.objects.create(**validated_data)
        self._create_fields(form, fields_data)

        return form

    @transaction.atomic
    def update(self, instance, validated_data):
        fields_data = validated_data.pop("fields", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if fields_data is None:
            return instance

        existing_fields = {f.id: f for f in instance.fields.all()}
        received_ids = set()

        for index, field_data in enumerate(fields_data):
            field_id = field_data.pop("id", None)
            choices_data = field_data.pop("choices", None)
            if field_data.get("order") is None:
                field_data["order"] = index

            if field_id and field_id in existing_fields:
                field = existing_fields[field_id]
                self._update_existing_field(field, field_data, choices_data)
                received_ids.add(field_id)
            else:
                field = FormField.objects.create(form=instance, **field_data)
                self._create_choices(field, choices_data or [])
                received_ids.add(field.id)

        # Eliminar campos que ya no fueron enviados, salvo que
        # tengan respuestas asociadas (se preservan por integridad).
        fields_to_remove = set(existing_fields) - received_ids
        for field_id in fields_to_remove:
            field = existing_fields[field_id]
            if not field.answers.exists():
                field.delete()

        return instance

    def _update_existing_field(self, field, field_data, choices_data):
        new_field_type = field_data.get("field_type", field.field_type)

        if new_field_type != field.field_type and field.answers.exists():
            raise serializers.ValidationError(
                {
                    "fields": f"El campo '{field.label}' ya tiene respuestas "
                    "y no puede cambiar de tipo."
                }
            )

        if choices_data is not None and field.answers.exists():
            current_choice_ids = set(field.choices.values_list("id", flat=True))
            received_choice_ids = {c.get("id") for c in choices_data if c.get("id")}

            if current_choice_ids != received_choice_ids:
                raise serializers.ValidationError(
                    {
                        "fields": f"El campo '{field.label}' ya tiene respuestas "
                        "y no se pueden eliminar o reemplazar sus opciones."
                    }
                )

        for attr, value in field_data.items():
            setattr(field, attr, value)
        field.save()

        if choices_data is not None:
            field.choices.all().delete()
            self._create_choices(field, choices_data)


# =========================================================
# RESPUESTAS INDIVIDUALES
# =========================================================


class FormAnswerSerializer(serializers.ModelSerializer):

    # Mapea cada tipo de campo simple al atributo de valor que le
    # corresponde. Los tipos de selección se manejan aparte porque
    # usan "selected_choices" en vez de un único valor escalar.
    VALUE_FIELD_BY_TYPE = {
        FormField.FieldType.TEXT: "text_value",
        FormField.FieldType.NUMBER: "number_value",
        FormField.FieldType.DATE: "date_value",
    }
    CHOICE_TYPES = {
        FormField.FieldType.SINGLE_CHOICE,
        FormField.FieldType.MULTIPLE_CHOICE,
    }

    class Meta:
        model = FormAnswer
        fields = [
            "id",
            "field",
            "text_value",
            "number_value",
            "date_value",
            "selected_choices",
        ]
        read_only_fields = ["id"]

    def validate(self, attrs):
        field = attrs.get("field")
        if field is None:
            return attrs

        selected_choices = attrs.get("selected_choices") or []
        values_by_key = {
            "text_value": attrs.get("text_value"),
            "number_value": attrs.get("number_value"),
            "date_value": attrs.get("date_value"),
            "selected_choices": selected_choices,
        }

        field_type = field.field_type
        expected_key = (
            "selected_choices"
            if field_type in self.CHOICE_TYPES
            else self.VALUE_FIELD_BY_TYPE[field_type]
        )

        expected_value = values_by_key[expected_key]
        is_empty = expected_value in (None, "", []) or (
            isinstance(expected_value, str) and not expected_value.strip()
        )
        if is_empty:
            raise serializers.ValidationError(
                {expected_key: f"El campo '{field.label}' requiere un valor."}
            )

        # Ningún otro tipo de valor debe venir informado a la vez.
        for key, value in values_by_key.items():
            if key != expected_key and value not in (None, "", []):
                raise serializers.ValidationError(
                    f"El campo '{field.label}' solo puede contener un tipo " "de valor."
                )

        if (
            field_type == FormField.FieldType.SINGLE_CHOICE
            and len(selected_choices) > 1
        ):
            raise serializers.ValidationError(
                {
                    "selected_choices": f"El campo '{field.label}' solo permite "
                    "una opción."
                }
            )

        for choice in selected_choices:
            if choice.field_id != field.id:
                raise serializers.ValidationError(
                    {
                        "selected_choices": "Una opción seleccionada no "
                        "pertenece a este campo."
                    }
                )

        return attrs


# =========================================================
# DETALLE DE RESPUESTA
# =========================================================


class FormAnswerDetailSerializer(serializers.ModelSerializer):

    field_label = serializers.CharField(source="field.label", read_only=True)
    field_type = serializers.CharField(source="field.field_type", read_only=True)
    selected_choices = serializers.SerializerMethodField()

    class Meta:
        model = FormAnswer
        fields = [
            "id",
            "field",
            "field_label",
            "field_type",
            "text_value",
            "number_value",
            "date_value",
            "selected_choices",
        ]

    def get_selected_choices(self, obj):
        return list(obj.selected_choices.values_list("text", flat=True))


class FormResponseDetailSerializer(serializers.ModelSerializer):
    """
    Serializer de solo lectura para consultar respuestas.

    El ViewSet asociado (FormResponseViewSet) no habilita
    PUT/PATCH, así que este serializer nunca se usa para
    escritura; se deja explícito para que quede claro incluso
    si en el futuro se reactiva la edición.
    """

    form_title = serializers.CharField(source="form.title", read_only=True)
    respondent = serializers.ReadOnlyField(source="respondent.username", default=None)
    answers = FormAnswerDetailSerializer(many=True, read_only=True)

    class Meta:
        model = FormResponse
        fields = [
            "id",
            "form",
            "form_title",
            "respondent",
            "respondent_name",
            "document_type",
            "document_number",
            "submitted_at",
            "answers",
        ]
        read_only_fields = fields


# =========================================================
# CREAR RESPUESTA
# =========================================================


class FormResponseSerializer(serializers.ModelSerializer):

    answers = FormAnswerSerializer(many=True, required=True)
    respondent = serializers.ReadOnlyField(source="respondent.username", default=None)

    class Meta:
        model = FormResponse
        fields = [
            "id",
            "form",
            "respondent",
            "respondent_name",
            "document_type",
            "document_number",
            "submitted_at",
            "answers",
        ]
        read_only_fields = ["id", "respondent", "submitted_at"]

    def validate(self, attrs):
        form = attrs.get("form")
        answers = attrs.get("answers", [])

        if form is None:
            return attrs

        if not form.is_active:
            raise serializers.ValidationError(
                {"form": "Este formulario no está activo."}
            )

        answer_field_ids = []
        for answer in answers:
            field = answer.get("field")
            if field and field.form_id != form.id:
                raise serializers.ValidationError(
                    {
                        "answers": "Una respuesta contiene un campo que no "
                        "pertenece al formulario."
                    }
                )
            if field:
                answer_field_ids.append(field.id)

        if len(answer_field_ids) != len(set(answer_field_ids)):
            raise serializers.ValidationError(
                {"answers": "No puede haber más de una respuesta para el mismo campo."}
            )

        required_fields = set(
            form.fields.filter(is_required=True).values_list("id", flat=True)
        )
        missing = required_fields - set(answer_field_ids)
        if missing:
            raise serializers.ValidationError(
                {"answers": "Faltan respuestas para campos obligatorios."}
            )

        attrs["document_number"] = (attrs.get("document_number") or "").strip()
        return attrs

    def _is_privileged_user(self):
        request = self.context.get("request")
        user = request.user if request else None
        return bool(
            user and user.is_authenticated and (user.is_staff or user.is_superuser)
        )

    @transaction.atomic
    def create(self, validated_data):
        answers_data = validated_data.pop("answers", [])
        form = validated_data["form"]
        document_number = validated_data.get("document_number")

        # Regla de negocio:
        # - allow_multiple_responses=True  -> cualquiera responde varias veces.
        # - allow_multiple_responses=False -> una respuesta por documento,
        #   excepto para usuarios staff/superuser.
        #
        # El chequeo se hace aquí (dentro de la transacción, con lock sobre
        # el Form) y no en validate(), para evitar que dos requests
        # concurrentes pasen la validación al mismo tiempo y creen dos
        # respuestas duplicadas.
        if (
            not form.allow_multiple_responses
            and document_number
            and not self._is_privileged_user()
        ):
            Form.objects.select_for_update().get(pk=form.pk)
            duplicate = FormResponse.objects.filter(
                form=form, document_number=document_number
            ).exists()
            if duplicate:
                raise serializers.ValidationError(
                    {"form": "Este documento ya respondió este formulario."}
                )

        response = FormResponse.objects.create(**validated_data)

        for answer_data in answers_data:
            selected_choices = answer_data.pop("selected_choices", [])
            answer = FormAnswer.objects.create(response=response, **answer_data)
            if selected_choices:
                answer.selected_choices.set(selected_choices)

        return response
