// src/app/responses.tsx

import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { fetchMyResponses } from "../api/forms";
import { extractList } from "../utils/api";

type Answer = {
  field?: number;
  field_label?: string;
  text_value?: string | null;
  number_value?: number | null;
  date_value?: string | null;
  selected_choices?: (string | number)[] | null;
};

type ResponseItem = {
  id: number;
  form: number;
  form_title?: string;
  respondent_name?: string;
  respondent?: string | null;
  document_type?: string;
  document_number?: string;
  submitted_at?: string;
  answers: Answer[];
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  CC: "Cédula de ciudadanía",
  TI: "Tarjeta de identidad",
  CE: "Cédula de extranjería",
  PA: "Pasaporte",
  RC: "Registro civil",
};

// number_value puede ser 0 (falsy en JS); se compara con
// null/undefined explícitamente para no mostrar "Sin respuesta"
// cuando el valor real es 0.
function getDisplayValue(answer: Answer): string | number | null {
  if (answer.text_value) return answer.text_value;
  if (answer.number_value !== null && answer.number_value !== undefined) {
    return answer.number_value;
  }
  if (answer.date_value) return answer.date_value;
  if (answer.selected_choices && answer.selected_choices.length > 0) {
    return answer.selected_choices.join(", ");
  }
  return null;
}

function formatDate(dateString?: string): string {
  if (!dateString) return "Fecha desconocida";
  try {
    return new Date(dateString).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return dateString;
  }
}

export default function ResponsesScreen() {
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    fetchMyResponses()
      .then((data) => {
        if (mounted) setResponses(extractList<ResponseItem>(data));
      })
      .catch(() => {
        if (mounted) {
          setError(
            "No tienes permiso para ver esta sección, o no hay respuestas disponibles."
          );
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#0284c7" />
        <Text className="mt-3 text-sm text-slate-500">
          Cargando respuestas...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <FlatList
        data={responses}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 24,
          paddingBottom: 40,
        }}
        ListHeaderComponent={
          <View className="mb-5">
            <Text className="text-xl font-bold text-slate-800">
              Respuestas recibidas
            </Text>
            <Text className="text-sm text-slate-500 mt-1">
              Historial detallado de las interacciones en tus formularios
            </Text>

            {error ? (
              <View className="mt-4 bg-rose-50 border border-rose-200 rounded-xl p-4">
                <Text className="text-sm text-rose-700">{error}</Text>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <View className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-sky-500 p-4 mb-4">
            <View className="pb-3 mb-3 border-b border-slate-100">
              <Text className="font-bold text-sky-600 text-base">
                {item.form_title || `Formulario #${item.form}`}
              </Text>
              <Text className="text-sm text-slate-700 font-medium mt-0.5">
                {item.respondent_name || "Sin nombre"}
              </Text>
              <Text className="text-xs text-slate-500 mt-0.5">
                {DOCUMENT_TYPE_LABELS[item.document_type || ""] ||
                  item.document_type}
                {item.document_number ? ` · ${item.document_number}` : ""}
              </Text>

              <View className="flex-row items-center flex-wrap gap-2 mt-2">
                {item.respondent ? (
                  <View className="bg-sky-50 border border-sky-100 rounded-md px-2.5 py-0.5">
                    <Text className="text-xs font-medium text-sky-700">
                      Cuenta: {item.respondent}
                    </Text>
                  </View>
                ) : null}
                <Text className="text-xs text-slate-500">
                  {formatDate(item.submitted_at)}
                </Text>
              </View>
            </View>

            <View>
              {item.answers.map((answer, index) => {
                const displayValue = getDisplayValue(answer);

                return (
                  <View
                    key={`${answer.field ?? "answer"}-${index}`}
                    className="bg-slate-50 border border-slate-100 rounded-lg p-3 mb-2"
                  >
                    <Text className="text-xs font-semibold text-slate-500 uppercase mb-0.5">
                      {answer.field_label || `Campo #${answer.field}`}
                    </Text>
                    <Text className="text-slate-800 font-medium text-sm">
                      {displayValue !== null ? (
                        String(displayValue)
                      ) : (
                        <Text className="text-slate-400 italic">
                          Sin respuesta
                        </Text>
                      )}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
        ListEmptyComponent={
          !error ? (
            <View className="bg-white rounded-xl border border-slate-100 p-8 items-center">
              <Text className="text-slate-600 font-medium text-base mb-1">
                Sin registros
              </Text>
              <Text className="text-slate-400 text-sm text-center">
                Aún no se han enviado respuestas para tus formularios.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}