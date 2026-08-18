import axios from "axios";

// La URL base viene de una variable de entorno (ver .env.example).
// Si no está definida, cae de vuelta al valor de desarrollo local.
const baseURL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/";

const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Token ${token}`;
  return config;
});

// Si el backend responde 401, solo tiene sentido "cerrar sesión" cuando
// había una sesión que cerrar. Un request anónimo (sin token — por
// ejemplo, alguien llenando un formulario público) también puede recibir
// un 401 legítimo del backend; en ese caso no hay nada que limpiar y
// mandarlo a /login no tiene sentido.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const hadToken = Boolean(localStorage.getItem("token"));

    if (error.response?.status === 401 && hadToken) {
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