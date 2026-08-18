import { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../context/AuthContext";
import AuthCard from "../components/AuthCard";
import LabeledInput from "../components/LabeledInput";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (submitting) return;

    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      setError("Completa usuario y contraseña.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      await login(cleanUsername, password);
      router.replace("/forms");
    } catch (err: any) {
      console.error("[LOGIN] ERROR:", {
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data,
      });

      const status = err?.response?.status;

      if (!err?.response) {
        setError("No hay conexión con el servidor.");
      } else if (status === 400 || status === 401) {
        setError("Usuario o contraseña incorrectos.");
      } else if (status >= 500) {
        setError("El servidor presentó un error. Inténtalo nuevamente.");
      } else {
        setError("Ocurrió un error al iniciar sesión.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Iniciar sesión"
      subtitle="Ingresa tus credenciales para continuar."
    >
      {error ? (
        <View className="health-error-light health-error-border border rounded-xl p-3 mb-4">
          <Text className="health-error-text text-sm">{error}</Text>
        </View>
      ) : null}

      <LabeledInput
        label="Usuario"
        value={username}
        onChangeText={(value) => {
          setUsername(value);
          if (error) setError("");
        }}
        editable={!submitting}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
        placeholder="Ingrese su usuario"
      />

      <LabeledInput
        label="Contraseña"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          if (error) setError("");
        }}
        secureTextEntry
        editable={!submitting}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="password"
        textContentType="password"
        placeholder="Ingrese su contraseña"
        inputClassName="health-input mb-6"
      />

      <TouchableOpacity
        onPress={handleLogin}
        disabled={submitting}
        activeOpacity={0.8}
        className={submitting ? "health-button-disabled" : "health-button-primary"}
      >
        {submitting ? (
          <View className="flex-row justify-center items-center">
            <ActivityIndicator size="small" color="#ffffff" />
            <Text className="text-white font-semibold ml-2">Entrando...</Text>
          </View>
        ) : (
          <Text className="text-white text-center font-semibold">Entrar</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/register")}
        activeOpacity={0.7}
        className="mt-5"
      >
        <Text className="health-text-secondary text-sm text-center">
          ¿No tienes cuenta?{" "}
          <Text className="text-sky-600 font-semibold">Regístrate</Text>
        </Text>
      </TouchableOpacity>
    </AuthCard>
  );
}