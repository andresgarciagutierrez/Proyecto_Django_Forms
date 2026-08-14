import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({
  children,
  requireFormCreate = false,
}) {
  const {
    token,
    loading,
    canManageForms,
  } = useAuth();

  // ---------------------------------------------------------
  // Mientras restauramos la sesión
  // ---------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin mx-auto mb-3" />

          <p className="text-sm text-slate-500 font-medium">
            Verificando sesión...
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // No autenticado
  // ---------------------------------------------------------
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // ---------------------------------------------------------
  // Está autenticado pero la ruta exige permiso formCreate
  // ---------------------------------------------------------
  if (requireFormCreate && !canManageForms) {
    return <Navigate to="/forms" replace />;
  }

  return children;
}