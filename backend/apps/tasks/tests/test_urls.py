from django.urls import resolve, reverse


def test_task_list_url_resolves():
    url = reverse("tasks:list")
    assert url == "/tasks/"
    assert resolve(url).view_name == "tasks:list"


def test_task_create_url_resolves():
    url = reverse("tasks:create")
    assert url == "/tasks/new/"
    assert resolve(url).view_name == "tasks:create"


def test_task_edit_url_resolves():
    url = reverse("tasks:edit", kwargs={"pk": 1})
    assert url == "/tasks/1/edit/"
    assert resolve(url).view_name == "tasks:edit"


def test_task_delete_url_resolves():
    url = reverse("tasks:delete", kwargs={"pk": 1})
    assert url == "/tasks/1/delete/"
    assert resolve(url).view_name == "tasks:delete"


def test_task_detail_url_resolves():
    url = reverse("tasks:detail", kwargs={"pk": 1})
    assert url == "/tasks/1/detail/"
    assert resolve(url).view_name == "tasks:detail"
