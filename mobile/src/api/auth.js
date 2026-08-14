import api from "./client";

export async function loginRequest(username, password) {
  if (!username?.trim()) {
    throw new Error("El usuario es obligatorio.");
  }

  if (!password) {
    throw new Error("La contraseña es obligatoria.");
  }

  const response = await api.post("token/", {
    username: username.trim(),
    password,
  });

  if (!response.data?.token) {
    throw new Error("El servidor no devolvió un token de autenticación.");
  }

  return response.data;
}