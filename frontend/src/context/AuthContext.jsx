import { createContext, useContext, useState, useEffect } from "react";
import { loginRequest, getMe } from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [username, setUsername] = useState(localStorage.getItem("username"));
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cada vez que cambia el token (login/logout), volvemos a consultar el rol.
  useEffect(() => {
    if (!token) {
      setRole(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    getMe()
      .then((res) => setRole(res.data))
      .catch(() => setRole(null))
      .finally(() => setLoading(false));
  }, [token]);

  const login = async (user, password) => {
    const response = await loginRequest(user, password);
    localStorage.setItem("token", response.data.token);
    localStorage.setItem("username", user);
    setToken(response.data.token);
    setUsername(user);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setToken(null);
    setUsername(null);
    setRole(null);
  };

  // Mismo criterio en ambos casos: staff/superuser siempre puede;
  // un Form Creator normal también puede gestionar y ver lo suyo.
  const canManageForms = Boolean(
    role?.is_form_creator || role?.is_staff || role?.is_superuser
  );
  const canViewResponses = canManageForms;

  return (
    <AuthContext.Provider
      value={{
        token,
        username,
        role,
        loading,
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

export const useAuth = () => useContext(AuthContext);