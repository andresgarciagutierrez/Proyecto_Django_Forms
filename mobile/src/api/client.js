import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// ============================================================
// CONFIGURACIÓN DE REDES
// ============================================================
//
// .env:
//
// EXPO_PUBLIC_NETWORK=oficina
//
// EXPO_PUBLIC_API_URL_CASA=http://192.168.1.100:8000/api/
// EXPO_PUBLIC_API_URL_OFICINA=http://172.30.20.21:8000/api/
//
// EXPO_PUBLIC_API_PORT=8000

const NETWORK_URLS = {
  casa: process.env.EXPO_PUBLIC_API_URL_CASA,
  oficina: process.env.EXPO_PUBLIC_API_URL_OFICINA,
};

// ============================================================
// HELPERS
// ============================================================

function normalizeBaseUrl(url) {
  if (!url?.trim()) return null;
  const normalized = url.trim();
  return normalized.endsWith("/") ? normalized : `${normalized}/`;
}

// ============================================================
// RESOLVER BASE URL
// ============================================================
//
// Prioridad:
//   1. EXPO_PUBLIC_API_URL
//   2. EXPO_PUBLIC_NETWORK
//   3. Host de Expo / Metro
//   4. extra.apiUrl

function resolveBaseUrl() {
  // 1. URL explícita
  if (process.env.EXPO_PUBLIC_API_URL) {
    return normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL);
  }

  // 2. URL según la red
  const network = process.env.EXPO_PUBLIC_NETWORK?.trim().toLowerCase();
  if (network && NETWORK_URLS[network]) {
    return normalizeBaseUrl(NETWORK_URLS[network]);
  }

  // 3. Detectar host de Expo / Metro
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost;

  if (hostUri) {
    const host = hostUri.split(":")[0];
    const port = process.env.EXPO_PUBLIC_API_PORT || "8000";
    return normalizeBaseUrl(`http://${host}:${port}/api`);
  }

  // 4. Fallback de Expo
  return normalizeBaseUrl(Constants.expoConfig?.extra?.apiUrl);
}

const BASE_URL = resolveBaseUrl();

if (!BASE_URL) {
  throw new Error(
    "No se pudo determinar la URL de la API. " +
    "Configura EXPO_PUBLIC_API_URL, EXPO_PUBLIC_NETWORK o extra.apiUrl."
  );
}

// ============================================================
// DIAGNÓSTICO
// ============================================================

if (__DEV__) {
  console.log("====================================");
  console.log("[API CONFIG]");
  console.log("NETWORK      :", process.env.EXPO_PUBLIC_NETWORK);
  console.log("API_URL_CASA :", process.env.EXPO_PUBLIC_API_URL_CASA);
  console.log("API_URL_OFI  :", process.env.EXPO_PUBLIC_API_URL_OFICINA);
  console.log("API_PORT     :", process.env.EXPO_PUBLIC_API_PORT);
  console.log("BASE_URL     :", BASE_URL);
  console.log("====================================");
}

// ============================================================
// AXIOS
// ============================================================

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10_000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// ============================================================
// UTILS INTERNOS
// ============================================================

function log(...args) {
  if (__DEV__) console.log(...args);
}

function logError(...args) {
  if (__DEV__) console.error(...args);
}

function isLoginUrl(url) {
  return url?.replace(/^\/+/, "") === "token/";
}

// ============================================================
// TIMEOUT PERSONALIZADO
// ============================================================

export function withTimeout(ms) {
  return { timeout: ms };
}

// ============================================================
// CALLBACKS GLOBALES
// ============================================================

let onUnauthorized = null;
let onNetworkError = null;

export function setOnUnauthorized(handler) {
  onUnauthorized = typeof handler === "function" ? handler : null;
}

export function setOnNetworkError(handler) {
  onNetworkError = typeof handler === "function" ? handler : null;
}

// ============================================================
// REQUEST INTERCEPTOR
// ============================================================

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("token");

      if (token && !isLoginUrl(config.url)) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Token ${token}`;
      }

      const method = config.method?.toUpperCase() || "GET";
      const fullUrl = `${config.baseURL || ""}${config.url || ""}`;
      log(`[API REQUEST] ${method} ${fullUrl}`);

      return config;
    } catch (error) {
      logError("[API REQUEST ERROR]", error);
      return Promise.reject(error);
    }
  },
  (error) => {
    logError("[API REQUEST ERROR]", error);
    return Promise.reject(error);
  }
);

// ============================================================
// RESPONSE INTERCEPTOR
// ============================================================

api.interceptors.response.use(
  (response) => {
    log(`[API RESPONSE] ${response.status} ${response.config.url}`);
    return response;
  },

  async (error) => {
    // Sin respuesta HTTP: timeout, red caída, IP incorrecta, firewall
    if (!error.response) {
      logError("[API NETWORK ERROR]", {
        message: error.message,
        code: error.code,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
      });

      onNetworkError?.(error);
      return Promise.reject(error);
    }

    logError("[API ERROR]", {
      status: error.response.status,
      url: error.config?.url,
      data: error.response.data,
    });

    // 401 fuera del login → limpiar sesión
    if (error.response.status === 401 && !isLoginUrl(error.config?.url)) {
      try {
        await AsyncStorage.multiRemove(["token", "username"]);
      } catch (storageError) {
        logError("[AUTH STORAGE ERROR]", storageError);
      }

      onUnauthorized?.();
    }

    return Promise.reject(error);
  }
);

// ============================================================
// EXPORTS
// ============================================================

export { BASE_URL };
export default api;