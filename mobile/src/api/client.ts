import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

// Candidatas ordenadas por prioridad
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

// Estado de detección de red
let activeBaseUrl: string | null = null;
let isResolvingNetwork: Promise<string> | null = null;

/**
 * Realiza un test rápido al endpoint público /ping/
 */
async function testEndpoint(baseUrl: string, timeoutMs = 2000): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const normalized = normalizeBaseUrl(baseUrl);
    if (!normalized) throw new Error("URL inválida");

    const response = await fetch(`${normalized}ping/`, {
      method: "GET",
      headers: {
        "ngrok-skip-browser-warning": "true",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) return normalized;
    throw new Error("Endpoint no respondió OK");
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Obtiene la IP actual asignada por el router leyendo desde Expo Metro
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
 * Detecta dinámicamente cuál dirección de red responde más rápido EN PARALELO
 */
async function discoverWorkingBaseUrl(): Promise<string> {
  if (activeBaseUrl) return activeBaseUrl;
  if (isResolvingNetwork) return isResolvingNetwork;

  isResolvingNetwork = (async () => {
    try {
      const candidates: string[] = [];

      CANDIDATE_URLS.forEach((url) => {
        const norm = normalizeBaseUrl(url);
        if (norm) candidates.push(norm);
      });

      const autoMetroUrl = getAutoDetectedMetroUrl();
      if (autoMetroUrl) candidates.push(autoMetroUrl);

      const fallback =
        Platform.OS === "web"
          ? `http://localhost:${process.env.EXPO_PUBLIC_API_PORT || "8000"}/api/`
          : "http://10.0.2.2:8000/api/";

      if (candidates.length === 0) {
        activeBaseUrl = fallback;
        return fallback;
      }

      try {
        const fastestWorkingUrl = await Promise.any(
          candidates.map((url) => testEndpoint(url))
        );
        if (__DEV__) console.log("[DYNAMIC NETWORK] Conectado a:", fastestWorkingUrl);
        activeBaseUrl = fastestWorkingUrl;
        return fastestWorkingUrl;
      } catch {
        if (__DEV__) console.warn("[DYNAMIC NETWORK] Fallback a red por defecto:", fallback);
        activeBaseUrl = fallback;
        return fallback;
      }
    } finally {
      isResolvingNetwork = null;
    }
  })();

  return isResolvingNetwork;
}

// Instancia Axios e Interceptores
const api = axios.create({
  timeout: 10_000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
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