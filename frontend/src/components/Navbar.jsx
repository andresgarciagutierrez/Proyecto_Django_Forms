import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const {
    token,
    username,
    logout,
    canManageForms,
    canViewResponses,
  } = useAuth();

  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate("/login");
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-white border-b border-slate-200 shadow-sm">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">

          {/* =========================
              LOGO
          ========================== */}
          <Link
            to="/forms"
            onClick={closeMenu}
            className="flex items-center gap-2 text-lg font-bold text-slate-800 hover:text-sky-600 transition-colors"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
            Formularios
          </Link>

          {/* =========================
              NAVEGACIÓN DESKTOP
          ========================== */}
          <div className="hidden sm:flex items-center gap-6">

            <Link
              to="/forms"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Disponibles
            </Link>

            {token && canManageForms && (
              <Link
                to="/forms/new"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Nuevo
              </Link>
            )}

            {token && canViewResponses && (
              <Link
                to="/responses"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Respuestas
              </Link>
            )}
          </div>

          {/* =========================
              USUARIO DESKTOP
          ========================== */}
          <div className="hidden sm:flex items-center gap-3">

            {token ? (
              <>
                {username && (
                  <span className="inline-flex items-center rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                    {username}
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-sm font-medium text-rose-600 hover:text-rose-700 hover:underline transition-colors"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="text-sm font-semibold text-sky-600 hover:text-sky-700 transition-colors"
              >
                Iniciar sesión
              </Link>
            )}
          </div>

          {/* =========================
              BOTÓN MOBILE
          ========================== */}
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="sm:hidden inline-flex items-center justify-center rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={isOpen}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {isOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* =========================
          MENÚ MOBILE
      ========================== */}
      {isOpen && (
        <div className="sm:hidden border-t border-slate-100 bg-white">
          <div className="w-full max-w-7xl mx-auto px-4 py-3 space-y-1">

            {/* Disponibles */}
            <Link
              to="/forms"
              onClick={closeMenu}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              Disponibles
            </Link>

            {/* Nuevo */}
            {token && canManageForms && (
              <Link
                to="/forms/new"
                onClick={closeMenu}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                Nuevo
              </Link>
            )}

            {/* Respuestas */}
            {token && canViewResponses && (
              <Link
                to="/responses"
                onClick={closeMenu}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                Respuestas
              </Link>
            )}

            {/* =========================
                USUARIO MOBILE
            ========================== */}
            <div className="mt-3 border-t border-slate-100 pt-3">

              {token ? (
                <div className="flex items-center justify-between gap-3 px-3">

                  {username && (
                    <span className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 border border-sky-100">
                      {username}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-sm font-semibold text-rose-600 hover:text-rose-700 transition-colors"
                  >
                    Cerrar sesión
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={closeMenu}
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-sky-600 hover:bg-sky-50 hover:text-sky-700 transition-colors"
                >
                  Iniciar sesión
                </Link>
              )}

            </div>
          </div>
        </div>
      )}
    </nav>
  );
}