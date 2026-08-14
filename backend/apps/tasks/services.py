import logging

from django.contrib.auth import get_user_model
from django.db import transaction

from .models import Task

logger = logging.getLogger(__name__)

User = get_user_model()


class TaskLimitExceededError(Exception):
    """Se lanza cuando un usuario intenta crear más tareas de las permitidas."""

    pass


MAX_TASKS_PER_USER = 50


@transaction.atomic
def create_task(
    *,
    owner: User,
    title: str,
    description: str = "",
    is_completed: bool = False,
    categories=None,
) -> Task:
    current_count = Task.objects.select_for_update().filter(owner=owner).count()
    if current_count >= MAX_TASKS_PER_USER:
        logger.warning(
            "Usuario %s intentó exceder el límite de tareas (%s/%s)",
            owner.username,
            current_count,
            MAX_TASKS_PER_USER,
        )
        raise TaskLimitExceededError(
            f"El usuario {owner.username} ya alcanzó el límite de {MAX_TASKS_PER_USER} tareas."
        )

    task = Task.objects.create(
        owner=owner,
        title=title,
        description=description,
        is_completed=is_completed,
    )

    if categories:
        task.categories.set(categories)

    logger.info(
        "Tarea creada: '%s' (id=%s) por %s", task.title, task.id, owner.username
    )
    return task
