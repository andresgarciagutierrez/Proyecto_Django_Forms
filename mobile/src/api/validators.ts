// Validadores compartidos por auth.ts y forms.ts.

export function requireText(
  value: string | null | undefined,
  message: string
): void {
  if (!value?.trim()) throw new Error(message);
}

export function requirePresent(value: unknown, message: string): void {
  if (!value) throw new Error(message);
}

export function requireId(
  id: number | string | null | undefined,
  message: string
): void {
  if (id == null || id === "") throw new Error(message);
}