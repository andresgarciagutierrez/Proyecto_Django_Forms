import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createForm, getForm, updateForm } from "../api/forms";
import Layout from "../components/Layout";

const FIELD_TYPES = [
  { value: "text", label: "Texto" },
  { value: "number", label: "Número" },
  { value: "date", label: "Fecha" },
  { value: "single_choice", label: "Opción única" },
  { value: "multiple_choice", label: "Opción múltiple" },
];

const CHOICE_TYPES = ["single_choice", "multiple_choice"];

const reindex = (list) => list.map((item, i) => ({ ...item, order: i + 1 }));

export default function FormBuilder() {
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [fields, setFields] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  // En modo edición, carga los datos actuales del formulario para prellenar.
  useEffect(() => {
    if (!isEditMode) return;

    getForm(id)
      .then((res) => {
        const data = res.data;
        setTitle(data.title);
        setDescription(data.description || "");
        setAllowMultiple(data.allow_multiple_responses);
        setFields(
          data.fields.map((f) => ({
            id: f.id, // se conserva para que el backend sepa qué actualizar
            label: f.label,
            field_type: f.field_type,
            is_required: f.is_required,
            order: f.order,
            choices: f.choices.map((c) => ({ id: c.id, text: c.text, order: c.order })),
          }))
        );
      })
      .catch(() => setError("No se pudo cargar el formulario para editar."))
      .finally(() => setLoading(false));
  }, [id, isEditMode]);

  const addField = () => {
    setFields([
      ...fields,
      { label: "", field_type: "text", is_required: true, order: fields.length + 1, choices: [] },
    ]);
  };

  const updateField = (index, key, value) => {
    const updated = [...fields];
    updated[index][key] = value;
    setFields(updated);
  };

  const addChoice = (fieldIndex) => {
    const updated = [...fields];
    updated[fieldIndex].choices.push({ text: "", order: updated[fieldIndex].choices.length + 1 });
    setFields(updated);
  };

  const updateChoice = (fieldIndex, choiceIndex, value) => {
    const updated = [...fields];
    updated[fieldIndex].choices[choiceIndex].text = value;
    setFields(updated);
  };

  const removeChoice = (fieldIndex, choiceIndex) => {
    const updated = [...fields];
    updated[fieldIndex].choices = reindex(
      updated[fieldIndex].choices.filter((_, i) => i !== choiceIndex)
    );
    setFields(updated);
  };

  const removeField = (index) => {
    setFields(reindex(fields.filter((_, i) => i !== index)));
  };

  const validate = () => {
    if (fields.length === 0) {
      return "Agrega al menos un campo al formulario.";
    }
    for (const field of fields) {
      if (!field.label.trim()) {
        return "Todos los campos deben tener una etiqueta.";
      }
      if (CHOICE_TYPES.includes(field.field_type)) {
        const validChoices = field.choices.filter((c) => c.text.trim());
        if (validChoices.length < 2) {
          return `El campo "${field.label}" necesita al menos 2 opciones con texto.`;
        }
      }
    }
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      title,
      description,
      allow_multiple_responses: allowMultiple,
      fields,
    };

    setSaving(true);
    try {
      if (isEditMode) {
        await updateForm(id, payload);
      } else {
        await createForm(payload);
      }
      navigate("/forms");
    } catch (err) {
      setError(
        err.response?.status === 403
          ? "No tienes permiso para modificar este formulario."
          : "Ocurrió un error al guardar el formulario."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[50vh] p-4">
          <p className="text-slate-500 text-sm font-medium">Cargando formulario...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-6 sm:py-10 px-3 sm:px-6">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-8">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mb-6">
            {isEditMode ? "Editar formulario" : "Crear formulario"}
          </h1>

          {error && (
            <p className="bg-rose-50 border border-rose-200 text-rose-700 text-sm p-3 rounded-lg mb-4">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Título
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 sm:py-2.5 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Descripción
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 sm:py-2.5 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                rows={3}
              />
            </div>

            <label className="flex items-start sm:items-center gap-3 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={allowMultiple}
                onChange={(e) => setAllowMultiple(e.target.checked)}
                className="mt-0.5 sm:mt-0 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span>Permitir múltiples respuestas por usuario</span>
            </label>

            <div className="border-t border-slate-200 pt-6">
              <div className="flex flex-row justify-between items-center gap-3 mb-4">
                <h2 className="text-lg font-semibold text-slate-800">Campos</h2>
                <button
                  type="button"
                  onClick={addField}
                  className="bg-sky-600 text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-sky-700 transition-colors shadow-sm"
                >
                  + Agregar campo
                </button>
              </div>

              {fields.map((field, i) => (
                <div
                  key={field.id ?? `new-${i}`}
                  className="border border-slate-200 rounded-xl p-3.5 sm:p-5 mb-4 bg-slate-50/50 space-y-3"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-700">
                      Campo {i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeField(i)}
                      className="text-rose-600 text-xs sm:text-sm font-medium hover:text-rose-700 hover:underline p-1"
                    >
                      Eliminar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Etiqueta
                      </label>
                      <input
                        placeholder="Etiqueta de la pregunta"
                        value={field.label}
                        onChange={(e) => updateField(i, "label", e.target.value)}
                        className="w-full border border-slate-300 bg-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Tipo
                      </label>
                      <select
                        value={field.field_type}
                        onChange={(e) => updateField(i, "field_type", e.target.value)}
                        className="w-full border border-slate-300 bg-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                      >
                        {FIELD_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={field.is_required}
                      onChange={(e) => updateField(i, "is_required", e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    Obligatorio
                  </label>

                  {CHOICE_TYPES.includes(field.field_type) && (
                    <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-2">
                      <p className="text-xs font-medium text-slate-600">
                        Opciones (mínimo 2):
                      </p>
                      {field.choices.map((choice, ci) => (
                        <div key={choice.id ?? `new-${ci}`} className="flex items-center gap-2">
                          <input
                            value={choice.text}
                            onChange={(e) => updateChoice(i, ci, e.target.value)}
                            placeholder={`Opción ${ci + 1}`}
                            className="flex-1 min-w-0 border border-slate-300 bg-white rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => removeChoice(i, ci)}
                            className="shrink-0 text-rose-600 text-xs font-medium hover:text-rose-700 hover:underline px-2 py-1"
                          >
                            Quitar
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addChoice(i)}
                        className="text-sky-600 text-xs sm:text-sm font-medium hover:underline inline-block pt-1"
                      >
                        + Agregar opción
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-teal-600 text-white font-semibold py-2.5 sm:py-3 rounded-lg hover:bg-teal-700 active:bg-teal-800 disabled:opacity-60 transition-colors shadow-sm text-sm sm:text-base mt-4"
            >
              {saving ? "Guardando..." : isEditMode ? "Guardar cambios" : "Guardar formulario"}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}