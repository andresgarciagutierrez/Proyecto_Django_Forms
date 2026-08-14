import pytest
from django.urls import reverse
from apps.tasks.models import Task, TaskDetail

pytestmark = pytest.mark.django_db


# --- TaskListView ---
def test_task_list_view_requires_login(client):
    response = client.get(reverse("tasks:list"))
    assert response.status_code == 302
    assert "/login/" in response.url


def test_task_list_view_authenticated(client, user, task, other_user):
    # Tarea de otro usuario que no debe aparecer
    Task.objects.create(owner=other_user, title="Tarea ajena", description="No visible")

    client.force_login(user)
    response = client.get(reverse("tasks:list"))

    assert response.status_code == 200
    assert len(response.context["tasks"]) == 1
    assert response.context["tasks"][0] == task


# --- TaskCreateView ---
def test_task_create_view_post(client, user):
    client.force_login(user)
    payload = {
        "title": "Nueva Tarea Pytest",
        "description": "Detalles de prueba",
        "is_completed": False,
    }
    response = client.post(reverse("tasks:create"), data=payload)

    assert response.status_code == 302
    assert response.url == reverse("tasks:list")
    assert Task.objects.filter(title="Nueva Tarea Pytest", owner=user).exists()


def test_task_create_view_creates_single_task(client, user):
    """Regresión: form_valid no debe insertar la tarea dos veces."""
    client.force_login(user)
    payload = {
        "title": "Solo una vez",
        "description": "",
        "is_completed": False,
    }
    client.post(reverse("tasks:create"), data=payload)

    assert Task.objects.filter(title="Solo una vez").count() == 1


def test_task_create_view_saves_categories(client, user, category):
    client.force_login(user)
    payload = {
        "title": "Con categoría",
        "description": "",
        "is_completed": False,
        "categories": [category.id],
    }
    client.post(reverse("tasks:create"), data=payload)

    task = Task.objects.get(title="Con categoría")
    assert list(task.categories.all()) == [category]


# --- TaskUpdateView ---
def test_task_update_view_owner(client, user, task):
    client.force_login(user)
    payload = {
        "title": "Título Actualizado",
        "description": task.description,
        "is_completed": True,
    }
    url = reverse("tasks:edit", kwargs={"pk": task.pk})
    response = client.post(url, data=payload)

    task.refresh_from_db()
    assert response.status_code == 302
    assert task.title == "Título Actualizado"
    assert task.is_completed is True


def test_task_update_view_other_user_forbidden(client, other_user, task):
    # Intentar editar una tarea que no pertenece a other_user
    client.force_login(other_user)
    url = reverse("tasks:edit", kwargs={"pk": task.pk})
    response = client.post(url, data={"title": "Hacked"})

    assert response.status_code == 404


# --- TaskDeleteView ---
def test_task_delete_view_owner(client, user, task):
    client.force_login(user)
    url = reverse("tasks:delete", kwargs={"pk": task.pk})
    response = client.post(url)

    assert response.status_code == 302
    assert not Task.objects.filter(pk=task.pk).exists()


def test_task_delete_view_other_user_forbidden(client, other_user, task):
    client.force_login(other_user)
    url = reverse("tasks:delete", kwargs={"pk": task.pk})
    response = client.post(url)

    assert response.status_code == 404
    assert Task.objects.filter(pk=task.pk).exists()


# --- TaskDetailUpdateView ---
def test_task_detail_view_requires_login(client, task):
    url = reverse("tasks:detail", kwargs={"pk": task.pk})
    response = client.get(url)
    assert response.status_code == 302
    assert "/login/" in response.url


def test_task_detail_view_creates_detail_if_missing(client, user, task):
    assert not TaskDetail.objects.filter(task=task).exists()

    client.force_login(user)
    url = reverse("tasks:detail", kwargs={"pk": task.pk})
    response = client.get(url)

    assert response.status_code == 200
    assert TaskDetail.objects.filter(task=task).exists()


def test_task_detail_view_updates_existing_detail(client, user, task, task_detail):
    client.force_login(user)
    url = reverse("tasks:detail", kwargs={"pk": task.pk})
    payload = {"notes": "Notas actualizadas", "priority": "low"}
    response = client.post(url, data=payload)

    task_detail.refresh_from_db()
    assert response.status_code == 302
    assert task_detail.notes == "Notas actualizadas"
    assert task_detail.priority == "low"


def test_task_detail_view_other_user_forbidden(client, other_user, task):
    client.force_login(other_user)
    url = reverse("tasks:detail", kwargs={"pk": task.pk})
    response = client.get(url)

    assert response.status_code == 404
