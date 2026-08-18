import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

// Candidatas ordenadas por prioridad (Primero Ngrok / URL principal)
const CANDIDATE_URLS = [
  process.env.EXPO_PUBLIC_API_URL,
  process.env.EXPO_PUBLIC_API_URL_OFICINA,
  process.env.EXPO_PUBLIC_API_URL_CASA,
].filter(Boolean) as string[];

function normalizeBaseUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const normalized = url.trim();
  return normalized.endsWith("/") ? normalized : `${normalized}/`;
}

// ------------------------------------------------------------------
// Estado de detección de red
// ------------------------------------------------------------------
let activeBaseUrl: string | null = null;
let isResolvingNetwork: Promise<string> | null = null;

/**
 * Realiza un test rápido al endpoint público /ping/ para verificar conectividad.
 */
async function testEndpoint(baseUrl: string, timeoutMs = 2500): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const normalized = normalizeBaseUrl(baseUrl);
    const response = await fetch(`${normalized}ping/`, {
      method: "GET",
      headers: {
        // Evita que Ngrok devuelva la página HTML de advertencia en cuentas free
        "ngrok-skip-browser-warning": "true",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
}

/**
 * Obtiene la IP actual asignada por el router leyéndola desde Expo Metro
 */
function getAutoDetectedMetroUrl(): string | null {
  if (Platform.OS === "web") return null;

  const hostUri =
    Constants.expoConfig?.hostUri || Constants.expoGoConfig?.debuggerHost;

  if (!hostUri) return null;

  const ipAddress = hostUri.split(":")[0];
  const port = process.env.EXPO_PUBLIC_API_PORT || "8000";
  return `http://${ipAddress}:${port}/api/`;
}

/**
 * Detecta dinámicamente cuál de las direcciones de red está activa
 */
async function discoverWorkingBaseUrl(): Promise<string> {
  if (activeBaseUrl) return activeBaseUrl;
  if (isResolvingNetwork) return isResolvingNetwork;

  isResolvingNetwork = (async () => {
    try {
      // 1. Probar primero las URLs configuradas explícitamente en .env (Ngrok, Casa, Oficina)
      for (const candidate of CANDIDATE_URLS) {
        const normalized = normalizeBaseUrl(candidate);
        if (normalized && (await testEndpoint(normalized))) {
          if (__DEV__) console.log("[DYNAMIC NETWORK] Detectado por lista .env:", normalized);
          activeBaseUrl = normalized;
          return normalized;
        }
      }

      // 2. Si las del .env fallan, probar IP autodetectada por Metro en la red local
      const autoMetroUrl = getAutoDetectedMetroUrl();
      if (autoMetroUrl && (await testEndpoint(autoMetroUrl))) {
        if (__DEV__) console.log("[DYNAMIC NETWORK] Detectado por Metro:", autoMetroUrl);
        activeBaseUrl = autoMetroUrl;
        return autoMetroUrl;
      }

      // 3. Fallback por defecto si es Web o Emulador Android
      const fallback =
        Platform.OS === "web"
          ? `http://localhost:${process.env.EXPO_PUBLIC_API_PORT || "8000"}/api/`
          : "http://10.0.2.2:8000/api/";

      activeBaseUrl = fallback;
      return fallback;
    } finally {
      isResolvingNetwork = null;
    }
  })();

  return isResolvingNetwork;
}

// ------------------------------------------------------------------
// Instancia Axios e Interceptores
// ------------------------------------------------------------------
const api = axios.create({
  timeout: 10_000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true", // Omitir pantalla de aviso de Ngrok
  },
});

function log(...args: unknown[]): void {
  if (__DEV__) console.log(...args);
}

function logError(...args: unknown[]): void {
  if (__DEV__) console.error(...args);
}

function logWarn(...args: unknown[]): void {
  if (__DEV__) console.warn(...args);
}

function isClientError(status: number): boolean {
  return status >= 400 && status < 500;
}

function isLoginUrl(url: string | null | undefined): boolean {
  return url?.replace(/^\/+/, "") === "token/";
}

type UnauthorizedHandler = () => void;
type NetworkErrorHandler = (error: unknown) => void;

let onUnauthorized: UnauthorizedHandler | null = null;
let onNetworkError: NetworkErrorHandler | null = null;

export function setOnUnauthorized(handler: UnauthorizedHandler | null): void {
  onUnauthorized = typeof handler === "function" ? handler : null;
}

export function setOnNetworkError(handler: NetworkErrorHandler | null): void {
  onNetworkError = typeof handler === "function" ? handler : null;
}

api.interceptors.request.use(
  async (config) => {
    try {
      if (!config.baseURL) {
        config.baseURL = await discoverWorkingBaseUrl();
      }

      const token = await AsyncStorage.getItem("token");

      if (token && !isLoginUrl(config.url)) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Token ${token}`;
      }

      log(
        `[API REQUEST] ${config.method?.toUpperCase() || "GET"} ${
          config.baseURL || ""
        }${config.url || ""}`
      );

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

api.interceptors.response.use(
  (response) => {
    log(`[API RESPONSE] ${response.status} ${response.config.url}`);
    return response;
  },

  async (error) => {
    if (!error.response) {
      activeBaseUrl = null;
      isResolvingNetwork = null;

      logError("[API NETWORK ERROR]", {
        message: error.message,
        code: error.code,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
      });

      onNetworkError?.(error);
      return Promise.reject(error);
    }

    const { status } = error.response;
    const logFn = isClientError(status) ? logWarn : logError;

    logFn("[API ERROR]", {
      status,
      url: error.config?.url,
      data: error.response.data,
    });

    if (status === 401 && !isLoginUrl(error.config?.url)) {
      const hadToken = Boolean(await AsyncStorage.getItem("token"));

      if (hadToken) {
        try {
          await AsyncStorage.multiRemove(["token", "username"]);
        } catch (storageError) {
          logError("[AUTH STORAGE ERROR]", storageError);
        }

        onUnauthorized?.();
      }
    }

    return Promise.reject(error);
  }
);

export { discoverWorkingBaseUrl };
export default api;