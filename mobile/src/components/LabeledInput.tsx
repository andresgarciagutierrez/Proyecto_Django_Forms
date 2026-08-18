import { Text, TextInput, TextInputProps } from "react-native";

type LabeledInputProps = TextInputProps & {
  label: string;
  inputClassName?: string;
};

export default function LabeledInput({
  label,
  inputClassName = "health-input mb-4",
  ...textInputProps
}: LabeledInputProps) {
  return (
    <>
      <Text className="health-text-secondary text-sm font-medium mb-1">
        {label}
      </Text>
      <TextInput
        placeholderTextColor="#94a3b8"
        className={inputClassName}
        {...textInputProps}
      />
    </>
  );
}