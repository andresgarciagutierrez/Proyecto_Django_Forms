import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getForm, submitResponse } from "../api/forms";
import Layout from "../components/Layout";

const DOCUMENT_TYPES = [
  { value: "CC", label: "Cédula de ciudadanía" },
  { value: "TI", label: "Tarjeta de identidad" },
  { value: "CE", label: "Cédula de extranjería" },
  { value: "PA", label: "Pasaporte" },
  { value: "RC", label: "Registro civil" },
];

// Convierte los errores de validación de DRF en un mensaje legible
const parseApiError = (err) => {
  const data = err.response?.data;
  if (!data) return "No se pudo enviar la respuesta. Intenta de nuevo.";
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

  return messages.length > 0
    ? messages.join(" ")
    : "No se pudo enviar la respuesta. Verifica los campos obligatorios.";
};

export default function FormResponder() {
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [respondentName, setRespondentName] = useState("");
  const [documentType, setDocumentType] = useState("CC");
  const [documentNumber, setDocumentNumber] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getForm(id)
      .then((res) => setForm(res.data))
      .catch(() => setError("No se pudo cargar el formulario."))
      .finally(() => setLoading(false));
  }, [id]);

  const setAnswer = (fieldId, value) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validación previa para selección múltiple requerida
    for (const field of form.fields) {
      if (field.is_required && field.field_type === "multiple_choice") {
        const selected = answers[field.id] || [];
        if (selected.length === 0) {
          setError(`Debes seleccionar al menos una opción para "${field.label}".`);
          return;
        }
      }
    }

    const payload = {
      form: Number(id),
      respondent_name: respondentName,
      document_type: documentType,
      document_number: documentNumber,
      answers: form.fields.map((field) => {
        const value = answers[field.id];
        const base = { field: field.id };
        if (field.field_type === "number") {
          return {
            ...base,
            number_value: value === undefined || value === "" ? null : Number(value),
          };
        }
        if (field.field_type === "date") return { ...base, date_value: value || null };
        if (field.field_type === "single_choice")
          return { ...base, selected_choices: value ? [value] : [] };
        if (field.field_type === "multiple_choice")
          return { ...base, selected_choices: value || [] };
        return { ...base, text_value: value || "" };
      }),
    };

    setSubmitting(true);
    try {
      await submitResponse(payload);
      navigate("/forms");
    } catch (err) {
      setError(parseApiError(err));
      console.error("Error al enviar respuesta:", err.response?.data || err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[50vh] p-4">
          <div className="flex items-center gap-3 text-slate-600">
            <svg
              className="animate-spin h-6 w-6 text-sky-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              ></path>
            </svg>
            <span className="text-sm font-medium">Cargando formulario...</span>
          </div>
        </div>
      </Layout>
    );
  }

  if (!form) {
    return (
      <Layout>
        <div className="py-10 px-4 max-w-xl mx-auto">
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center">
            <p className="text-rose-700 font-medium">
              {error || "Formulario no encontrado."}
            </p>
            <button
              onClick={() => navigate("/forms")}
              className="mt-4 text-sm font-semibold text-sky-600 hover:underline"
            >
              ← Volver a la lista
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-6 sm:py-10 px-3 sm:px-6">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-8">
          <div className="mb-6 border-b border-slate-100 pb-4">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 break-words">
              {form.title}
            </h1>
            {form.description && (
              <p className="text-slate-600 text-sm mt-2 whitespace-pre-line">
                {form.description}
              </p>
            )}
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm p-3.5 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-sky-50/60 border border-sky-100 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-800">
                Datos de quien diligencia
              </p>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre completo <span className="text-rose-500">*</span>
                </label>
                <input
                  value={respondentName}
                  onChange={(e) => setRespondentName(e.target.value)}
                  required
                  className="w-full border border-slate-300 bg-white rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tipo de documento <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full border border-slate-300 bg-white rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    {DOCUMENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Número de documento <span className="text-rose-500">*</span>
                  </label>
                  <input
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    required
                    className="w-full border border-slate-300 bg-white rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {form.fields.map((field) => (
              <div
                key={field.id}
                className="bg-slate-50/60 border border-slate-200/80 rounded-xl p-4 space-y-2.5"
              >
                <label className="block text-sm font-semibold text-slate-800 leading-snug">
                  {field.label}{" "}
                  {field.is_required && (
                    <span className="text-rose-500 font-bold" title="Campo obligatorio">
                      *
                    </span>
                  )}
                </label>

                {field.field_type === "text" && (
                  <input
                    type="text"
                    onChange={(e) => setAnswer(field.id, e.target.value)}
                    required={field.is_required}
                    className="w-full border border-slate-300 bg-white rounded-lg px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all"
                  />
                )}

                {field.field_type === "number" && (
                  <input
                    type="number"
                    onChange={(e) => setAnswer(field.id, e.target.value)}
                    required={field.is_required}
                    className="w-full border border-slate-300 bg-white rounded-lg px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all"
                  />
                )}

                {field.field_type === "date" && (
                  <input
                    type="date"
                    onChange={(e) => setAnswer(field.id, e.target.value)}
                    required={field.is_required}
                    className="w-full border border-slate-300 bg-white rounded-lg px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all"
                  />
                )}

                {field.field_type === "single_choice" && (
                  <div className="space-y-2 pt-1">
                    {field.choices.map((choice) => (
                      <label
                        key={choice.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                          answers[field.id] === choice.id
                            ? "bg-sky-50/80 border-sky-300 text-sky-900"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100/80"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`field-${field.id}`}
                          value={choice.id}
                          checked={answers[field.id] === choice.id}
                          onChange={(e) => setAnswer(field.id, Number(e.target.value))}
                          required={field.is_required}
                          className="h-4 w-4 text-sky-600 border-slate-300 focus:ring-sky-500 shrink-0"
                        />
                        <span className="text-sm font-medium break-words leading-tight">
                          {choice.text}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {field.field_type === "multiple_choice" && (
                  <div className="space-y-2 pt-1">
                    {field.choices.map((choice) => {
                      const isChecked = (answers[field.id] || []).includes(choice.id);
                      return (
                        <label
                          key={choice.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                            isChecked
                              ? "bg-sky-50/80 border-sky-300 text-sky-900"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100/80"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const current = answers[field.id] || [];
                              setAnswer(
                                field.id,
                                e.target.checked
                                  ? [...current, choice.id]
                                  : current.filter((c) => c !== choice.id)
                              );
                            }}
                            className="h-4 w-4 rounded text-sky-600 border-slate-300 focus:ring-sky-500 shrink-0"
                          />
                          <span className="text-sm font-medium break-words leading-tight">
                            {choice.text}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-teal-600 text-white font-semibold py-3 rounded-lg hover:bg-teal-700 active:bg-teal-800 disabled:opacity-60 transition-colors shadow-sm text-sm sm:text-base mt-6"
            >
              {submitting ? "Enviando..." : "Enviar respuesta"}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}