import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Traduce el shape de errores de DRF ({ campo: ["mensaje", ...] } o
// { detail: "..." }) a un solo string legible para mostrar en el form.
function parseApiError(error) {
  const data = error.response?.data;

  if (!data) return "No se pudo completar el registro. Intenta de nuevo.";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;

  const messages = [];
  const collect = (value) => {
    if (Array.isArray(value)) {
      value.forEach(collect);
    } else if (typeof value === "object" && value !== null) {
      Object.values(value).forEach(collect);
    } else if (value) {
      messages.push(String(value));
    }
  };
  collect(data);

  return messages.length ? messages.join(" ") : "No se pudo completar el registro.";
}

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password1 !== password2) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await register({
        username,
        email,
        telephone,
        date_of_birth: dateOfBirth || null,
        password1,
        password2,
      });

      // Si el backend no devolvió token por algún motivo, igual mandamos
      // al usuario a loguearse en vez de dejarlo varado en el form.
      navigate(data?.token ? "/forms" : "/login");
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm sm:max-w-md bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/80">
        <div className="text-center sm:text-left mb-6">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3 mx-auto sm:mx-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Crear cuenta
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Regístrate para diligenciar y gestionar formularios
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm p-3 rounded-xl mb-5 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Usuario
            </label>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 sm:py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 sm:py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 sm:py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Fecha de nacimiento
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 sm:py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={password1}
              onChange={(e) => setPassword1(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 sm:py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Confirmar contraseña
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 sm:py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-sky-600 text-white font-semibold py-3 sm:py-2.5 rounded-lg hover:bg-sky-700 active:bg-sky-800 disabled:opacity-60 transition-colors shadow-sm text-sm sm:text-base mt-2"
          >
            {submitting ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-5">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="text-sky-600 font-semibold hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}