from django.contrib.auth.forms import UserCreationForm, UserChangeForm

from .models import User


class UserRegisterForm(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = User
        fields = ["username", "email", "telephone", "date_of_birth"]


class UserProfileForm(UserChangeForm):

    password = None

    class Meta(UserChangeForm.Meta):
        model = User
        fields = ["username", "email", "telephone", "date_of_birth"]
