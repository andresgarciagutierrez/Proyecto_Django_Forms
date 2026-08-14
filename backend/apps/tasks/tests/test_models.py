import pytest
from apps.tasks.models import Category, Task, TaskDetail

pytestmark = pytest.mark.django_db


def test_category_creation_and_str(category):
    assert str(category) == "Backend"
    assert Category.objects.count() == 1


def test_task_creation_and_str(task, user):
    assert str(task) == "Tarea inicial"
    assert task.owner == user
    assert task.is_completed is False
    assert task.categories.count() == 1


def test_task_detail_creation_and_str(task_detail, task):
    assert str(task_detail) == f"Detalle de {task.title}"
    assert task_detail.priority == "high"
    assert task_detail.task == task
