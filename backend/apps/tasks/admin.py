from django.contrib import admin

from .models import Category, Task, TaskDetail


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)
    ordering = ("name",)


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "owner",
        "is_completed",
        "created_at",
    )

    list_filter = (
        "is_completed",
        "categories",
        "created_at",
    )

    search_fields = (
        "title",
        "description",
        "owner__username",
    )

    filter_horizontal = ("categories",)

    ordering = ("-created_at",)


@admin.register(TaskDetail)
class TaskDetailAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "task",
        "priority",
    )

    list_filter = ("priority",)

    search_fields = (
        "task__title",
        "notes",
    )

    ordering = ("task",)
