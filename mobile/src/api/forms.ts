import api from "./client";
import { requireText, requireId } from "./validators";

export type EntityId = number | string;

export type QuestionType = "text" | "number" | "select" | "radio" | "checkbox";

export type QuestionOption = {
  id?: EntityId;
  label: string;
  value: string;
};

export type FormQuestion = {
  id?: EntityId;
  label: string;
  question_type: QuestionType;
  required?: boolean;
  options?: QuestionOption[];
};

export type Form = {
  id: number;
  title: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  questions?: FormQuestion[];
  is_active?: boolean;
};

export type FormAnswer = {
  question_id: EntityId;
  value: string | number | boolean | string[];
};

export type FormResponse = {
  id: number;
  form: number;
  user?: number;
  answers: FormAnswer[];
  created_at?: string;
};

export type CreateFormPayload = {
  title: string;
  description?: string;
  questions?: FormQuestion[];
  [key: string]: unknown;
};

export type CreateResponsePayload = {
  form: EntityId;
  answers: FormAnswer[];
  [key: string]: unknown;
};

// ------------------------------------------------------------------
// Peticiones HTTP - Formularios
// ------------------------------------------------------------------

export async function fetchForms(): Promise<Form[]> {
  const response = await api.get<Form[]>("forms/");
  return response.data;
}

export async function fetchForm(formId: EntityId): Promise<Form> {
  requireId(formId, "El ID del formulario es obligatorio.");
  const response = await api.get<Form>(`forms/${formId}/`);
  return response.data;
}

export async function createForm(payload: CreateFormPayload): Promise<Form> {
  if (!payload || typeof payload !== "object") {
    throw new Error("Los datos del formulario son obligatorios.");
  }
  requireText(payload.title, "El título del formulario es obligatorio.");

  const response = await api.post<Form>("forms/", payload);
  return response.data;
}

export async function updateForm(
  formId: EntityId,
  payload: Partial<CreateFormPayload>
): Promise<Form> {
  requireId(formId, "El ID del formulario es obligatorio.");
  if (!payload || Object.keys(payload).length === 0) {
    throw new Error("No hay datos para actualizar.");
  }

  const response = await api.patch<Form>(`forms/${formId}/`, payload);
  return response.data;
}

export async function deleteForm(formId: EntityId): Promise<void> {
  requireId(formId, "El ID del formulario es obligatorio.");
  // Ejecuta la petición DELETE conservando la barra inclinada final exigida por Django DRF
  await api.delete(`forms/${formId}/`);
}

// ------------------------------------------------------------------
// Peticiones HTTP - Respuestas
// ------------------------------------------------------------------

export async function fetchMyResponses(): Promise<FormResponse[]> {
  const response = await api.get<FormResponse[]>("responses/");
  return response.data;
}

export async function fetchResponse(
  responseId: EntityId
): Promise<FormResponse> {
  requireId(responseId, "El ID de la respuesta es obligatorio.");
  const response = await api.get<FormResponse>(`responses/${responseId}/`);
  return response.data;
}

export async function createResponse(
  payload: CreateResponsePayload
): Promise<FormResponse> {
  if (!payload || typeof payload !== "object") {
    throw new Error("Los datos de la respuesta son obligatorios.");
  }
  requireId(payload.form, "El formulario es obligatorio.");
  if (!Array.isArray(payload.answers)) {
    throw new Error("Las respuestas deben enviarse como una lista.");
  }

  const response = await api.post<FormResponse>("responses/", payload);
  return response.data;
}

export async function deleteResponse(responseId: EntityId): Promise<void> {
  requireId(responseId, "El ID de la respuesta es obligatorio.");
  await api.delete(`responses/${responseId}/`);
}