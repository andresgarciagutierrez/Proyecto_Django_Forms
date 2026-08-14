from django.conf import settings
from django.db import models


class Form(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_forms",
    )

    allow_multiple_responses = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class FormField(models.Model):

    class FieldType(models.TextChoices):
        TEXT = "text", "Texto"
        SINGLE_CHOICE = "single_choice", "Opción única"
        MULTIPLE_CHOICE = "multiple_choice", "Opción múltiple"
        NUMBER = "number", "Número"
        DATE = "date", "Fecha"

    form = models.ForeignKey(
        Form,
        on_delete=models.CASCADE,
        related_name="fields",
    )

    label = models.CharField(max_length=200)

    field_type = models.CharField(
        max_length=20,
        choices=FieldType.choices,
    )

    is_required = models.BooleanField(default=True)

    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]
        constraints = [
            models.UniqueConstraint(
                fields=["form", "order"],
                name="unique_field_order_per_form",
            ),
        ]

    def __str__(self):
        return f"{self.label} ({self.form.title})"


class FieldChoice(models.Model):

    field = models.ForeignKey(
        FormField,
        on_delete=models.CASCADE,
        related_name="choices",
    )

    text = models.CharField(max_length=200)

    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]
        constraints = [
            models.UniqueConstraint(
                fields=["field", "order"],
                name="unique_choice_order_per_field",
            ),
            models.UniqueConstraint(
                fields=["field", "text"],
                name="unique_choice_text_per_field",
            ),
        ]

    def __str__(self):
        return self.text


class FormResponse(models.Model):

    class DocumentType(models.TextChoices):
        CC = "CC", "Cédula de ciudadanía"
        TI = "TI", "Tarjeta de identidad"
        CE = "CE", "Cédula de extranjería"
        PA = "PA", "Pasaporte"
        RC = "RC", "Registro civil"

    form = models.ForeignKey(
        Form,
        on_delete=models.CASCADE,
        related_name="responses",
    )

    respondent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="form_responses",
        null=True,
        blank=True,
    )

    respondent_name = models.CharField(max_length=200)

    document_type = models.CharField(
        max_length=2,
        choices=DocumentType.choices,
        default=DocumentType.CC,
    )

    document_number = models.CharField(max_length=30)

    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"Respuesta de {self.respondent_name} a {self.form.title}"


class FormAnswer(models.Model):

    response = models.ForeignKey(
        FormResponse,
        on_delete=models.CASCADE,
        related_name="answers",
    )

    field = models.ForeignKey(
        FormField,
        on_delete=models.CASCADE,
        related_name="answers",
    )

    text_value = models.TextField(
        blank=True,
        null=True,
    )

    number_value = models.FloatField(
        blank=True,
        null=True,
    )

    date_value = models.DateField(
        blank=True,
        null=True,
    )

    selected_choices = models.ManyToManyField(
        FieldChoice,
        blank=True,
        related_name="answers",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["response", "field"],
                name="unique_answer_per_response_field",
            ),
        ]

    def __str__(self):
        return f"Respuesta a {self.field.label}"
