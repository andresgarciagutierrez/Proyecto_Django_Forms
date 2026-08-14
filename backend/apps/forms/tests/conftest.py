@pytest.fixture
def sample_form(db, user):

    form = Form.objects.create(
        title="Encuesta de campo",
        created_by=user,
    )

    field_text = FormField.objects.create(
        form=form,
        label="Observaciones",
        field_type="text",
        order=1,
    )

    field_choice = FormField.objects.create(
        form=form,
        label="Zona",
        field_type="single_choice",
        order=2,
    )

    choice = FieldChoice.objects.create(
        field=field_choice,
        text="Urbana",
        order=1,
    )

    FieldChoice.objects.create(
        field=field_choice,
        text="Rural",
        order=2,
    )

    return (
        form,
        field_text,
        field_choice,
        choice,
    )
