from django import forms

from .models import Task, TaskDetail


class TaskForm(forms.ModelForm):

    class Meta:
        model = Task

        fields = [
            "title",
            "description",
            "is_completed",
            "categories",
        ]

        labels = {
            "title": "Título",
            "description": "Descripción",
            "is_completed": "¿Tarea completada?",
            "categories": "Categorías",
        }

        widgets = {
            "title": forms.TextInput(
                attrs={
                    "placeholder": "Ej. Estudiar Django",
                }
            ),
            "description": forms.Textarea(
                attrs={
                    "placeholder": "Describe la tarea...",
                    "rows": 5,
                }
            ),
            "is_completed": forms.CheckboxInput(),
            "categories": forms.SelectMultiple(
                attrs={
                    "class": "category-select",
                }
            ),
        }

    def clean_title(self):
        title = self.cleaned_data["title"]

        if len(title.strip()) < 3:
            raise forms.ValidationError("El título debe tener al menos 3 caracteres.")

        return title


class TaskDetailForm(forms.ModelForm):

    class Meta:
        model = TaskDetail

        fields = [
            "notes",
            "priority",
        ]

        labels = {
            "notes": "Notas adicionales",
            "priority": "Prioridad",
        }

        widgets = {
            "notes": forms.Textarea(
                attrs={
                    "placeholder": "Agrega notas adicionales...",
                    "rows": 5,
                }
            ),
            "priority": forms.Select(),
        }
