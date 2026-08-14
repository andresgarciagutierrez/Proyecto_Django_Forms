import pytest
from django.urls import reverse
from apps.forms.models import FormResponse

pytestmark = pytest.mark.django_db


def _payload(
    form, field_text, field_choice, choice, name="Maria Perez", doc="1020304050"
):
    return {
        "form": form.id,
        "respondent_name": name,
        "document_type": "CC",
        "document_number": doc,
        "answers": [
            {"field": field_text.id, "text_value": "Todo en orden"},
            {"field": field_choice.id, "selected_choices": [choice.id]},
        ],
    }


def test_anonymous_can_submit_response(client, sample_form):
    form, field_text, field_choice, choice = sample_form
    response = client.post(
        reverse("response-list"),
        data=_payload(form, field_text, field_choice, choice),
        content_type="application/json",
    )
    assert response.status_code == 201
    assert response.json()["respondent"] is None
    assert FormResponse.objects.filter(document_number="1020304050").exists()


def test_same_admin_can_submit_multiple_identities(client, sample_form, staff_user):
    form, field_text, field_choice, choice = sample_form
    client.force_login(staff_user)

    for i in range(3):
        payload = _payload(
            form,
            field_text,
            field_choice,
            choice,
            name=f"Persona {i}",
            doc=f"100000{i}",
        )
        response = client.post(
            reverse("response-list"), data=payload, content_type="application/json"
        )
        assert response.status_code == 201

    assert FormResponse.objects.filter(form=form).count() == 3


def test_duplicate_document_rejected_when_multiple_not_allowed(client, sample_form):
    form, field_text, field_choice, choice = sample_form
    payload = _payload(form, field_text, field_choice, choice)

    first = client.post(
        reverse("response-list"), data=payload, content_type="application/json"
    )
    assert first.status_code == 201

    second = client.post(
        reverse("response-list"), data=payload, content_type="application/json"
    )
    assert second.status_code == 400


def test_missing_required_field_rejected(client, sample_form):
    form, field_text, field_choice, choice = sample_form
    payload = {
        "form": form.id,
        "respondent_name": "Sin respuestas",
        "document_type": "CC",
        "document_number": "999",
        "answers": [],
    }
    response = client.post(
        reverse("response-list"), data=payload, content_type="application/json"
    )
    assert response.status_code == 400


def test_form_creator_sees_only_own_forms_responses(client, sample_form, user):
    # sample_form fue creado por "user" (ver fixture en conftest.py)
    form, field_text, field_choice, choice = sample_form
    client.force_login(user)

    payload = _payload(form, field_text, field_choice, choice)
    client.post(reverse("response-list"), data=payload, content_type="application/json")

    response = client.get(reverse("response-list"))
    assert response.status_code == 200
    body = response.json()
    results = body.get("results", body)
    assert len(results) == 1


def test_form_creator_cannot_see_others_forms_responses(
    client, sample_form, staff_user
):
    from django.contrib.auth import get_user_model

    form, field_text, field_choice, choice = (
        sample_form  # creado por "user", no por staff_user
    )
    client.force_login(staff_user)
    client.post(
        reverse("response-list"),
        data=_payload(form, field_text, field_choice, choice),
        content_type="application/json",
    )

    User = get_user_model()
    outsider = User.objects.create_user(username="outsider", password="pass1234")
    client.force_login(outsider)

    response = client.get(reverse("response-list"))
    assert response.status_code == 200
    body = response.json()
    results = body.get("results", body)
    assert len(results) == 0


def test_anonymous_cannot_list_responses(client):
    response = client.get(reverse("response-list"))
    assert response.status_code == 401


def test_staff_sees_detailed_readable_response(client, sample_form, staff_user):
    form, field_text, field_choice, choice = sample_form
    client.post(
        reverse("response-list"),
        data=_payload(form, field_text, field_choice, choice),
        content_type="application/json",
    )

    client.force_login(staff_user)
    response = client.get(reverse("response-list"))
    assert response.status_code == 200

    body = response.json()
    results = body.get("results", body)
    entry = results[0]

    assert entry["respondent_name"] == "Maria Perez"
    assert entry["form_title"] == "Encuesta de campo"
    assert entry["respondent"] is None  # el payload de prueba fue anónimo
    assert entry["answers"][0]["field_label"] in ("Observaciones", "Zona")
    assert entry["answers"][0]["field_type"] in ("text", "single_choice")


def test_duplicate_field_answer_is_rejected(
    client,
    sample_form,
):
    form, field_text, field_choice, choice = sample_form

    payload = {
        "form": form.id,
        "respondent_name": "Maria Perez",
        "document_type": "CC",
        "document_number": "111222333",
        "answers": [
            {
                "field": field_text.id,
                "text_value": "Primera respuesta",
            },
            {
                "field": field_text.id,
                "text_value": "Segunda respuesta",
            },
            {
                "field": field_choice.id,
                "selected_choices": [choice.id],
            },
        ],
    }

    response = client.post(
        reverse("response-list"),
        data=payload,
        content_type="application/json",
    )

    assert response.status_code == 400


def test_text_field_rejects_number_value(
    client,
    sample_form,
):
    form, field_text, field_choice, choice = sample_form

    payload = {
        "form": form.id,
        "respondent_name": "Maria Perez",
        "document_type": "CC",
        "document_number": "444555666",
        "answers": [
            {
                "field": field_text.id,
                "text_value": "Texto válido",
                "number_value": 123,
            },
            {
                "field": field_choice.id,
                "selected_choices": [choice.id],
            },
        ],
    }

    response = client.post(
        reverse("response-list"),
        data=payload,
        content_type="application/json",
    )

    assert response.status_code == 400


def test_choice_from_another_field_is_rejected(
    client,
    sample_form,
    user,
):
    form, field_text, field_choice, choice = sample_form

    another_field = FormField.objects.create(
        form=form,
        label="Otra zona",
        field_type="single_choice",
        order=3,
    )

    another_choice = FieldChoice.objects.create(
        field=another_field,
        text="Rural",
        order=1,
    )

    payload = {
        "form": form.id,
        "respondent_name": "Maria Perez",
        "document_type": "CC",
        "document_number": "777888999",
        "answers": [
            {
                "field": field_choice.id,
                "selected_choices": [another_choice.id],
            },
            {
                "field": field_text.id,
                "text_value": "Todo bien",
            },
        ],
    }

    response = client.post(
        reverse("response-list"),
        data=payload,
        content_type="application/json",
    )

    assert response.status_code == 400


def test_field_with_answers_cannot_change_type(
    client,
    sample_form,
    user,
):
    form, field_text, field_choice, choice = sample_form

    client.force_login(user)

    payload = _payload(
        form,
        field_text,
        field_choice,
        choice,
    )

    response = client.post(
        reverse("response-list"),
        data=payload,
        content_type="application/json",
    )

    assert response.status_code == 201

    update_payload = {
        "fields": [
            {
                "id": field_text.id,
                "label": "Observaciones",
                "field_type": "number",
                "is_required": True,
                "order": 1,
            },
            {
                "id": field_choice.id,
                "label": "Zona",
                "field_type": "single_choice",
                "is_required": True,
                "order": 2,
                "choices": [
                    {
                        "text": "Urbana",
                        "order": 1,
                    },
                    {
                        "text": "Rural",
                        "order": 2,
                    },
                ],
            },
        ]
    }

    response = client.patch(
        reverse("form-detail", kwargs={"pk": form.id}),
        data=update_payload,
        content_type="application/json",
    )

    assert response.status_code == 400
