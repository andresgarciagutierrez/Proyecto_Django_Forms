from django.conf import settings
from django.db import models


# Create your models here.
class Category(models.Model):
    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name


class TaskManager(models.Manager):
    def pending(self):
        return self.filter(is_completed=False)

    def completed(self):
        return self.filter(is_completed=True)

    def for_user(self, user):
        return self.filter(owner=user)


class Task(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="tasks"
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    categories = models.ManyToManyField(Category, blank=True, related_name="tasks")

    objects = TaskManager()

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return self.title


class TaskDetail(models.Model):
    task = models.OneToOneField(
        Task,
        on_delete=models.CASCADE,
        related_name="detail",
    )
    notes = models.TextField(blank=True)
    priority = models.CharField(
        max_length=10,
        choices=[
            ("low", "Baja"),
            ("medium", "Media"),
            ("high", "Alta"),
        ],
        default="medium",
    )

    def __str__(self):
        return f"Detalle de {self.task.title}"
