import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  loginRequest,
  getMe,
} from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(
    localStorage.getItem("token")
  );

  const [username, setUsername] = useState(
    localStorage.getItem("username")
  );

  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Obtener información del usuario
  useEffect(() => {
    if (!token) {
      setRole(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    getMe()
      .then(({ data }) => {
        setRole(data);
      })
      .catch(() => {
        setRole(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  // Login
  const login = async (user, password) => {
    const usernameValue = user.trim();

    if (!usernameValue || !password) {
      throw new Error(
        "Usuario y contraseña son obligatorios."
      );
    }

    const response = await loginRequest(
      usernameValue,
      password
    );

    const newToken = response.data?.token;

    if (!newToken) {
      throw new Error(
        "El servidor no devolvió un token de autenticación."
      );
    }

    localStorage.setItem("token", newToken);
    localStorage.setItem(
      "username",
      usernameValue
    );

    setToken(newToken);
    setUsername(usernameValue);
  };

  // Logout
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");

    setToken(null);
    setUsername(null);
    setRole(null);
  };

  // Permisos
  const isStaff = Boolean(role?.is_staff);
  const isSuperuser = Boolean(role?.is_superuser);
  const isFormCreator = Boolean(role?.is_form_creator);

  const canManageForms =
    isStaff ||
    isSuperuser ||
    isFormCreator;

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

        login,
        logout,

        canManageForms,
        canViewResponses,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () =>
  useContext(AuthContext);