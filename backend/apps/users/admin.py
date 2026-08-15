from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .forms import UserRegisterForm
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    model = User
    add_form = UserRegisterForm

    # Activa la interfaz gráfica de selección múltiple tipo "Chosen/Transfer"
    filter_horizontal = ("groups", "user_permissions")

    list_display = ["username", "email", "telephone", "is_staff", "is_active"]

    fieldsets = BaseUserAdmin.fieldsets + (
        ("Additional info", {"fields": ("telephone", "date_of_birth")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("username", "password1", "password2"),
            },
        ),
        (
            "Additional info",
            {
                "fields": ("email", "telephone", "date_of_birth"),
            },
        ),
    )
