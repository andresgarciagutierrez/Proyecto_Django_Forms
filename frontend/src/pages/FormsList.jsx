import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { deleteForm, getForms } from "../api/forms";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";

const extractList = (data) => {
  if (Array.isArray(data)) {
    return data;
  }

  return data?.results ?? [];
};

export default function FormsList() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const {
    token,
    username,
    role,
    canManageForms,
  } = useAuth();

  const navigate = useNavigate();

  // =========================================================
  // PERMISOS
  // =========================================================

  const isStaff =
    Boolean(role?.is_staff) ||
    Boolean(role?.is_superuser);

  /**
   * Determina si el usuario puede administrar ESTE formulario.
   *
   * Reglas:
   *
   * - Sin sesión -> no puede administrar.
   * - Superuser -> puede administrar cualquiera.
   * - Staff -> puede administrar cualquiera.
   * - Propietario -> puede administrar su propio formulario.
   */
  const canManageThisForm = (form) => {
    // Nunca permitir acciones administrativas
    // si no hay sesión.
    if (!token) {
      return false;
    }

    // Staff / superuser pueden administrar cualquiera.
    if (isStaff) {
      return true;
    }

    // Usuario normal solamente su propio formulario.
    if (
      username &&
      form?.created_by &&
      form.created_by === username
    ) {
      return true;
    }

    return false;
  };

  // =========================================================
  // CARGAR FORMULARIOS
  // =========================================================

  const loadForms = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getForms();

      setForms(extractList(response.data));
    } catch (err) {
      console.error("Error cargando formularios:", err);

      setError(
        "No se pudieron cargar los formularios."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForms();
  }, []);

  // =========================================================
  // ELIMINAR
  // =========================================================

  const handleDelete = async (form) => {
    // Protección adicional en frontend.
    if (!canManageThisForm(form)) {
      setError(
        "No tienes permisos para eliminar este formulario."
      );

      return;
    }

    const confirmed = window.confirm(
      `¿Eliminar "${form.title}"?\n\n` +
      "Esta acción no se puede deshacer y también eliminará " +
      "las respuestas asociadas."
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(form.id);
    setError("");

    try {
      await deleteForm(form.id);

      setForms((previousForms) =>
        previousForms.filter(
          (currentForm) =>
            currentForm.id !== form.id
        )
      );
    } catch (err) {
      console.error(
        "Error eliminando formulario:",
        err
      );

      setError(
        "No se pudo eliminar el formulario. " +
        "Verifica que tengas permisos suficientes."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <Layout>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        <div className="max-w-7xl mx-auto space-y-6">

          {/* =====================================================
              ENCABEZADO
          ====================================================== */}

          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

              <div className="min-w-0">

                <div className="flex flex-wrap items-center gap-2">

                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />

                  <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
                    Formularios Disponibles
                  </h1>

                  {!loading && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-100">
                      {forms.length}{" "}
                      {forms.length === 1
                        ? "formulario"
                        : "formularios"}
                    </span>
                  )}

                </div>

                <p className="mt-2 text-sm text-slate-500">
                  Gestión e ingesta de datos para la
                  recolección en campo.
                </p>

              </div>


              {/* =================================================
                  NUEVO FORMULARIO

                  SOLAMENTE usuarios autenticados con formCreate.
              ================================================== */}

              {token && canManageForms && (
                <Link
                  to="/forms/new"
                  className="
                    inline-flex
                    items-center
                    justify-center
                    gap-2
                    w-full
                    sm:w-auto
                    bg-sky-600
                    hover:bg-sky-700
                    text-white
                    font-semibold
                    text-sm
                    px-5
                    py-2.5
                    rounded-xl
                    shadow-sm
                    hover:shadow-md
                    transition-all
                    active:scale-[0.98]
                  "
                >

                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>

                  Nuevo formulario

                </Link>
              )}

            </div>

          </section>


          {/* =====================================================
              ERROR
          ====================================================== */}

          {error && (
            <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm p-4 rounded-xl">

              <svg
                className="w-5 h-5 shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>

              <span>{error}</span>

            </div>
          )}


          {/* =====================================================
              LOADING
          ====================================================== */}

          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="
                    bg-white
                    p-5
                    rounded-2xl
                    border
                    border-slate-200
                    shadow-sm
                    animate-pulse
                  "
                >

                  <div className="h-5 bg-slate-200 rounded w-1/2 mb-4" />

                  <div className="h-4 bg-slate-100 rounded w-3/4 mb-6" />

                  <div className="h-px bg-slate-100 mb-4" />

                  <div className="h-4 bg-slate-100 rounded w-1/3" />

                </div>
              ))}

            </div>
          )}


          {/* =====================================================
              SIN FORMULARIOS
          ====================================================== */}

          {!loading &&
            !error &&
            forms.length === 0 && (

              <div className="
                bg-white
                p-8
                sm:p-12
                rounded-2xl
                border
                border-slate-200
                shadow-sm
                text-center
              ">

                <div className="
                  w-12
                  h-12
                  bg-sky-50
                  text-sky-600
                  rounded-2xl
                  flex
                  items-center
                  justify-center
                  mx-auto
                  mb-4
                ">

                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>

                </div>

                <p className="text-slate-800 font-bold text-lg">
                  No hay formularios creados
                </p>

                <p className="text-slate-500 text-sm mt-2 max-w-sm mx-auto">
                  Aún no se ha registrado ningún formulario
                  en el sistema.
                </p>


                {/* Solamente usuarios con permiso */}
                {token && canManageForms && (
                  <Link
                    to="/forms/new"
                    className="
                      inline-flex
                      items-center
                      gap-1.5
                      mt-4
                      text-sm
                      font-semibold
                      text-sky-600
                      hover:text-sky-700
                      hover:underline
                    "
                  >
                    Crear mi primer formulario →
                  </Link>
                )}

              </div>
            )}


          {/* =====================================================
              LISTA
          ====================================================== */}

          {!loading &&
            !error &&
            forms.length > 0 && (

              <div className="
                grid
                grid-cols-1
                md:grid-cols-2
                gap-4
              ">

                {forms.map((form) => {

                  const canManage =
                    canManageThisForm(form);

                  return (

                    <article
                      key={form.id}
                      className="
                        group
                        relative
                        flex
                        flex-col
                        justify-between
                        bg-white
                        p-5
                        rounded-2xl
                        border
                        border-slate-200
                        shadow-sm
                        hover:shadow-md
                        hover:border-sky-300
                        transition-all
                        duration-200
                        border-l-4
                        border-l-sky-500
                      "
                    >

                      {/* =================================================
                          INFORMACIÓN
                      ================================================== */}

                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/forms/${form.id}`
                          )
                        }
                        className="
                          text-left
                          w-full
                          focus:outline-none
                          focus-visible:ring-2
                          focus-visible:ring-sky-500
                          rounded-lg
                        "
                      >

                        <div className="flex items-start gap-3">

                          <div className="
                            w-9
                            h-9
                            rounded-lg
                            bg-sky-50
                            text-sky-600
                            flex
                            items-center
                            justify-center
                            shrink-0
                            group-hover:bg-sky-600
                            group-hover:text-white
                            transition-colors
                          ">

                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>

                          </div>


                          <div className="min-w-0 flex-1">

                            <h2 className="
                              font-bold
                              text-slate-800
                              text-base
                              group-hover:text-sky-600
                              transition-colors
                              break-words
                            ">
                              {form.title}
                            </h2>

                            <p className="
                              text-sm
                              text-slate-500
                              mt-1
                              line-clamp-2
                              leading-relaxed
                            ">
                              {form.description ||
                                "Sin descripción proporcionada."}
                            </p>

                          </div>

                        </div>

                      </button>


                      {/* =================================================
                          ACCIONES
                      ================================================== */}

                      <div className="
                        mt-5
                        pt-4
                        border-t
                        border-slate-100
                        flex
                        flex-wrap
                        items-center
                        justify-between
                        gap-3
                      ">

                        <span className="
                          text-xs
                          font-medium
                          text-slate-400
                        ">
                          Activo
                        </span>


                        <div className="
                          flex
                          flex-wrap
                          items-center
                          gap-3
                        ">

                          {/* =============================================
                              EDITAR / ELIMINAR

                              Solo:
                              - propietario
                              - staff
                              - superuser
                          ============================================== */}

                          {canManage && (
                            <>
                              <Link
                                to={`/forms/${form.id}/edit`}
                                className="
                                  text-xs
                                  sm:text-sm
                                  font-semibold
                                  text-slate-500
                                  hover:text-sky-600
                                  hover:underline
                                "
                              >
                                Editar
                              </Link>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDelete(form)
                                }
                                disabled={
                                  deletingId === form.id
                                }
                                className="
                                  text-xs
                                  sm:text-sm
                                  font-semibold
                                  text-rose-500
                                  hover:text-rose-600
                                  hover:underline
                                  disabled:opacity-50
                                  disabled:cursor-not-allowed
                                "
                              >
                                {deletingId === form.id
                                  ? "Eliminando..."
                                  : "Eliminar"}
                              </button>
                            </>
                          )}


                          {/* =============================================
                              DILIGENCIAR

                              Disponible para todos.
                          ============================================== */}

                          <Link
                            to={`/forms/${form.id}`}
                            className="
                              inline-flex
                              items-center
                              gap-1
                              text-xs
                              sm:text-sm
                              font-semibold
                              text-sky-600
                              hover:text-sky-700
                              hover:underline
                            "
                          >
                            Diligenciar

                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M14 5l7 7m0 0l-7 7m7-7H3"
                              />
                            </svg>

                          </Link>

                        </div>

                      </div>

                    </article>

                  );
                })}

              </div>
            )}

        </div>

      </div>

    </Layout>
  );
}