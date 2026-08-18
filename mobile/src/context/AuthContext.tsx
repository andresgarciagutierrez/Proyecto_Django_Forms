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

import {
  fetchMe,
  loginRequest,
  registerRequest,
  RegisterPayload,
} from "../api/auth";
import { setOnUnauthorized } from "../api/client";

type Role = {
  username: string;
  is_staff: boolean;
  is_superuser: boolean;
  is_form_creator: boolean;
};

type AuthContextType = {
  token: string | null;
  username: string | null;
  role: Role | null;
  loading: boolean;
  isStaff: boolean;
  isSuperuser: boolean;
  isFormCreator: boolean;
  canManageForms: boolean;
  canViewResponses: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "token";
const USERNAME_KEY = "username";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        const [storedToken, storedUsername] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USERNAME_KEY),
        ]);

        if (!mounted) return;

        setToken(storedToken);
        setUsername(storedUsername);
      } catch (error) {
        console.error("[AUTH] Error restaurando sesión:", error);

        if (mounted) {
          setToken(null);
          setUsername(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  // GET /api/me/, se repite cuando cambia el token.
  useEffect(() => {
    let mounted = true;

    if (!token) {
      setRole(null);
      return;
    }

    fetchMe()
      .then((data) => {
        if (mounted) setRole(data);
      })
      .catch(() => {
        if (mounted) setRole(null);
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  const persistSession = useCallback(
    async (newToken: string, newUsername: string) => {
      await Promise.all([
        AsyncStorage.setItem(TOKEN_KEY, newToken),
        AsyncStorage.setItem(USERNAME_KEY, newUsername),
      ]);

      setToken(newToken);
      setUsername(newUsername);
    },
    []
  );

  const login = useCallback(
    async (usernameValue: string, password: string) => {
      const usernameTrimmed = usernameValue.trim();

      if (!usernameTrimmed || !password) {
        throw new Error("Usuario y contraseña son obligatorios.");
      }

      const data = await loginRequest(usernameTrimmed, password);
      const newToken = data?.token;

      if (!newToken) {
        throw new Error("El servidor no devolvió un token de autenticación.");
      }

      await persistSession(newToken, usernameTrimmed);
    },
    [persistSession]
  );

  // Si el backend devuelve token, deja la sesión iniciada de una vez.
  const register = useCallback(
    async (payload: RegisterPayload) => {
      const data = await registerRequest(payload);
      const newToken = data?.token;
      const newUsername = data?.username || payload.username.trim();

      if (newToken) {
        await persistSession(newToken, newUsername);
      }
    },
    [persistSession]
  );

  const logout = useCallback(async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(TOKEN_KEY),
        AsyncStorage.removeItem(USERNAME_KEY),
      ]);
    } catch (error) {
      console.error("[AUTH] Error eliminando sesión:", error);
    } finally {
      setToken(null);
      setUsername(null);
      setRole(null);
    }
  }, []);

  // client.ts solo dispara esto si de verdad había una sesión activa.
  useEffect(() => {
    setOnUnauthorized(async () => {
      await logout();
      router.replace("/login");
    });

    return () => {
      setOnUnauthorized(null);
    };
  }, [logout]);

  const isStaff = Boolean(role?.is_staff);
  const isSuperuser = Boolean(role?.is_superuser);
  const isFormCreator = Boolean(role?.is_form_creator);
  const canManageForms = isStaff || isSuperuser || isFormCreator;
  const canViewResponses = canManageForms;

  return (
    <AuthContext.Provider
      value={{
        token,
        username,
        role,
        loading,
        isStaff,
        isSuperuser,
        isFormCreator,
        canManageForms,
        canViewResponses,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider.");
  }

  return context;
}