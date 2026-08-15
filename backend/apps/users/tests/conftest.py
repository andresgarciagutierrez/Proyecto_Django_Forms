import pytest
from django.contrib.auth.models import Group


@pytest.fixture
def user(db, django_user_model):
    """Usuario normal, autenticado, sin privilegios especiales."""
    return django_user_model.objects.create_user(
        username="user",
        email="user@example.com",
        password="pass1234",
        telephone="3000000000",
    )


@pytest.fixture
def form_creator_user(db, django_user_model):
    """Usuario perteneciente al grupo 'Form Creators'."""
    user = django_user_model.objects.create_user(
        username="creator",
        email="creator@example.com",
        password="pass1234",
    )
    group, _ = Group.objects.get_or_create(name="Form Creators")
    user.groups.add(group)
    return user


@pytest.fixture
def staff_user(db, django_user_model):
    """Usuario staff (no superuser)."""
    return django_user_model.objects.create_user(
        username="staff",
        email="staff@example.com",
        password="pass1234",
        is_staff=True,
    )