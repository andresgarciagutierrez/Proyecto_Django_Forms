import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getForm, submitResponse } from "../api/forms";
import Layout from "../components/Layout";

const DOCUMENT_TYPES = [
  { value: "CC", label: "Cédula de ciudadanía" },
  { value: "TI", label: "Tarjeta de identidad" },
  { value: "CE", label: "Cédula de extranjería" },
  { value: "PA", label: "Pasaporte" },
  { value: "RC", label: "Registro civil" },
];

const NAME_REGEX = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]+$/;
const DOCUMENT_REGEX = /^\d{6,12}$/;
const NUMBER_REGEX = /^-?\d+(\.\d+)?$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseApiError(error) {
  const data = error.response?.data;
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

  return messages.length ? messages.join(" ") : "No se pudo enviar la respuesta.";
}

function isValidDate(value) {
  if (!DATE_REGEX.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

// Un campo "tiene valor" si el usuario efectivamente respondió algo.
// Se usa tanto para validar campos obligatorios como para decidir qué
// respuestas se mandan al backend (ver nota en handleSubmit).
function hasAnswerValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && String(value).trim() !== "";
}

export default function FormResponder() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [respondentName, setRespondentName] = useState("");
  const [documentType, setDocumentType] = useState("CC");
  const [documentNumber, setDocumentNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    getForm(id)
      .then(({ data }) => {
        if (mounted) setForm(data);
      })
      .catch(() => {
        if (mounted) setError("No se pudo cargar el formulario.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  const setAnswer = (fieldId, value) => {
    setAnswers((previous) => ({ ...previous, [fieldId]: value }));
  };

  const validateForm = () => {
    const name = respondentName.trim();
    const document = documentNumber.trim();

    if (!name) return "El nombre completo es obligatorio.";
    if (!NAME_REGEX.test(name)) {
      return "El nombre solo puede contener letras y espacios.";
    }
    if (!document) return "El número de documento es obligatorio.";
    if (!DOCUMENT_REGEX.test(document)) {
      return "El número de documento debe contener entre 6 y 12 números.";
    }

    for (const field of form.fields) {
      const value = answers[field.id];
      const hasValue = hasAnswerValue(value);

      if (field.is_required && !hasValue) {
        return `El campo "${field.label}" es obligatorio.`;
      }
      if (!hasValue) continue;

      if (field.field_type === "number" && !NUMBER_REGEX.test(String(value))) {
        return `El campo "${field.label}" debe contener un número válido.`;
      }
      if (field.field_type === "date" && !isValidDate(String(value))) {
        return `La fecha del campo "${field.label}" no es válida.`;
      }
      if (
        field.field_type === "single_choice" &&
        !Number.isInteger(Number(value))
      ) {
        return `La opción seleccionada en "${field.label}" no es válida.`;
      }
    }

    return null;
  };

  const buildAnswerPayload = (field) => {
    const value = answers[field.id];

    switch (field.field_type) {
      case "number":
        return { field: field.id, number_value: Number(value) };
      case "date":
        return { field: field.id, date_value: value };
      case "single_choice":
        return { field: field.id, selected_choices: [Number(value)] };
      case "multiple_choice":
        return { field: field.id, selected_choices: value };
      default:
        return { field: field.id, text_value: value };
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form || submitting) return;

    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      form: Number(id),
      respondent_name: respondentName.trim(),
      document_type: documentType,
      document_number: documentNumber.trim(),
      // Solo se envían respuestas para campos que el usuario realmente
      // contestó. El backend exige que TODA respuesta incluida traiga
      // un valor no vacío, sin importar si el campo es obligatorio u
      // opcional — mandar entradas vacías para campos opcionales sin
      // responder hacía fallar el envío completo.
      answers: form.fields
        .filter((field) => hasAnswerValue(answers[field.id]))
        .map(buildAnswerPayload),
    };

    try {
      setSubmitting(true);
      await submitResponse(payload);
      navigate("/forms");
    } catch (err) {
      console.error("Error enviando respuesta:", err.response?.data || err);
      setError(parseApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[50vh]">
          <span className="text-sm text-slate-600">Cargando formulario...</span>
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
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
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
            {/* DATOS DEL RESPONDENTE */}
            <div className="bg-sky-50/60 border border-sky-100 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-800">
                Datos de quien diligencia
              </p>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre completo *
                </label>
                <input
                  value={respondentName}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === "" || NAME_REGEX.test(value)) {
                      setRespondentName(value);
                    }
                  }}
                  required
                  disabled={submitting}
                  maxLength={100}
                  pattern="[A-Za-zÁÉÍÓÚáéíóúÑñÜü ]+"
                  title="El nombre solo puede contener letras y espacios."
                  className="w-full border border-slate-300 bg-white rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tipo de documento *
                  </label>
                  <select
                    value={documentType}
                    onChange={(event) => setDocumentType(event.target.value)}
                    disabled={submitting}
                    className="w-full border border-slate-300 bg-white rounded-lg px-3.5 py-2.5 text-sm"
                  >
                    {DOCUMENT_TYPES.map((document) => (
                      <option key={document.value} value={document.value}>
                        {document.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Número de documento *
                  </label>
                  <input
                    value={documentNumber}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (/^\d*$/.test(value)) setDocumentNumber(value);
                    }}
                    required
                    disabled={submitting}
                    inputMode="numeric"
                    maxLength={12}
                    pattern="\d{6,12}"
                    title="El documento debe contener entre 6 y 12 números."
                    className="w-full border border-slate-300 bg-white rounded-lg px-3.5 py-2.5 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* CAMPOS */}
            {form.fields.map((field) => (
              <div
                key={field.id}
                className="bg-slate-50/60 border border-slate-200/80 rounded-xl p-4 space-y-2.5"
              >
                <label className="block text-sm font-semibold text-slate-800">
                  {field.label}
                  {field.is_required && <span className="text-rose-500"> *</span>}
                </label>

                {field.field_type === "text" && (
                  <input
                    type="text"
                    value={answers[field.id] || ""}
                    onChange={(event) => setAnswer(field.id, event.target.value)}
                    required={field.is_required}
                    disabled={submitting}
                    className="w-full border border-slate-300 bg-white rounded-lg px-3.5 py-2.5 text-sm"
                  />
                )}

                {field.field_type === "number" && (
                  <input
                    type="text"
                    inputMode="decimal"
                    value={answers[field.id] || ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (
                        value === "" ||
                        NUMBER_REGEX.test(value) ||
                        value === "-" ||
                        /^-?\d+\.$/.test(value)
                      ) {
                        setAnswer(field.id, value);
                      }
                    }}
                    required={field.is_required}
                    disabled={submitting}
                    className="w-full border border-slate-300 bg-white rounded-lg px-3.5 py-2.5 text-sm"
                  />
                )}

                {field.field_type === "date" && (
                  <input
                    type="date"
                    value={answers[field.id] || ""}
                    onChange={(event) => setAnswer(field.id, event.target.value)}
                    required={field.is_required}
                    disabled={submitting}
                    className="w-full border border-slate-300 bg-white rounded-lg px-3.5 py-2.5 text-sm"
                  />
                )}

                {field.field_type === "single_choice" && (
                  <div className="space-y-2">
                    {field.choices.map((choice) => (
                      <label
                        key={choice.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-white cursor-pointer"
                      >
                        <input
                          type="radio"
                          name={`field-${field.id}`}
                          value={choice.id}
                          checked={answers[field.id] === choice.id}
                          onChange={() => setAnswer(field.id, choice.id)}
                          required={field.is_required}
                        />
                        <span className="text-sm">{choice.text}</span>
                      </label>
                    ))}
                  </div>
                )}

                {field.field_type === "multiple_choice" && (
                  <div className="space-y-2">
                    {field.choices.map((choice) => {
                      const selected = answers[field.id] || [];
                      const checked = selected.includes(choice.id);

                      return (
                        <label
                          key={choice.id}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-white cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              const current = answers[field.id] || [];
                              setAnswer(
                                field.id,
                                event.target.checked
                                  ? [...current, choice.id]
                                  : current.filter((item) => item !== choice.id)
                              );
                            }}
                          />
                          <span className="text-sm">{choice.text}</span>
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
              className="w-full bg-teal-600 text-white font-semibold py-3 rounded-lg hover:bg-teal-700 disabled:opacity-60"
            >
              {submitting ? "Enviando..." : "Enviar respuesta"}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}