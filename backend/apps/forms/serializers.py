from django.db import transaction
from rest_framework import serializers

from .models import (
    FieldChoice,
    Form,
    FormAnswer,
    FormField,
    FormResponse,
)


class FieldChoiceSerializer(serializers.ModelSerializer):

    class Meta:
        model = FieldChoice

        fields = [
            "id",
            "text",
            "order",
        ]

        read_only_fields = ["id"]

    def validate_text(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "El texto de la opción no puede estar vacío."
            )

        return value


class FormFieldSerializer(serializers.ModelSerializer):

    id = serializers.IntegerField(required=False)

    choices = FieldChoiceSerializer(
        many=True,
        required=False,
    )

    class Meta:
        model = FormField

        fields = [
            "id",
            "label",
            "field_type",
            "is_required",
            "order",
            "choices",
        ]

    def validate(self, attrs):

        field_type = attrs.get("field_type")
        choices = attrs.get("choices", [])

        choice_types = {
            FormField.FieldType.SINGLE_CHOICE,
            FormField.FieldType.MULTIPLE_CHOICE,
        }

        if field_type in choice_types:

            if len(choices) < 2:
                raise serializers.ValidationError(
                    {
                        "choices": (
                            "Los campos de selección requieren " "al menos 2 opciones."
                        )
                    }
                )

            valid_choices = [
                choice for choice in choices if choice.get("text", "").strip()
            ]

            if len(valid_choices) < 2:
                raise serializers.ValidationError(
                    {"choices": ("Las opciones deben tener texto.")}
                )

        elif choices:

            raise serializers.ValidationError(
                {"choices": ("Este tipo de campo no permite opciones.")}
            )

        return attrs


class FormSerializer(serializers.ModelSerializer):

    fields = FormFieldSerializer(
        many=True,
        required=False,
    )

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

        read_only_fields = [
            "id",
            "created_by",
            "created_at",
        ]

    def validate_title(self, value):

        value = value.strip()

        if not value:
            raise serializers.ValidationError("El título no puede estar vacío.")

        return value

    @transaction.atomic
    def create(self, validated_data):

        fields_data = validated_data.pop(
            "fields",
            [],
        )

        request = self.context.get("request")

        created_by = validated_data.pop(
            "created_by",
            None,
        )

        if created_by is None and request:
            created_by = request.user

        form = Form.objects.create(
            created_by=created_by,
            **validated_data,
        )

        for field_data in fields_data:

            choices_data = field_data.pop(
                "choices",
                [],
            )

            field = FormField.objects.create(
                form=form,
                **field_data,
            )

            for choice_data in choices_data:

                FieldChoice.objects.create(
                    field=field,
                    **choice_data,
                )

        return form

    @transaction.atomic
    def update(self, instance, validated_data):

        fields_data = validated_data.pop(
            "fields",
            None,
        )

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if fields_data is None:
            return instance

        existing_fields = {field.id: field for field in instance.fields.all()}

        received_ids = set()

        for field_data in fields_data:

            field_id = field_data.pop(
                "id",
                None,
            )

            choices_data = field_data.pop(
                "choices",
                None,
            )

            if field_id and field_id in existing_fields:

                field = existing_fields[field_id]

                new_field_type = field_data.get(
                    "field_type",
                    field.field_type,
                )

                if new_field_type != field.field_type and field.answers.exists():
                    raise serializers.ValidationError(
                        {
                            "fields": (
                                f"El campo '{field.label}' ya tiene "
                                "respuestas y no puede cambiar de tipo."
                            )
                        }
                    )

                if choices_data is not None and field.answers.exists():

                    current_choice_ids = set(
                        field.choices.values_list(
                            "id",
                            flat=True,
                        )
                    )

                    received_choice_ids = {
                        choice.get("id") for choice in choices_data if choice.get("id")
                    }

                    if current_choice_ids != received_choice_ids:
                        raise serializers.ValidationError(
                            {
                                "fields": (
                                    f"El campo '{field.label}' ya tiene "
                                    "respuestas y no se pueden eliminar "
                                    "o reemplazar sus opciones."
                                )
                            }
                        )

                for attr, value in field_data.items():
                    setattr(field, attr, value)

                field.save()

                if choices_data is not None:

                    field.choices.all().delete()

                    for choice_data in choices_data:

                        choice_data.pop(
                            "id",
                            None,
                        )

                        FieldChoice.objects.create(
                            field=field,
                            **choice_data,
                        )

                received_ids.add(field_id)

            else:

                field = FormField.objects.create(
                    form=instance,
                    **field_data,
                )

                for choice_data in choices_data or []:

                    choice_data.pop(
                        "id",
                        None,
                    )

                    FieldChoice.objects.create(
                        field=field,
                        **choice_data,
                    )

                received_ids.add(field.id)

        fields_to_remove = set(existing_fields.keys()) - received_ids

        for field_id in fields_to_remove:

            field = existing_fields[field_id]

            if not field.answers.exists():
                field.delete()

        return instance


class FormAnswerSerializer(serializers.ModelSerializer):

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

        read_only_fields = [
            "id",
        ]

    def validate(self, attrs):

        field = attrs.get("field")

        if field is None:
            return attrs

        field_type = field.field_type

        text_value = attrs.get("text_value")
        number_value = attrs.get("number_value")
        date_value = attrs.get("date_value")
        selected_choices = attrs.get("selected_choices") or []

        if field_type == FormField.FieldType.TEXT:

            if not text_value or not text_value.strip():
                raise serializers.ValidationError(
                    {"text_value": (f"El campo '{field.label}' " "requiere texto.")}
                )

            if number_value is not None or date_value is not None:
                raise serializers.ValidationError(
                    "Un campo de texto no puede contener "
                    "valores numéricos o de fecha."
                )

            if selected_choices:
                raise serializers.ValidationError(
                    "Un campo de texto no puede tener opciones."
                )

        elif field_type == FormField.FieldType.NUMBER:

            if number_value is None:
                raise serializers.ValidationError(
                    {
                        "number_value": (
                            f"El campo '{field.label}' " "requiere un número."
                        )
                    }
                )

            if text_value or date_value is not None or selected_choices:
                raise serializers.ValidationError(
                    "Un campo numérico solo puede contener " "un valor numérico."
                )

        elif field_type == FormField.FieldType.DATE:

            if date_value is None:
                raise serializers.ValidationError(
                    {"date_value": (f"El campo '{field.label}' " "requiere una fecha.")}
                )

            if text_value or number_value is not None or selected_choices:
                raise serializers.ValidationError(
                    "Un campo de fecha solo puede contener " "una fecha."
                )

        elif field_type in {
            FormField.FieldType.SINGLE_CHOICE,
            FormField.FieldType.MULTIPLE_CHOICE,
        }:

            if not selected_choices:
                raise serializers.ValidationError(
                    {
                        "selected_choices": (
                            f"El campo '{field.label}' " "requiere una opción."
                        )
                    }
                )

            if text_value or number_value is not None or date_value is not None:
                raise serializers.ValidationError(
                    "Un campo de selección solo puede " "contener opciones."
                )

        if (
            field_type == FormField.FieldType.SINGLE_CHOICE
            and len(selected_choices) > 1
        ):
            raise serializers.ValidationError(
                {
                    "selected_choices": (
                        f"El campo '{field.label}' " "solo permite una opción."
                    )
                }
            )

        for choice in selected_choices:

            if choice.field_id != field.id:
                raise serializers.ValidationError(
                    {
                        "selected_choices": (
                            "Una opción seleccionada no " "pertenece a este campo."
                        )
                    }
                )

        return attrs


class FormAnswerDetailSerializer(serializers.ModelSerializer):

    field_label = serializers.CharField(
        source="field.label",
        read_only=True,
    )

    field_type = serializers.CharField(
        source="field.field_type",
        read_only=True,
    )

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

        return list(
            obj.selected_choices.values_list(
                "text",
                flat=True,
            )
        )


class FormResponseDetailSerializer(serializers.ModelSerializer):

    form_title = serializers.CharField(
        source="form.title",
        read_only=True,
    )

    respondent = serializers.ReadOnlyField(
        source="respondent.username",
        default=None,
    )

    answers = FormAnswerDetailSerializer(
        many=True,
        read_only=True,
    )

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


class FormResponseSerializer(serializers.ModelSerializer):

    answers = FormAnswerSerializer(
        many=True,
        required=True,
    )

    respondent = serializers.ReadOnlyField(
        source="respondent.username",
        default=None,
    )

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

        read_only_fields = [
            "id",
            "respondent",
            "submitted_at",
        ]

    def validate(self, attrs):

        form = attrs.get("form")
        answers = attrs.get(
            "answers",
            [],
        )

        if form is None:
            return attrs

        if not form.is_active:
            raise serializers.ValidationError(
                {"form": ("Este formulario no está activo.")}
            )

        answer_field_ids = []

        for answer in answers:

            field = answer.get("field")

            if field and field.form_id != form.id:
                raise serializers.ValidationError(
                    {
                        "answers": (
                            "Una respuesta contiene un campo "
                            "que no pertenece al formulario."
                        )
                    }
                )

            if field:
                answer_field_ids.append(field.id)

        if len(answer_field_ids) != len(set(answer_field_ids)):
            raise serializers.ValidationError(
                {
                    "answers": (
                        "No puede haber más de una respuesta " "para el mismo campo."
                    )
                }
            )

        answered_fields = set(answer_field_ids)

        required_fields = set(
            form.fields.filter(is_required=True).values_list(
                "id",
                flat=True,
            )
        )

        missing = required_fields - answered_fields

        if missing:
            raise serializers.ValidationError(
                {"answers": ("Faltan respuestas para campos " "obligatorios.")}
            )

        document_number = attrs.get("document_number")

        if not form.allow_multiple_responses and document_number:

            exists = FormResponse.objects.filter(
                form=form,
                document_number=document_number,
            ).exists()

            if exists:
                raise serializers.ValidationError(
                    {"form": ("Este documento ya respondió " "este formulario.")}
                )

        return attrs

    @transaction.atomic
    def create(self, validated_data):

        answers_data = validated_data.pop(
            "answers",
            [],
        )

        # IMPORTANTE:
        # respondent puede venir desde serializer.save(respondent=...)
        # por lo tanto no debemos volver a pasarlo como argumento
        # separado a FormResponse.objects.create().

        response = FormResponse.objects.create(
            **validated_data,
        )

        for answer_data in answers_data:

            selected_choices = answer_data.pop(
                "selected_choices",
                [],
            )

            answer = FormAnswer.objects.create(
                response=response,
                **answer_data,
            )

            if selected_choices:
                answer.selected_choices.set(selected_choices)

        return response
