export function extractList<T>(data: unknown): T[] {
  // Django puede devolver directamente un array
  if (Array.isArray(data)) {
    return data as T[];
  }

  // Si Django REST Framework usa paginación:
  // { count, next, previous, results: [...] }
  if (
    data &&
    typeof data === "object" &&
    "results" in data &&
    Array.isArray((data as { results?: unknown }).results)
  ) {
    return (data as { results: T[] }).results;
  }

  return [];
}

// YYYY-MM-DD estricto
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateString(value: string): boolean {
  if (!DATE_REGEX.test(value)) {
    return false;
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}