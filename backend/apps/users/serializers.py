from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class UserRegisterSerializer(serializers.ModelSerializer):
    password1 = serializers.CharField(write_only=True, style={"input_type": "password"})
    password2 = serializers.CharField(write_only=True, style={"input_type": "password"})

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "telephone",
            "date_of_birth",
            "password1",
            "password2",
        ]
        # username y email ya son unique=True en el modelo, así que
        # ModelSerializer agrega la validación de unicidad automática
        # (no hace falta escribirla a mano).

    def validate(self, attrs):
        if attrs["password1"] != attrs["password2"]:
            raise serializers.ValidationError(
                {"password2": "Las contraseñas no coinciden."}
            )

        # Reusa los mismos validadores de Django (longitud mínima,
        # similitud con el username, contraseñas comunes, etc.) que ya
        # aplica el registro por HTML vía UserRegisterForm.
        validate_password(attrs["password1"])

        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")
        password = validated_data.pop("password1")

        user = User(**validated_data)
        user.set_password(password)
        user.save()

        return user
