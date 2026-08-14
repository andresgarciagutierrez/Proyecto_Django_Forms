import pytest
from django.contrib.auth import get_user_model
from apps.tasks.models import Category, Task, TaskDetail

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        username="testuser",
        email="test@example.com",
        password="password123",
    )


@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        username="otheruser",
        email="other@example.com",
        password="password123",
    )


@pytest.fixture
def category(db):
    return Category.objects.create(name="Backend")


@pytest.fixture
def task(db, user, category):
    task_obj = Task.objects.create(
        owner=user,
        title="Tarea inicial",
        description="Descripción de prueba",
    )
    task_obj.categories.add(category)
    return task_obj


@pytest.fixture
def task_detail(db, task):
    return TaskDetail.objects.create(
        task=task,
        notes="Notas de prueba",
        priority="high",
    )
