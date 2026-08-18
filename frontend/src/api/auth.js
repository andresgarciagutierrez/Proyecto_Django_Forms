import api from "./client";

// Petición real al backend. No depende de que ya haya un token guardado,
// así que puede usar el mismo cliente axios sin problema.
export const loginRequest = (username, password) =>
  api.post("token/", { username, password });

// Perfil y rol del usuario autenticado (para decidir qué mostrar en la UI).
// Pega a ".../api/me/" (MeView registrada en config/urls.py).
export const getMe = () => api.get("me/");

// Registro de un usuario nuevo. El backend devuelve token + username
// de una vez (ver RegisterAPIView), así que el frontend puede loguear
// automáticamente sin pedirle al usuario que vuelva a escribir sus
// credenciales.
export const registerRequest = (data) => api.post("register/", data);