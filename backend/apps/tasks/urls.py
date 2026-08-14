from django.urls import path

from .views import (
    TaskCreateView,
    TaskDeleteView,
    TaskDetailUpdateView,
    TaskListView,
    TaskUpdateView,
)

app_name = "tasks"

urlpatterns = [
    path("", TaskListView.as_view(), name="list"),
    path("new/", TaskCreateView.as_view(), name="create"),
    path("<int:pk>/edit/", TaskUpdateView.as_view(), name="edit"),
    path("<int:pk>/detail/", TaskDetailUpdateView.as_view(), name="detail"),
    path("<int:pk>/delete/", TaskDeleteView.as_view(), name="delete"),
]
