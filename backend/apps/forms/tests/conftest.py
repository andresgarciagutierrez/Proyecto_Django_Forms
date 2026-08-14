# apps/forms/tests/conftest.py
import pytest
from django.contrib.auth.models import Group

from apps.forms.models import FieldChoice, Form, FormField


@pytest.fixture
def user(db, django_user_model):
    """
    Usuario "creador de formularios": pertenece al grupo
    Form Creators, que es lo que exige IsFormCreatorOrReadOnly
    para poder crear/editar/eliminar formularios propios.
    """
    user = django_user_model.objects.create_user(
        username="user",
        email="user@example.com",
        password="pass1234",
    )
    group, _ = Group.objects.get_or_create(name="Form Creators")
    user.groups.add(group)
    return user


@pytest.fixture
def staff_user(db, django_user_model):
    """Usuario staff, con acceso completo a formularios y respuestas."""
    return django_user_model.objects.create_user(
        username="staff",
        email="staff@example.com",
        password="pass1234",
        is_staff=True,
    )


@pytest.fixture
def sample_form(db, user):
    """
    Formulario de ejemplo con dos campos:

    - field_text: campo de texto obligatorio.
    - field_choice: campo de opción única con dos opciones
      ("Urbana" / "Rural").

    Devuelve (form, field_text, field_choice, choice_urbana).
    """
    form = Form.objects.create(
        title="Encuesta de campo",
        created_by=user,
    )

    field_text = FormField.objects.create(
        form=form,
        label="Observaciones",
        field_type=FormField.FieldType.TEXT,
        order=1,
    )

    field_choice = FormField.objects.create(
        form=form,
        label="Zona",
        field_type=FormField.FieldType.SINGLE_CHOICE,
        order=2,
    )

    choice_urbana = FieldChoice.objects.create(
        field=field_choice,
        text="Urbana",
        order=1,
    )

    FieldChoice.objects.create(
        field=field_choice,
        text="Rural",
        order=2,
    )

    return form, field_text, field_choice, choice_urbana
