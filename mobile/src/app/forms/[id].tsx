import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { createResponse, fetchForm } from "../../api/forms";

type Choice = {
  id: number;
  text: string;
};

type FormField = {
  id: number;
  label: string;
  field_type:
    | "text"
    | "number"
    | "date"
    | "single_choice"
    | "multiple_choice";
  is_required: boolean;
  choices: Choice[];
};

type FormData = {
  id: number;
  title: string;
  description: string;
  fields: FormField[];
  is_active?: boolean;
  allow_multiple_responses?: boolean;
};

type AnswerValue = string | number | number[] | undefined;

type Answers = Record<number, AnswerValue>;

const DOCUMENT_TYPES = [
  { value: "CC", label: "Cédula de ciudadanía" },
  { value: "TI", label: "Tarjeta de identidad" },
  { value: "CE", label: "Cédula de extranjería" },
  { value: "PA", label: "Pasaporte" },
  { value: "RC", label: "Registro civil" },
];

export default function FormResponderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [form, setForm] = useState<FormData | null>(null);
  const [answers, setAnswers] = useState<Answers>({});

  const [respondentName, setRespondentName] = useState("");
  const [documentType, setDocumentType] = useState("CC");
  const [documentNumber, setDocumentNumber] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ==========================================================
     CARGAR FORMULARIO
  ========================================================== */

  useEffect(() => {
    let mounted = true;

    const loadForm = async () => {
      if (!id) {
        setError("No se especificó el formulario.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const data = await fetchForm(id);

        if (!mounted) return;

        if (!data) {
          setError("El formulario no existe.");
          return;
        }

        if (data.is_active === false) {
          setError("Este formulario no está activo.");
          return;
        }

        setForm(data);
      } catch (err: any) {
        if (!mounted) return;

        console.error("[FORM] Error cargando formulario:", {
          message: err?.message,
          status: err?.response?.status,
          data: err?.response?.data,
        });

        const status = err?.response?.status;

        if (status === 404) {
          setError("El formulario no existe o no está disponible.");
        } else if (status === 403) {
          setError("No tienes permiso para acceder a este formulario.");
        } else {
          setError(
            "No se pudo cargar el formulario. Verifica la conexión con el servidor."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadForm();

    return () => {
      mounted = false;
    };
  }, [id]);

  /* ==========================================================
     RESPUESTAS
  ========================================================== */

  const setAnswer = (fieldId: number, value: AnswerValue) => {
    setAnswers((previous) => ({
      ...previous,
      [fieldId]: value,
    }));
  };

  const toggleMultipleChoice = (
    fieldId: number,
    choiceId: number
  ) => {
    const current = Array.isArray(answers[fieldId])
      ? (answers[fieldId] as number[])
      : [];

    const updated = current.includes(choiceId)
      ? current.filter((id) => id !== choiceId)
      : [...current, choiceId];

    setAnswer(fieldId, updated);
  };

  /* ==========================================================
     VALIDACIONES
  ========================================================== */

  const validateDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return false;
    }

    const [year, month, day] = value.split("-").map(Number);

    return (
      date.getFullYear() === year &&
      date.getMonth() + 1 === month &&
      date.getDate() === day
    );
  };

  const validateForm = (): string | null => {
    if (!form) {
      return "El formulario no está disponible.";
    }

    if (!respondentName.trim()) {
      return "El nombre completo es obligatorio.";
    }

    if (!documentNumber.trim()) {
      return "El número de documento es obligatorio.";
    }

    for (const field of form.fields) {
      const value = answers[field.id];

      if (field.is_required) {
        if (field.field_type === "multiple_choice") {
          if (!Array.isArray(value) || value.length === 0) {
            return `El campo "${field.label}" es obligatorio.`;
          }
        } else if (
          value === undefined ||
          value === null ||
          String(value).trim() === ""
        ) {
          return `El campo "${field.label}" es obligatorio.`;
        }
      }

      if (
        field.field_type === "date" &&
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        if (!validateDate(String(value))) {
          return `La fecha del campo "${field.label}" debe tener el formato YYYY-MM-DD.`;
        }
      }

      if (
        field.field_type === "number" &&
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        if (!Number.isFinite(Number(value))) {
          return `El campo "${field.label}" debe contener un número válido.`;
        }
      }
    }

    return null;
  };

  /* ==========================================================
     CONSTRUIR RESPUESTAS
  ========================================================== */

  const buildAnswersPayload = () => {
    if (!form) return [];

    return form.fields
      .filter((field) => {
        const value = answers[field.id];

        if (field.field_type === "multiple_choice") {
          return Array.isArray(value) && value.length > 0;
        }

        return (
          value !== undefined &&
          value !== null &&
          String(value).trim() !== ""
        );
      })
      .map((field) => {
        const value = answers[field.id];

        switch (field.field_type) {
          case "text":
            return {
              field: field.id,
              text_value: String(value).trim(),
            };

          case "number":
            return {
              field: field.id,
              number_value: Number(value),
            };

          case "date":
            return {
              field: field.id,
              date_value: String(value),
            };

          case "single_choice":
            return {
              field: field.id,
              selected_choices: [Number(value)],
            };

          case "multiple_choice":
            return {
              field: field.id,
              selected_choices: (value as number[]).map(Number),
            };

          default:
            return {
              field: field.id,
            };
        }
      });
  };

  /* ==========================================================
     ENVIAR
  ========================================================== */

  const handleSubmit = async () => {
    if (submitting || !form) return;

    setError("");
    setSuccess("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      form: Number(form.id),
      respondent_name: respondentName.trim(),
      document_type: documentType,
      document_number: documentNumber.trim(),
      answers: buildAnswersPayload(),
    };

    try {
      setSubmitting(true);

      console.log("[FORM] Enviando respuesta:", payload);

      await createResponse(payload);

      setSuccess("La respuesta fue enviada correctamente.");

      setRespondentName("");
      setDocumentNumber("");
      setDocumentType("CC");
      setAnswers({});

      setTimeout(() => {
        router.replace("/forms");
      }, 1200);
    } catch (err: any) {
      console.error("[FORM] Error enviando respuesta:", {
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data,
      });

      const data = err?.response?.data;

      let message = "No se pudo enviar la respuesta.";

      if (typeof data?.detail === "string") {
        message = data.detail;
      } else if (Array.isArray(data?.form)) {
        message = data.form.join(" ");
      } else if (Array.isArray(data?.answers)) {
        message = data.answers.join(" ");
      } else if (typeof data?.answers === "string") {
        message = data.answers;
      } else if (typeof data?.form === "string") {
        message = data.form;
      }

      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <View className="flex-1 health-bg items-center justify-center">
        <ActivityIndicator size="large" color="#0284c7" />

        <Text className="health-text-secondary mt-3">
          Cargando formulario...
        </Text>
      </View>
    );
  }

  /* ==========================================================
     FORMULARIO NO DISPONIBLE
  ========================================================== */

  if (!form) {
    return (
      <View className="flex-1 health-bg items-center justify-center px-6">
        <View className="health-card w-full">
          <Text className="text-xl font-bold health-text mb-3">
            Formulario no disponible
          </Text>

          <Text className="health-error-text mb-5">
            {error || "No se pudo encontrar el formulario."}
          </Text>

          <TouchableOpacity
            onPress={() => router.replace("/forms")}
            activeOpacity={0.8}
            className="health-button-primary"
          >
            <Text className="text-white text-center font-semibold">
              Volver a formularios
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <ScrollView
      className="flex-1 health-bg"
      contentContainerStyle={{
        paddingTop: 32,
        paddingHorizontal: 16,
        paddingBottom: 40,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View className="health-card w-full">
        <Text className="text-2xl font-bold health-text mb-2">
          {form.title}
        </Text>

        {!!form.description && (
          <Text className="health-text-secondary mb-6">
            {form.description}
          </Text>
        )}

        {error ? (
          <View className="health-error-light health-error-border border rounded-xl p-3 mb-5">
            <Text className="health-error-text text-sm">
              {error}
            </Text>
          </View>
        ) : null}

        {success ? (
          <View className="health-success-light health-success-border border rounded-xl p-3 mb-5">
            <Text className="health-success-text text-sm">
              {success}
            </Text>
          </View>
        ) : null}

        {/* DATOS DEL RESPONDENTE */}

        <View className="health-surface-muted health-border border rounded-xl p-4 mb-6">
          <Text className="text-base font-semibold health-text mb-4">
            Datos de quien diligencia
          </Text>

          <Text className="health-text-secondary text-sm font-medium mb-1">
            Nombre completo *
          </Text>

          <TextInput
            value={respondentName}
            onChangeText={setRespondentName}
            editable={!submitting}
            placeholder="Ingrese su nombre completo"
            placeholderTextColor="#94a3b8"
            autoCapitalize="words"
            autoCorrect={false}
            className="health-input mb-4"
          />

          <Text className="health-text-secondary text-sm font-medium mb-2">
            Tipo de documento *
          </Text>

          <View className="flex-row flex-wrap gap-2 mb-4">
            {DOCUMENT_TYPES.map((document) => {
              const selected = documentType === document.value;

              return (
                <TouchableOpacity
                  key={document.value}
                  disabled={submitting}
                  onPress={() =>
                    setDocumentType(document.value)
                  }
                  activeOpacity={0.8}
                  className={`px-4 py-2 rounded-full border ${
                    selected
                      ? "health-primary health-border-primary"
                      : "health-surface health-border"
                  }`}
                >
                  <Text
                    className={
                      selected
                        ? "text-white text-xs font-semibold"
                        : "health-text-secondary text-xs"
                    }
                  >
                    {document.value}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text className="health-text-secondary text-sm font-medium mb-1">
            Número de documento *
          </Text>

          <TextInput
            value={documentNumber}
            onChangeText={setDocumentNumber}
            editable={!submitting}
            placeholder="Ingrese su número de documento"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            autoCorrect={false}
            className="health-input"
          />
        </View>

        {/* CAMPOS */}

        {form.fields.map((field, index) => (
          <View key={field.id} className="mb-6">
            <Text className="health-text-secondary text-sm font-medium mb-2">
              {index + 1}. {field.label}

              {field.is_required && (
                <Text className="health-error-text"> *</Text>
              )}
            </Text>

            {/* TEXTO */}

            {field.field_type === "text" && (
              <TextInput
                value={
                  typeof answers[field.id] === "string"
                    ? String(answers[field.id])
                    : ""
                }
                onChangeText={(value) =>
                  setAnswer(field.id, value)
                }
                editable={!submitting}
                placeholder="Escriba su respuesta"
                placeholderTextColor="#94a3b8"
                multiline
                textAlignVertical="top"
                className="health-input min-h-[48px]"
              />
            )}

            {/* NÚMERO */}

            {field.field_type === "number" && (
              <TextInput
                value={
                  answers[field.id] !== undefined
                    ? String(answers[field.id])
                    : ""
                }
                onChangeText={(value) => {
                  const sanitized = value.replace(
                    /[^0-9.-]/g,
                    ""
                  );

                  setAnswer(field.id, sanitized);
                }}
                editable={!submitting}
                keyboardType="decimal-pad"
                placeholder="Ingrese un número"
                placeholderTextColor="#94a3b8"
                className="health-input"
              />
            )}

            {/* FECHA */}

            {field.field_type === "date" && (
              <TextInput
                value={
                  typeof answers[field.id] === "string"
                    ? String(answers[field.id])
                    : ""
                }
                onChangeText={(value) =>
                  setAnswer(field.id, value)
                }
                editable={!submitting}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94a3b8"
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                className="health-input"
              />
            )}

            {/* SELECCIÓN ÚNICA */}

            {field.field_type === "single_choice" && (
              <View className="health-surface health-border border rounded-xl p-3">
                {field.choices.map((choice) => {
                  const selected =
                    answers[field.id] === choice.id;

                  return (
                    <TouchableOpacity
                      key={choice.id}
                      disabled={submitting}
                      onPress={() =>
                        setAnswer(field.id, choice.id)
                      }
                      activeOpacity={0.7}
                      className="flex-row items-center py-2"
                    >
                      <View
                        className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                          selected
                            ? "health-border-primary"
                            : "border-slate-400"
                        }`}
                      >
                        {selected && (
                          <View className="w-2.5 h-2.5 rounded-full health-primary" />
                        )}
                      </View>

                      <Text className="health-text-secondary flex-1">
                        {choice.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* SELECCIÓN MÚLTIPLE */}

            {field.field_type === "multiple_choice" && (
              <View className="health-surface health-border border rounded-xl p-3">
                {field.choices.map((choice) => {
                  const selected =
                    Array.isArray(answers[field.id]) &&
                    (answers[field.id] as number[]).includes(
                      choice.id
                    );

                  return (
                    <TouchableOpacity
                      key={choice.id}
                      disabled={submitting}
                      onPress={() =>
                        toggleMultipleChoice(
                          field.id,
                          choice.id
                        )
                      }
                      activeOpacity={0.7}
                      className="flex-row items-center py-2"
                    >
                      <View
                        className={`w-5 h-5 rounded border-2 mr-3 items-center justify-center ${
                          selected
                            ? "health-primary health-border-primary"
                            : "border-slate-400 bg-white"
                        }`}
                      >
                        {selected && (
                          <Text className="text-white text-xs font-bold">
                            ✓
                          </Text>
                        )}
                      </View>

                      <Text className="health-text-secondary flex-1">
                        {choice.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        ))}

        {/* ENVIAR */}

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
          className={
            submitting
              ? "health-button-disabled"
              : "health-button-success"
          }
        >
          {submitting ? (
            <View className="flex-row items-center justify-center">
              <ActivityIndicator
                size="small"
                color="#ffffff"
              />

              <Text className="text-white font-semibold ml-2">
                Enviando respuesta...
              </Text>
            </View>
          ) : (
            <Text className="text-white text-center font-semibold">
              Enviar respuesta
            </Text>
          )}
        </TouchableOpacity>

        <Text className="health-text-muted text-xs text-center mt-4">
          Los campos marcados con * son obligatorios.
        </Text>
      </View>
    </ScrollView>
  );
}