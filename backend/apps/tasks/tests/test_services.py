import pytest

from apps.tasks.services import MAX_TASKS_PER_USER, TaskLimitExceededError, create_task

pytestmark = pytest.mark.django_db


def test_create_task_success(user):
    task = create_task(owner=user, title="Tarea de prueba", description="")
    assert task.owner == user
    assert task.title == "Tarea de prueba"


def test_create_task_raises_when_limit_exceeded(user):
    for i in range(MAX_TASKS_PER_USER):
        create_task(owner=user, title=f"Tarea {i}", description="")

    with pytest.raises(TaskLimitExceededError):
        create_task(owner=user, title="Tarea extra", description="")


def test_create_task_with_is_completed_and_categories(user, category):
    task = create_task(
        owner=user,
        title="Tarea completa",
        is_completed=True,
        categories=[category],
    )
    assert task.is_completed is True
    assert list(task.categories.all()) == [category]
