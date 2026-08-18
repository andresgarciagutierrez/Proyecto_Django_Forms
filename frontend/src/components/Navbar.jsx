import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const DESKTOP_LINK_CLASS =
  "text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors";

const MOBILE_LINK_CLASS =
  "block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const { token, username, logout, canManageForms, canViewResponses } =
    useAuth();

  const navigate = useNavigate();

  const closeMenu = () => setIsOpen(false);

  const handleLogout = () => {
    logout();
    closeMenu();
    navigate("/login");
  };

  // Única fuente de verdad para qué links mostrar: antes esta misma
  // condición (token && canManageForms / canViewResponses) estaba
  // escrita dos veces, una para desktop y otra para mobile.
  const navLinks = [
    { to: "/forms", label: "Disponibles" },
    ...(token && canManageForms ? [{ to: "/forms/new", label: "Nuevo" }] : []),
    ...(token && canViewResponses
      ? [{ to: "/responses", label: "Respuestas" }]
      : []),
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-white border-b border-slate-200 shadow-sm">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          {/* LOGO */}
          <Link
            to="/forms"
            onClick={closeMenu}
            className="flex items-center gap-2 text-lg font-bold text-slate-800 hover:text-sky-600 transition-colors"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
            Formularios
          </Link>

          {/* NAVEGACIÓN DESKTOP */}
          <div className="hidden sm:flex items-center gap-6">
            {navLinks.map(({ to, label }) => (
              <Link key={to} to={to} className={DESKTOP_LINK_CLASS}>
                {label}
              </Link>
            ))}
          </div>

          {/* USUARIO DESKTOP */}
          <div className="hidden sm:flex items-center gap-3">
            {token ? (
              <>
                {username && <UserBadge username={username} />}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-sm font-medium text-rose-600 hover:text-rose-700 hover:underline transition-colors"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/register"
                  className="text-sm font-medium text-sky-600 hover:text-sky-700 transition-colors"
                >
                  Registrarse
                </Link>
                <Link
                  to="/login"
                  className="text-sm font-semibold text-sky-600 hover:text-sky-700 transition-colors"
                >
                  Iniciar sesión
                </Link>
              </>
            )}
          </div>

          {/* BOTÓN MOBILE */}
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="sm:hidden inline-flex items-center justify-center rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={isOpen}
          >
            <MenuIcon open={isOpen} />
          </button>
        </div>
      </div>

      {/* MENÚ MOBILE */}
      {isOpen && (
        <div className="sm:hidden border-t border-slate-100 bg-white">
          <div className="w-full max-w-7xl mx-auto px-4 py-3 space-y-1">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={closeMenu}
                className={MOBILE_LINK_CLASS}
              >
                {label}
              </Link>
            ))}

            {/* USUARIO MOBILE */}
            <div className="mt-3 border-t border-slate-100 pt-3">
              {token ? (
                <div className="flex items-center justify-between gap-3 px-3">
                  {username && <UserBadge username={username} />}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-sm font-semibold text-rose-600 hover:text-rose-700 transition-colors"
                  >
                    Cerrar sesión
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <Link
                    to="/register"
                    onClick={closeMenu}
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-sky-600 hover:bg-sky-50 hover:text-sky-700 transition-colors"
                  >
                    Registrarse
                  </Link>
                  <Link
                    to="/login"
                    onClick={closeMenu}
                    className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-sky-600 hover:bg-sky-50 hover:text-sky-700 transition-colors"
                  >
                    Iniciar sesión
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

function UserBadge({ username }) {
  return (
    <span className="inline-flex items-center rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
      {username}
    </span>
  );
}

function MenuIcon({ open }) {
  return (
    <svg
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {open ? (
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
  );
}