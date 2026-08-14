import axios from "axios";

// La URL base ahora viene de una variable de entorno (ver .env.example).
// Si no está definida, cae de vuelta al valor de desarrollo local.
const baseURL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/";

const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Token ${token}`;
  return config;
});

// Si el backend responde 401 (token inválido o expirado), limpiamos la
// sesión local y mandamos al usuario a /login en vez de dejarlo "logueado"
// en el frontend con un token que ya no sirve.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;