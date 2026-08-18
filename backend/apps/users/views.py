from django.urls import reverse_lazy
from django.views.generic import CreateView, UpdateView
from django.contrib.auth.mixins import LoginRequiredMixin
from rest_framework import generics, permissions
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView

from .forms import UserProfileForm, UserRegisterForm
from .models import User
from .serializers import UserRegisterSerializer


class UserRegisterView(CreateView):
    """Registro por HTML (template), sin cambios."""

    form_class = UserRegisterForm
    template_name = "users/register.html"
    success_url = reverse_lazy("users:login")


class UserProfileView(LoginRequiredMixin, UpdateView):
    model = User
    form_class = UserProfileForm
    template_name = "users/profile.html"
    success_url = reverse_lazy("users:profile")

    def get_object(self):
        return self.request.user


class MeView(APIView):
    """
    Devuelve el perfil y rol del usuario autenticado, para que el
    frontend pueda decidir qué mostrar (crear formularios, ver
    respuestas) sin tener que adivinarlo del lado del cliente.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response(
            {
                "username": user.username,
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,
                "is_form_creator": user.groups.filter(name="Form Creators").exists(),
            }
        )


class RegisterAPIView(generics.CreateAPIView):
    """
    Registro vía API (JSON), para el frontend en React.

    Público (AllowAny): cualquiera puede registrarse. Al crear el
    usuario, genera de una vez su token de autenticación para que el
    frontend pueda loguearlo automáticamente sin pedirle que vuelva a
    escribir usuario/contraseña.
    """

    serializer_class = UserRegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        token, _ = Token.objects.get_or_create(user=user)

        return Response(
            {"token": token.key, "username": user.username},
            status=201,
        )
