import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { createForm } from "../../api/forms";
import FormFieldsEditor, {
  FieldDraft,
  buildFieldsPayload,
  createEmptyField,
  validateFields,
} from "../../components/FormFieldsEditor";

export default function NewFormScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [allowMultipleResponses, setAllowMultipleResponses] = useState(false);
  const [fields, setFields] = useState<FieldDraft[]>([createEmptyField()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (submitting) return;

    if (!title.trim()) {
      setError("El título del formulario es obligatorio.");
      return;
    }

    const fieldsError = validateFields(fields);
    if (fieldsError) {
      setError(fieldsError);
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      await createForm({
        title: title.trim(),
        description: description.trim(),
        allow_multiple_responses: allowMultipleResponses,
        fields: buildFieldsPayload(fields),
      });

      router.replace("/forms");
    } catch (err: any) {
      console.warn("[FORMS] Error creando formulario:", err);

      const data = err?.response?.data;
      setError(
        typeof data?.detail === "string"
          ? data.detail
          : "No se pudo crear el formulario. Verifica los datos e intenta de nuevo."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 health-bg"
      contentContainerStyle={{
        paddingTop: 32,
        paddingHorizontal: 16,
        paddingBottom: 40,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View className="health-card w-full">
        <Text className="text-2xl font-bold health-text mb-2">
          Nuevo formulario
        </Text>
        <Text className="health-text-secondary mb-6">
          Define el título, la descripción y los campos que quieres
          recolectar.
        </Text>

        {error ? (
          <View className="health-error-light health-error-border border rounded-xl p-3 mb-4">
            <Text className="health-error-text text-sm">{error}</Text>
          </View>
        ) : null}

        <Text className="health-text-secondary text-sm font-medium mb-1">
          Título *
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          editable={!submitting}
          placeholder="Ej. Encuesta de satisfacción"
          placeholderTextColor="#94a3b8"
          className="health-input mb-4"
        />

        <Text className="health-text-secondary text-sm font-medium mb-1">
          Descripción
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          editable={!submitting}
          placeholder="Opcional"
          placeholderTextColor="#94a3b8"
          multiline
          textAlignVertical="top"
          className="health-input mb-4 min-h-[80px]"
        />

        <TouchableOpacity
          onPress={() => setAllowMultipleResponses((prev) => !prev)}
          disabled={submitting}
          className="flex-row items-center mb-6"
        >
          <View
            className={`w-5 h-5 rounded border-2 mr-2 items-center justify-center ${
              allowMultipleResponses
                ? "health-primary health-border-primary"
                : "border-slate-400"
            }`}
          >
            {allowMultipleResponses && (
              <Text className="text-white text-xs font-bold">✓</Text>
            )}
          </View>
          <Text className="health-text-secondary text-sm">
            Permitir varias respuestas por documento
          </Text>
        </TouchableOpacity>

        <Text className="text-base font-semibold health-text mb-3">
          Campos
        </Text>

        <FormFieldsEditor fields={fields} onChange={setFields} disabled={submitting} />

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
          className={
            submitting ? "health-button-disabled mt-6" : "health-button-success mt-6"
          }
        >
          {submitting ? (
            <View className="flex-row items-center justify-center">
              <ActivityIndicator size="small" color="#ffffff" />
              <Text className="text-white font-semibold ml-2">Creando...</Text>
            </View>
          ) : (
            <Text className="text-white text-center font-semibold">
              Crear formulario
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          className="mt-4"
        >
          <Text className="health-text-secondary text-sm text-center">
            Cancelar
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}