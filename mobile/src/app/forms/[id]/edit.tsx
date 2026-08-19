import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { deleteForm, fetchForm, updateForm } from "../../../api/forms";
import { useAuth } from "../../../context/AuthContext";
import FormFieldsEditor, {
  FieldDraft,
  FieldType,
  buildFieldsPayload,
  createLocalKey,
  validateFields,
} from "../../../components/FormFieldsEditor";

export default function EditFormScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const { username, isStaff, isSuperuser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [allowMultipleResponses, setAllowMultipleResponses] = useState(false);
  const [fields, setFields] = useState<FieldDraft[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!id) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        // Solución: Usamos "any" para evitar el conflicto estricto con la interfaz Form de la API
        // y permitir que el mapeo dinámico maneje los campos correctamente.
        const data: any = await fetchForm(id);
        
        if (!mounted) return;

        const canManage =
          isStaff || isSuperuser || Boolean(username && data.created_by === username);

        if (!canManage) {
          setForbidden(true);
          return;
        }

        setTitle(data.title || "");
        setDescription(data.description || "");
        setAllowMultipleResponses(Boolean(data.allow_multiple_responses));
        
        // Soporta la estructura tanto si el backend devuelve "fields" o "questions"
        const rawFields = data.fields || data.questions || [];
        
        setFields(
          rawFields.map((field: any) => ({
            key: createLocalKey(),
            id: field.id !== undefined ? Number(field.id) : undefined,
            label: field.label,
            field_type: field.field_type || field.question_type || "text",
            is_required: Boolean(field.is_required ?? field.required),
            choices: (field.choices || field.options || []).map((choice: any) => ({
              key: createLocalKey(),
              id: choice.id !== undefined ? Number(choice.id) : undefined,
              text: choice.text || choice.label || choice.value || "",
            })),
          }))
        );
      } catch (err: any) {
        if (!mounted) return;

        console.warn("[FORMS] Error cargando formulario para editar:", err);

        if (err?.response?.status === 404) {
          setNotFound(true);
        } else if (err?.response?.status === 403) {
          setForbidden(true);
        } else {
          setError("No se pudo cargar el formulario.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [id, isStaff, isSuperuser, username]);

  const handleSubmit = async () => {
    if (submitting || !id) return;

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
      await updateForm(id, {
        title: title.trim(),
        description: description.trim(),
        allow_multiple_responses: allowMultipleResponses,
        fields: buildFieldsPayload(fields),
      });

      router.replace("/forms");
    } catch (err: any) {
      console.warn("[FORMS] Error actualizando formulario:", err);

      const data = err?.response?.data;
      setError(
        typeof data?.detail === "string"
          ? data.detail
          : "No se pudo actualizar el formulario. Verifica los datos e intenta de nuevo."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!id) return;

    Alert.alert(
      "Eliminar formulario",
      "Esta acción no se puede deshacer y también eliminará las respuestas asociadas. ¿Continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteForm(id);
              router.replace("/forms");
            } catch (err) {
              console.error("[FORMS] Error eliminando formulario:", err);
              setError("No se pudo eliminar el formulario.");
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

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

  if (notFound || forbidden) {
    return (
      <View className="flex-1 health-bg items-center justify-center px-6">
        <View className="health-card w-full">
          <Text className="text-xl font-bold health-text mb-3">
            {notFound ? "Formulario no disponible" : "Sin permiso"}
          </Text>
          <Text className="health-error-text mb-5">
            {notFound
              ? "El formulario no existe o no está disponible."
              : "No tienes permiso para editar este formulario."}
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
          Editar formulario
        </Text>
        <Text className="health-text-secondary mb-6">
          Actualiza el título, la descripción y los campos.
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
          editable={!submitting && !deleting}
          placeholderTextColor="#94a3b8"
          className="health-input mb-4"
        />

        <Text className="health-text-secondary text-sm font-medium mb-1">
          Descripción
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          editable={!submitting && !deleting}
          multiline
          textAlignVertical="top"
          placeholderTextColor="#94a3b8"
          className="health-input mb-4 min-h-[80px]"
        />

        <TouchableOpacity
          onPress={() => setAllowMultipleResponses((prev) => !prev)}
          disabled={submitting || deleting}
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

        <FormFieldsEditor
          fields={fields}
          onChange={setFields}
          disabled={submitting || deleting}
        />

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting || deleting}
          activeOpacity={0.8}
          className={
            submitting ? "health-button-disabled mt-6" : "health-button-success mt-6"
          }
        >
          {submitting ? (
            <View className="flex-row items-center justify-center">
              <ActivityIndicator size="small" color="#ffffff" />
              <Text className="text-white font-semibold ml-2">
                Guardando...
              </Text>
            </View>
          ) : (
            <Text className="text-white text-center font-semibold">
              Guardar cambios
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDelete}
          disabled={submitting || deleting}
          activeOpacity={0.8}
          className="mt-4 border border-rose-200 bg-rose-50 rounded-lg py-3"
        >
          {deleting ? (
            <View className="flex-row items-center justify-center">
              <ActivityIndicator size="small" color="#e11d48" />
              <Text className="text-rose-600 font-semibold ml-2">
                Eliminando...
              </Text>
            </View>
          ) : (
            <Text className="text-rose-600 text-center font-semibold">
              Eliminar formulario
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