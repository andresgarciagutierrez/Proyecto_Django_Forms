import { useEffect, useState } from "react";
import { getMyResponses } from "../api/forms";
import Layout from "../components/Layout";

const extractList = (data) => (Array.isArray(data) ? data : data?.results ?? []);

const DOCUMENT_TYPE_LABELS = {
  CC: "Cédula de ciudadanía",
  TI: "Tarjeta de identidad",
  CE: "Cédula de extranjería",
  PA: "Pasaporte",
  RC: "Registro civil",
};

// answer.number_value puede ser 0, que es un valor válido pero "falsy"
// en JS. Encadenar con "||" (como antes) hacía que un 0 se saltara a
// null y se mostrara "Sin respuesta" pese a que sí había una respuesta.
function getDisplayValue(answer) {
  if (answer.text_value) return answer.text_value;
  if (answer.number_value !== null && answer.number_value !== undefined) {
    return answer.number_value;
  }
  if (answer.date_value) return answer.date_value;
  if (answer.selected_choices?.length > 0) {
    return answer.selected_choices.join(", ");
  }
  return null;
}

export default function ResponsesView() {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyResponses()
      .then((res) => setResponses(extractList(res.data)))
      .catch(() =>
        setError("No tienes permiso para ver esta sección, o no hay respuestas disponibles.")
      )
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "Fecha desconocida";
    try {
      return new Date(dateString).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Layout>
      <div className="py-6 sm:py-10 px-3 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
              Respuestas recibidas
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Historial detallado de las interacciones en tus formularios
            </p>
          </div>

          {loading && (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl p-5 border border-slate-100 shadow-xs animate-pulse space-y-3"
                >
                  <div className="h-5 bg-slate-200 rounded w-1/2"></div>
                  <div className="h-4 bg-slate-100 rounded w-full"></div>
                  <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm p-4 rounded-xl mb-4">
              {error}
            </div>
          )}

          {!loading && responses.length === 0 && !error && (
            <div className="bg-white p-8 rounded-xl border border-slate-100 shadow-xs text-center">
              <p className="text-slate-600 font-medium text-base mb-1">Sin registros</p>
              <p className="text-slate-400 text-sm">
                Aún no se han enviado respuestas para tus formularios.
              </p>
            </div>
          )}

          {!loading && responses.length > 0 && (
            <div className="space-y-4">
              {responses.map((response) => (
                <div
                  key={response.id}
                  className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-4 sm:p-6 transition-all border-l-4 border-l-sky-500"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4 pb-3 mb-4 border-b border-slate-100">
                    <div>
                      <span className="font-bold text-sky-600 text-base sm:text-lg block">
                        {response.form_title || `Formulario #${response.form}`}
                      </span>
                      <span className="text-sm text-slate-700 font-medium">
                        {response.respondent_name || "Sin nombre"}
                      </span>
                      <span className="text-xs text-slate-500 ml-2">
                        {DOCUMENT_TYPE_LABELS[response.document_type] || response.document_type}
                        {response.document_number ? ` · ${response.document_number}` : ""}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 flex-wrap">
                      {response.respondent && (
                        <span className="font-medium text-sky-700 bg-sky-50 border border-sky-100 px-2.5 py-0.5 rounded-md">
                          Cuenta: {response.respondent}
                        </span>
                      )}
                      <span>{formatDate(response.submitted_at)}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {response.answers.map((answer, i) => {
                      const displayValue = getDisplayValue(answer);

                      return (
                        <div
                          key={`${answer.field ?? "answer"}-${i}`}
                          className="bg-slate-50/70 border border-slate-100 rounded-lg p-3 text-sm"
                        >
                          <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">
                            {answer.field_label || `Campo #${answer.field}`}
                          </span>
                          <p className="text-slate-800 font-medium break-words">
                            {displayValue !== null ? (
                              displayValue
                            ) : (
                              <span className="text-slate-400 italic">Sin respuesta</span>
                            )}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}