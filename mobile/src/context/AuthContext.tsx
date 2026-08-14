import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

import { loginRequest } from "../api/auth";
import { setOnUnauthorized } from "../api/client";

/**
 * ============================================================
 * TIPOS
 * ============================================================
 */

type AuthContextType = {
  token: string | null;
  username: string | null;
  loading: boolean;

  login: (
    username: string,
    password: string
  ) => Promise<void>;

  logout: () => Promise<void>;
};

/**
 * ============================================================
 * CONTEXT
 * ============================================================
 */

const AuthContext =
  createContext<AuthContextType | null>(null);

/**
 * ============================================================
 * PROVIDER
 * ============================================================
 */

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [token, setToken] =
    useState<string | null>(null);

  const [username, setUsername] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  /**
   * ==========================================================
   * RESTAURAR SESIÓN
   * ==========================================================
   */

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        const storedToken =
          await AsyncStorage.getItem(
            "token"
          );

        const storedUsername =
          await AsyncStorage.getItem(
            "username"
          );

        if (!mounted) {
          return;
        }

        setToken(
          storedToken || null
        );

        setUsername(
          storedUsername || null
        );

        if (__DEV__) {
          console.log(
            "[AUTH] Sesión restaurada:",
            {
              hasToken: Boolean(storedToken),
              username:
                storedUsername || null,
            }
          );
        }
      } catch (error) {
        console.error(
          "[AUTH] ERROR RESTAURANDO SESIÓN:",
          error
        );

        if (mounted) {
          setToken(null);
          setUsername(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  /**
   * ==========================================================
   * LOGIN
   * ==========================================================
   */

  const login = useCallback(
    async (
      usernameValue: string,
      password: string
    ) => {
      if (__DEV__) {
        console.log(
          "[AUTH] Iniciando login para:",
          usernameValue
        );
      }

      const data = await loginRequest(
        usernameValue,
        password
      );

      const newToken =
        data?.token;

      if (!newToken) {
        throw new Error(
          "El servidor no devolvió un token de autenticación."
        );
      }

      /**
       * Guardar token.
       */
      await AsyncStorage.setItem(
        "token",
        newToken
      );

      /**
       * Guardar usuario.
       */
      await AsyncStorage.setItem(
        "username",
        usernameValue.trim()
      );

      /**
       * Actualizar estado.
       */
      setToken(newToken);

      setUsername(
        usernameValue.trim()
      );

      if (__DEV__) {
        console.log(
          "[AUTH] Login exitoso."
        );
      }
    },
    []
  );

  /**
   * ==========================================================
   * LOGOUT
   * ==========================================================
   */

  const logout = useCallback(
    async () => {
      try {
        await AsyncStorage.removeItem(
          "token"
        );

        await AsyncStorage.removeItem(
          "username"
        );
      } catch (error) {
        console.error(
          "[AUTH] ERROR ELIMINANDO SESIÓN:",
          error
        );
      } finally {
        setToken(null);
        setUsername(null);
      }
    },
    []
  );

  /**
   * ==========================================================
   * 401 GLOBAL
   * ==========================================================
   *
   * Si cualquier endpoint protegido devuelve:
   *
   * 401 Unauthorized
   *
   * client.js:
   *
   *     ↓
   * onUnauthorized()
   *
   * AuthContext:
   *
   *     ↓
   * logout()
   *
   *     ↓
   * /login
   */

  useEffect(() => {
    setOnUnauthorized(async () => {
      if (__DEV__) {
        console.log(
          "[AUTH] 401 recibido. Cerrando sesión."
        );
      }

      await logout();

      router.replace("/login");
    });

    return () => {
      setOnUnauthorized(null);
    };
  }, [logout]);

  /**
   * ==========================================================
   * CONTEXT PROVIDER
   * ==========================================================
   */

  return (
    <AuthContext.Provider
      value={{
        token,
        username,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * ============================================================
 * HOOK
 * ============================================================
 */

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth debe usarse dentro de un AuthProvider"
    );
  }

  return context;
}