from django.contrib import admin

from .models import (
    FieldChoice,
    Form,
    FormAnswer,
    FormField,
    FormResponse,
)


class FieldChoiceInline(admin.TabularInline):

    model = FieldChoice

    extra = 1

    ordering = ["order"]


class FormFieldInline(admin.TabularInline):

    model = FormField

    extra = 1

    show_change_link = True

    ordering = ["order"]


@admin.register(Form)
class FormAdmin(admin.ModelAdmin):

    list_display = [
        "title",
        "created_by",
        "is_active",
        "allow_multiple_responses",
        "created_at",
    ]

    list_filter = [
        "is_active",
        "allow_multiple_responses",
        "created_at",
    ]

    search_fields = [
        "title",
        "description",
        "created_by__username",
    ]

    ordering = [
        "-created_at",
    ]

    readonly_fields = [
        "created_at",
    ]

    inlines = [
        FormFieldInline,
    ]


@admin.register(FormField)
class FormFieldAdmin(admin.ModelAdmin):

    list_display = [
        "label",
        "form",
        "field_type",
        "is_required",
        "order",
    ]

    list_filter = [
        "field_type",
        "is_required",
    ]

    search_fields = [
        "label",
        "form__title",
    ]

    ordering = [
        "form",
        "order",
    ]

    inlines = [
        FieldChoiceInline,
    ]


@admin.register(FieldChoice)
class FieldChoiceAdmin(admin.ModelAdmin):

    list_display = [
        "text",
        "field",
        "order",
    ]

    search_fields = [
        "text",
        "field__label",
        "field__form__title",
    ]


class FormAnswerInline(admin.TabularInline):

    model = FormAnswer

    extra = 0

    readonly_fields = [
        "field",
        "text_value",
        "number_value",
        "date_value",
    ]

    show_change_link = True


@admin.register(FormResponse)
class FormResponseAdmin(admin.ModelAdmin):

    list_display = [
        "form",
        "respondent_name",
        "document_type",
        "document_number",
        "submitted_at",
    ]

    list_filter = [
        "form",
        "document_type",
        "submitted_at",
    ]

    search_fields = [
        "form__title",
        "respondent_name",
        "document_number",
    ]

    ordering = ["-submitted_at"]

    readonly_fields = [
        "form",
        "respondent",
        "respondent_name",
        "document_type",
        "document_number",
        "submitted_at",
    ]

    inlines = [FormAnswerInline]


@admin.register(FormAnswer)
class FormAnswerAdmin(admin.ModelAdmin):

    list_display = [
        "response",
        "field",
        "text_value",
        "number_value",
        "date_value",
    ]

    search_fields = [
        "response__form__title",
        "response__respondent__username",
        "field__label",
    ]

    list_filter = [
        "field__field_type",
    ]

    readonly_fields = [
        "response",
        "field",
        "text_value",
        "number_value",
        "date_value",
    ]
