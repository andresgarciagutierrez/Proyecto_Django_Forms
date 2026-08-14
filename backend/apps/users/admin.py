from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


# Register your models here.
class UserAdmin(BaseUserAdmin):
    model = User
    list_display = ["username", "email", "telephone", "is_staff", "is_active"]
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Additional info", {"fields": ("telephone", "date_of_birth")}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ("Additional info", {"fields": ("email", "telephone", "date_of_birth")}),
    )


admin.site.register(User, UserAdmin)
