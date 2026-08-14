import { useState } from "react";

import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { router } from "expo-router";

import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const { login } = useAuth();

  // ==========================================================
  // LOGIN
  // ==========================================================

  const handleLogin = async () => {
    if (submitting) {
      return;
    }

    const cleanUsername =
      username.trim();

    if (!cleanUsername || !password) {
      setError(
        "Completa usuario y contraseña."
      );
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      await login(
        cleanUsername,
        password
      );

      router.replace("/forms");
    } catch (err: any) {
      console.error(
        "[LOGIN] ERROR:",
        {
          message: err?.message,
          status:
            err?.response?.status,
          data:
            err?.response?.data,
        }
      );

      const status =
        err?.response?.status;

      if (!err?.response) {
        setError(
          "No hay conexión con el servidor."
        );
      } else if (
        status === 400 ||
        status === 401
      ) {
        setError(
          "Usuario o contraseña incorrectos."
        );
      } else if (status >= 500) {
        setError(
          "El servidor presentó un error. Inténtalo nuevamente."
        );
      } else {
        setError(
          "Ocurrió un error al iniciar sesión."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 justify-center bg-gray-100 px-6">
      <View className="bg-white rounded-lg shadow p-6">

        <Text className="text-2xl font-bold text-gray-800 mb-2">
          Iniciar sesión
        </Text>

        <Text className="text-gray-500 mb-6">
          Ingresa tus credenciales para continuar.
        </Text>

        {/* ==================================================
            ERROR
        ================================================== */}

        {error ? (
          <Text className="bg-red-100 text-red-700 text-sm p-2 rounded mb-4">
            {error}
          </Text>
        ) : null}

        {/* ==================================================
            USUARIO
        ================================================== */}

        <Text className="text-sm font-medium text-gray-700 mb-1">
          Usuario
        </Text>

        <TextInput
          value={username}
          onChangeText={(value) => {
            setUsername(value);

            if (error) {
              setError("");
            }
          }}
          editable={!submitting}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
          placeholder="Ingrese su usuario"
          className="border border-gray-300 rounded px-3 py-2 mb-4"
        />

        {/* ==================================================
            CONTRASEÑA
        ================================================== */}

        <Text className="text-sm font-medium text-gray-700 mb-1">
          Contraseña
        </Text>

        <TextInput
          value={password}
          onChangeText={(value) => {
            setPassword(value);

            if (error) {
              setError("");
            }
          }}
          secureTextEntry
          editable={!submitting}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password"
          textContentType="password"
          placeholder="Ingrese su contraseña"
          className="border border-gray-300 rounded px-3 py-2 mb-6"
        />

        {/* ==================================================
            BOTÓN
        ================================================== */}

        <TouchableOpacity
          onPress={handleLogin}
          disabled={submitting}
          activeOpacity={0.8}
          className={
            submitting
              ? "rounded py-3 bg-gray-400"
              : "rounded py-3 bg-blue-600"
          }
        >
          {submitting ? (
            <View className="flex-row justify-center items-center">
              <ActivityIndicator
                size="small"
                color="#ffffff"
              />

              <Text className="text-white font-semibold ml-2">
                Entrando...
              </Text>
            </View>
          ) : (
            <Text className="text-white text-center font-semibold">
              Entrar
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}