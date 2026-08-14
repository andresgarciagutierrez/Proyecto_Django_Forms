import pytest
from apps.tasks.forms import TaskDetailForm, TaskForm

pytestmark = pytest.mark.django_db


def test_task_form_valid(category):
    form_data = {
        "title": "Aprender Pytest",
        "description": "Pruebas unitarias en Django",
        "is_completed": False,
        "categories": [category.id],
    }
    form = TaskForm(data=form_data)
    assert form.is_valid()


def test_task_form_invalid_short_title():
    form_data = {
        "title": "Ab",  # Menos de 3 caracteres
        "description": "Descripción",
    }
    form = TaskForm(data=form_data)
    assert not form.is_valid()
    assert "title" in form.errors
    assert form.errors["title"] == ["El título debe tener al menos 3 caracteres."]


def test_task_detail_form_valid():
    form_data = {
        "notes": "Revisar documentación oficial",
        "priority": "medium",
    }
    form = TaskDetailForm(data=form_data)
    assert form.is_valid()
