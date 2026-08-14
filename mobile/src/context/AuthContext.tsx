import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

import { loginRequest } from "../api/auth";
import { setOnUnauthorized } from "../api/client";

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

const AuthContext =
  createContext<AuthContextType | null>(null);

const TOKEN_KEY = "token";
const USERNAME_KEY = "username";

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

  // Restaurar sesión
  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        const [storedToken, storedUsername] =
          await Promise.all([
            AsyncStorage.getItem(TOKEN_KEY),
            AsyncStorage.getItem(USERNAME_KEY),
          ]);

        if (!mounted) return;

        setToken(storedToken);
        setUsername(storedUsername);
      } catch (error) {
        console.error(
          "[AUTH] Error restaurando sesión:",
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
    };

    restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  // Login
  const login = useCallback(
    async (
      usernameValue: string,
      password: string
    ) => {
      const usernameTrimmed =
        usernameValue.trim();

      if (!usernameTrimmed || !password) {
        throw new Error(
          "Usuario y contraseña son obligatorios."
        );
      }

      const data = await loginRequest(
        usernameTrimmed,
        password
      );

      const newToken = data?.token;

      if (!newToken) {
        throw new Error(
          "El servidor no devolvió un token de autenticación."
        );
      }

      await Promise.all([
        AsyncStorage.setItem(
          TOKEN_KEY,
          newToken
        ),
        AsyncStorage.setItem(
          USERNAME_KEY,
          usernameTrimmed
        ),
      ]);

      setToken(newToken);
      setUsername(usernameTrimmed);
    },
    []
  );

  // Logout
  const logout = useCallback(async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(TOKEN_KEY),
        AsyncStorage.removeItem(USERNAME_KEY),
      ]);
    } catch (error) {
      console.error(
        "[AUTH] Error eliminando sesión:",
        error
      );
    } finally {
      setToken(null);
      setUsername(null);
    }
  }, []);

  // Manejo global de 401
  useEffect(() => {
    setOnUnauthorized(async () => {
      await logout();
      router.replace("/login");
    });

    return () => {
      setOnUnauthorized(null);
    };
  }, [logout]);

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

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth debe usarse dentro de un AuthProvider."
    );
  }

  return context;
}