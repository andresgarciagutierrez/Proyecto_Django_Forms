import api from "./client";

// Petición real al backend. No depende de que ya haya un token guardado,
// así que puede usar el mismo cliente axios sin problema.
export function loginRequest(username, password) {
  return api.post("token/", { username, password });
}

// Perfil y rol del usuario autenticado (para decidir qué mostrar en la UI).
export function getMe() {
  return api.get("me/");
}