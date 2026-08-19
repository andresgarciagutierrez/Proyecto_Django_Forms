import api from "./client";
import { requireText, requirePresent } from "./validators";

export type RegisterPayload = {
  username: string;
  email: string;
  telephone?: string;
  date_of_birth?: string | null;
  password1: string;
  password2: string;
};

export type AuthResponse = {
  token: string;
  username: string;
};

export type UserProfile = {
  id: number;
  username: string;
  email: string;
  telephone?: string;
  date_of_birth?: string | null;
};

export async function loginRequest(
  username: string,
  password: string
): Promise<AuthResponse> {
  requireText(username, "El usuario es obligatorio.");
  requirePresent(password, "La contraseña es obligatoria.");

  const response = await api.post<AuthResponse>("token/", {
    username: username.trim(),
    password,
  });

  if (!response.data?.token) {
    throw new Error("El servidor no devolvió un token de autenticación.");
  }

  return response.data;
}

export async function fetchMe(): Promise<UserProfile> {
  const response = await api.get<UserProfile>("me/");
  return response.data;
}

export async function registerRequest(
  payload: RegisterPayload
): Promise<AuthResponse> {
  const { username, email, telephone, date_of_birth, password1, password2 } = payload;

  requireText(username, "El usuario es obligatorio.");
  requireText(email, "El email es obligatorio.");
  requirePresent(password1, "La contraseña es obligatoria.");

  if (password1 !== password2) {
    throw new Error("Las contraseñas no coinciden.");
  }

  const response = await api.post<AuthResponse>("register/", {
    username: username.trim(),
    email: email.trim(),
    telephone: telephone || "",
    date_of_birth: date_of_birth || null,
    password1,
    password2,
  });

  return response.data;
}