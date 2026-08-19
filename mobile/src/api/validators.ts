// Validadores compartidos con Type Assertions para TypeScript

/**
 * Garantiza que el valor sea un string no vacío ni compuesto solo por espacios.
 */
export function requireText(
  value: string | null | undefined,
  message: string
): asserts value is string {
  if (!value || !value.trim()) {
    throw new Error(message);
  }
}

/**
 * Garantiza que el valor no sea null ni undefined.
 * Permite valores legítimos como `0` o `false`.
 */
export function requirePresent<T>(
  value: T,
  message: string
): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}

/**
 * Garantiza que el ID (número o string) exista y no sea una cadena vacía o con solo espacios.
 */
export function requireId(
  id: number | string | null | undefined,
  message: string
): asserts id is number | string {
  if (
    id == null ||
    (typeof id === "string" && !id.trim()) ||
    (typeof id === "number" && isNaN(id))
  ) {
    throw new Error(message);
  }
}