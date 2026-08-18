import { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../context/AuthContext";
import AuthCard from "../components/AuthCard";
import LabeledInput from "../components/LabeledInput";

export default function RegisterScreen() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();

  const handleRegister = async () => {
    if (submitting) return;

    if (!username.trim() || !email.trim() || !password1) {
      setError("Usuario, email y contraseña son obligatorios.");
      return;
    }

    if (password1 !== password2) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        telephone: telephone.trim(),
        date_of_birth: dateOfBirth.trim() || null,
        password1,
        password2,
      });

      router.replace("/forms");
    } catch (err: any) {
      console.error("[REGISTER] ERROR:", {
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data,
      });

      const data = err?.response?.data;
      let message = "No se pudo completar el registro.";

      if (typeof data?.detail === "string") {
        message = data.detail;
      } else if (data && typeof data === "object") {
        const values = Object.values(data).flat();
        if (values.length) message = values.join(" ");
      } else if (err?.message) {
        message = err.message;
      }

      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Crear cuenta"
      subtitle="Regístrate para diligenciar y gestionar formularios."
      containerClassName="py-10"
    >
      {error ? (
        <View className="health-error-light health-error-border border rounded-xl p-3 mb-4">
          <Text className="health-error-text text-sm">{error}</Text>
        </View>
      ) : null}

      <LabeledInput
        label="Usuario"
        value={username}
        onChangeText={setUsername}
        editable={!submitting}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Ingrese su usuario"
      />

      <LabeledInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        editable={!submitting}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="correo@ejemplo.com"
      />

      <LabeledInput
        label="Teléfono"
        value={telephone}
        onChangeText={setTelephone}
        editable={!submitting}
        keyboardType="phone-pad"
        placeholder="Opcional"
      />

      <LabeledInput
        label="Fecha de nacimiento"
        value={dateOfBirth}
        onChangeText={setDateOfBirth}
        editable={!submitting}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        placeholder="YYYY-MM-DD (opcional)"
      />

      <LabeledInput
        label="Contraseña"
        value={password1}
        onChangeText={setPassword1}
        editable={!submitting}
        secureTextEntry
        autoCapitalize="none"
        placeholder="Ingrese una contraseña"
      />

      <LabeledInput
        label="Confirmar contraseña"
        value={password2}
        onChangeText={setPassword2}
        editable={!submitting}
        secureTextEntry
        autoCapitalize="none"
        placeholder="Repita la contraseña"
        inputClassName="health-input mb-6"
      />

      <TouchableOpacity
        onPress={handleRegister}
        disabled={submitting}
        activeOpacity={0.8}
        className={submitting ? "health-button-disabled" : "health-button-primary"}
      >
        {submitting ? (
          <View className="flex-row justify-center items-center">
            <ActivityIndicator size="small" color="#ffffff" />
            <Text className="text-white font-semibold ml-2">
              Creando cuenta...
            </Text>
          </View>
        ) : (
          <Text className="text-white text-center font-semibold">
            Crear cuenta
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/login")}
        activeOpacity={0.7}
        className="mt-5"
      >
        <Text className="health-text-secondary text-sm text-center">
          ¿Ya tienes cuenta?{" "}
          <Text className="text-sky-600 font-semibold">Inicia sesión</Text>
        </Text>
      </TouchableOpacity>
    </AuthCard>
  );
}