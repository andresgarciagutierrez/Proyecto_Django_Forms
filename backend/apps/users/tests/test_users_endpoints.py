import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse

pytestmark = pytest.mark.django_db

User = get_user_model()


# =========================================================
# HELPERS
# =========================================================


def _register_payload(**overrides):
    payload = {
        "username": "nuevo_usuario",
        "email": "nuevo@example.com",
        "telephone": "3001234567",
        "date_of_birth": "1999-05-20",
        "password1": "ClaveSegura123",
        "password2": "ClaveSegura123",
    }
    payload.update(overrides)
    return payload


def _post_form(client, url_name, payload):
    return client.post(reverse(url_name), data=payload)


# =========================================================
# REGISTRO
# =========================================================


def test_register_creates_user_with_valid_data(client):
    response = _post_form(client, "users:register", _register_payload())

    assert response.status_code == 302
    assert User.objects.filter(username="nuevo_usuario").exists()


def test_register_rejects_duplicate_email(client, user):
    # "user" fixture ya tiene email="user@example.com"
    response = _post_form(
        client,
        "users:register",
        _register_payload(username="otro", email="user@example.com"),
    )

    assert response.status_code == 200  # se re-renderiza el form con errores
    assert User.objects.filter(username="otro").exists() is False


def test_register_rejects_password_mismatch(client):
    response = _post_form(
        client,
        "users:register",
        _register_payload(password2="OtraClaveDistinta123"),
    )

    assert response.status_code == 200
    assert User.objects.filter(username="nuevo_usuario").exists() is False


# =========================================================
# LOGIN / LOGOUT
# =========================================================


def test_login_success(client, user):
    response = _post_form(
        client, "users:login", {"username": "user", "password": "pass1234"}
    )

    assert response.status_code == 302
    assert "_auth_user_id" in client.session


def test_login_wrong_password_does_not_authenticate(client, user):
    response = _post_form(
        client, "users:login", {"username": "user", "password": "clave-incorrecta"}
    )

    assert response.status_code == 200
    assert "_auth_user_id" not in client.session


# =========================================================
# PERFIL
# =========================================================


def test_profile_requires_login(client):
    response = client.get(reverse("users:profile"))

    assert response.status_code == 302
    assert reverse("users:login") in response.url


def test_profile_update_by_owner(client, user):
    client.force_login(user)

    response = _post_form(
        client,
        "users:profile",
        {
            "username": "user",
            "email": "user@example.com",
            "telephone": "3009999999",
            "date_of_birth": "1990-01-01",
        },
    )

    assert response.status_code == 302
    user.refresh_from_db()
    assert user.telephone == "3009999999"


def test_profile_form_excludes_password_field():
    from apps.users.forms import UserProfileForm

    assert "password" not in UserProfileForm().fields


# =========================================================
# ADMIN: alta de usuario (regresión del bug de add_form)
# =========================================================


def test_admin_add_user_uses_register_form_fields():
    """
    Regresión: add_fieldsets del admin referencia
    email/telephone/date_of_birth, campos que solo existen si
    add_form apunta a UserRegisterForm (UserCreationForm por
    defecto solo trae "username"). Si alguien vuelve a romper
    esa asociación, este test debería fallar.
    """
    from apps.users.admin import UserAdmin
    from apps.users.forms import UserRegisterForm

    assert UserAdmin.add_form is UserRegisterForm


def test_admin_can_add_user_through_the_add_view(admin_client):
    response = admin_client.post(
        reverse("admin:users_user_add"),
        data=_register_payload(
            username="creado_desde_admin", email="admin_creado@example.com"
        ),
    )

    assert response.status_code == 302  # redirect tras alta exitosa
    assert User.objects.filter(username="creado_desde_admin").exists()


# =========================================================
# MeView
# =========================================================


def test_me_endpoint_requires_authentication(client):
    response = client.get(reverse("users:me"))
    assert response.status_code in (401, 403)


def test_me_endpoint_returns_profile_for_authenticated_user(client, user):
    client.force_login(user)

    response = client.get(reverse("users:me"))
    body = response.json()

    assert response.status_code == 200
    assert body["username"] == "user"
    assert body["is_staff"] is False
    assert body["is_superuser"] is False
    assert body["is_form_creator"] is False


def test_me_endpoint_reflects_form_creator_group(client, form_creator_user):
    client.force_login(form_creator_user)

    response = client.get(reverse("users:me"))
    body = response.json()

    assert response.status_code == 200
    assert body["is_form_creator"] is True


def test_me_endpoint_reflects_staff_flag(client, staff_user):
    client.force_login(staff_user)

    response = client.get(reverse("users:me"))
    body = response.json()

    assert response.status_code == 200
    assert body["is_staff"] is True
