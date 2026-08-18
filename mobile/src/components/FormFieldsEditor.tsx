import { Text, TextInput, TouchableOpacity, View } from "react-native";

export type FieldType =
  | "text"
  | "number"
  | "date"
  | "single_choice"
  | "multiple_choice";

export type ChoiceDraft = { key: string; id?: number; text: string };

export type FieldDraft = {
  key: string;
  id?: number;
  label: string;
  field_type: FieldType;
  is_required: boolean;
  choices: ChoiceDraft[];
};

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Texto" },
  { value: "number", label: "Número" },
  { value: "date", label: "Fecha" },
  { value: "single_choice", label: "Opción única" },
  { value: "multiple_choice", label: "Opción múltiple" },
];

const needsChoices = (type: FieldType) =>
  type === "single_choice" || type === "multiple_choice";

let localIdCounter = 0;
export function createLocalKey(): string {
  localIdCounter += 1;
  return `local-${Date.now()}-${localIdCounter}`;
}

export function createEmptyField(): FieldDraft {
  return {
    key: createLocalKey(),
    label: "",
    field_type: "text",
    is_required: false,
    choices: [],
  };
}

// Cada campo debe tener etiqueta; los de opción única/múltiple
// necesitan al menos 2 opciones con texto.
export function validateFields(fields: FieldDraft[]): string | null {
  for (const field of fields) {
    if (!field.label.trim()) {
      return "Todos los campos deben tener una etiqueta.";
    }

    if (needsChoices(field.field_type)) {
      const validChoices = field.choices.filter((c) => c.text.trim());
      if (validChoices.length < 2) {
        return `El campo "${field.label}" necesita al menos 2 opciones.`;
      }
    }
  }

  return null;
}

// Incluye "id" solo en campos/opciones existentes, para que el
// backend los actualice en vez de crear duplicados.
export function buildFieldsPayload(fields: FieldDraft[]) {
  return fields.map((field) => ({
    ...(field.id ? { id: field.id } : {}),
    label: field.label.trim(),
    field_type: field.field_type,
    is_required: field.is_required,
    choices: needsChoices(field.field_type)
      ? field.choices
          .filter((c) => c.text.trim())
          .map((c) =>
            c.id ? { id: c.id, text: c.text.trim() } : { text: c.text.trim() }
          )
      : [],
  }));
}

type Props = {
  fields: FieldDraft[];
  onChange: (fields: FieldDraft[]) => void;
  disabled?: boolean;
};

export default function FormFieldsEditor({ fields, onChange, disabled }: Props) {
  const updateField = (key: string, patch: Partial<FieldDraft>) => {
    onChange(fields.map((f) => (f.key === key ? { ...f, ...patch } : f)));
  };

  const removeField = (key: string) => {
    onChange(fields.filter((f) => f.key !== key));
  };

  const addChoice = (fieldKey: string) => {
    const field = fields.find((f) => f.key === fieldKey);
    if (!field) return;
    updateField(fieldKey, {
      choices: [...field.choices, { key: createLocalKey(), text: "" }],
    });
  };

  const updateChoice = (fieldKey: string, choiceKey: string, text: string) => {
    const field = fields.find((f) => f.key === fieldKey);
    if (!field) return;
    updateField(fieldKey, {
      choices: field.choices.map((c) =>
        c.key === choiceKey ? { ...c, text } : c
      ),
    });
  };

  const removeChoice = (fieldKey: string, choiceKey: string) => {
    const field = fields.find((f) => f.key === fieldKey);
    if (!field) return;
    updateField(fieldKey, {
      choices: field.choices.filter((c) => c.key !== choiceKey),
    });
  };

  return (
    <View>
      {fields.map((field, index) => (
        <View
          key={field.key}
          className="health-surface-muted health-border border rounded-xl p-4 mb-4"
        >
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-semibold health-text">
              Campo {index + 1}
            </Text>
            <TouchableOpacity
              onPress={() => removeField(field.key)}
              disabled={disabled}
            >
              <Text className="health-error-text text-xs font-semibold">
                Eliminar
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            value={field.label}
            onChangeText={(text) => updateField(field.key, { label: text })}
            editable={!disabled}
            placeholder="Etiqueta del campo"
            placeholderTextColor="#94a3b8"
            className="health-input mb-3"
          />

          <View className="flex-row flex-wrap gap-2 mb-3">
            {FIELD_TYPES.map((type) => {
              const selected = field.field_type === type.value;

              return (
                <TouchableOpacity
                  key={type.value}
                  disabled={disabled}
                  onPress={() =>
                    updateField(field.key, {
                      field_type: type.value,
                      choices: needsChoices(type.value) ? field.choices : [],
                    })
                  }
                  className={`px-3 py-1.5 rounded-full border ${
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
                    {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={() =>
              updateField(field.key, { is_required: !field.is_required })
            }
            disabled={disabled}
            className="flex-row items-center mb-3"
          >
            <View
              className={`w-5 h-5 rounded border-2 mr-2 items-center justify-center ${
                field.is_required
                  ? "health-primary health-border-primary"
                  : "border-slate-400"
              }`}
            >
              {field.is_required && (
                <Text className="text-white text-xs font-bold">✓</Text>
              )}
            </View>
            <Text className="health-text-secondary text-sm">
              Campo obligatorio
            </Text>
          </TouchableOpacity>

          {needsChoices(field.field_type) && (
            <View>
              <Text className="health-text-secondary text-sm font-medium mb-2">
                Opciones
              </Text>

              {field.choices.map((choice, choiceIndex) => (
                <View
                  key={choice.key}
                  className="flex-row items-center mb-2 gap-2"
                >
                  <TextInput
                    value={choice.text}
                    onChangeText={(text) =>
                      updateChoice(field.key, choice.key, text)
                    }
                    editable={!disabled}
                    placeholder={`Opción ${choiceIndex + 1}`}
                    placeholderTextColor="#94a3b8"
                    className="health-input flex-1"
                  />
                  <TouchableOpacity
                    onPress={() => removeChoice(field.key, choice.key)}
                    disabled={disabled}
                  >
                    <Text className="health-error-text text-xs font-semibold">
                      Quitar
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                onPress={() => addChoice(field.key)}
                disabled={disabled}
                className="mt-1"
              >
                <Text className="text-sky-600 text-sm font-semibold">
                  + Agregar opción
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}

      <TouchableOpacity
        onPress={() => onChange([...fields, createEmptyField()])}
        disabled={disabled}
        className="health-surface health-border border rounded-xl p-3 items-center"
      >
        <Text className="text-sky-600 text-sm font-semibold">
          + Agregar campo
        </Text>
      </TouchableOpacity>
    </View>
  );
}