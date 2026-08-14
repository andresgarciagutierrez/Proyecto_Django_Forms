from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import get_object_or_404, redirect
from django.urls import reverse_lazy
from django.views.generic import CreateView, DeleteView, ListView, UpdateView

from .forms import TaskDetailForm, TaskForm
from .models import Task, TaskDetail
from .services import TaskLimitExceededError, create_task


class TaskListView(LoginRequiredMixin, ListView):
    model = Task
    template_name = "tasks/task_list.html"
    context_object_name = "tasks"

    def get_queryset(self):
        return (
            Task.objects.for_user(self.request.user)
            .prefetch_related("categories")
            .select_related("detail")
        )


class TaskCreateView(LoginRequiredMixin, CreateView):
    form_class = TaskForm
    template_name = "tasks/task_form.html"
    success_url = reverse_lazy("tasks:list")

    def form_valid(self, form):
        try:
            self.object = create_task(
                owner=self.request.user,
                title=form.cleaned_data["title"],
                description=form.cleaned_data["description"],
                is_completed=form.cleaned_data["is_completed"],
                categories=form.cleaned_data["categories"],
            )
        except TaskLimitExceededError as error:
            form.add_error(None, str(error))
            return self.form_invalid(form)

        return redirect(self.success_url)


class TaskUpdateView(LoginRequiredMixin, UpdateView):
    form_class = TaskForm
    template_name = "tasks/task_form.html"
    success_url = reverse_lazy("tasks:list")

    def get_queryset(self):
        return Task.objects.filter(owner=self.request.user)


class TaskDeleteView(LoginRequiredMixin, DeleteView):
    model = Task
    template_name = "tasks/task_confirm_delete.html"
    success_url = reverse_lazy("tasks:list")

    def get_queryset(self):
        return Task.objects.filter(owner=self.request.user)


class TaskDetailUpdateView(LoginRequiredMixin, UpdateView):
    form_class = TaskDetailForm
    template_name = "tasks/task_detail_form.html"

    def get_object(self, queryset=None):
        self.task = get_object_or_404(
            Task, pk=self.kwargs["pk"], owner=self.request.user
        )
        detail, _ = TaskDetail.objects.get_or_create(task=self.task)
        return detail

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["task"] = self.task
        return context

    def get_success_url(self):
        return reverse_lazy("tasks:list")
