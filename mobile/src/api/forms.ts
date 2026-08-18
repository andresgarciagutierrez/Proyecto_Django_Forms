import api from "./client";
import { requireText, requireId } from "./validators";

// Acepta number (form.id) o string (params de Expo Router).
type EntityId = number | string;

export async function fetchForms() {
  const response = await api.get("forms/");
  return response.data;
}

export async function fetchForm(formId: EntityId) {
  requireId(formId, "El ID del formulario es obligatorio.");
  const response = await api.get(`forms/${formId}/`);
  return response.data;
}

export async function createForm(payload: Record<string, any>) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Los datos del formulario son obligatorios.");
  }
  requireText(payload.title, "El título del formulario es obligatorio.");
  const response = await api.post("forms/", payload);
  return response.data;
}

// PATCH: solo envía los campos que cambiaron.
export async function updateForm(
  formId: EntityId,
  payload: Record<string, any>
) {
  requireId(formId, "El ID del formulario es obligatorio.");
  if (!payload || Object.keys(payload).length === 0) {
    throw new Error("No hay datos para actualizar.");
  }
  const response = await api.patch(`forms/${formId}/`, payload);
  return response.data;
}

export async function deleteForm(formId: EntityId) {
  requireId(formId, "El ID del formulario es obligatorio.");
  await api.delete(`forms/${formId}/`);
}

export async function fetchMyResponses() {
  const response = await api.get("responses/");
  return response.data;
}

export async function fetchResponse(responseId: EntityId) {
  requireId(responseId, "El ID de la respuesta es obligatorio.");
  const response = await api.get(`responses/${responseId}/`);
  return response.data;
}

type ResponsePayload = {
  form: EntityId;
  answers: unknown[];
  [key: string]: unknown;
};

export async function createResponse(payload: ResponsePayload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Los datos de la respuesta son obligatorios.");
  }
  requireId(payload.form, "El formulario es obligatorio.");
  if (!Array.isArray(payload.answers)) {
    throw new Error("Las respuestas deben enviarse como una lista.");
  }
  const response = await api.post("responses/", payload);
  return response.data;
}

export async function deleteResponse(responseId: EntityId) {
  requireId(responseId, "El ID de la respuesta es obligatorio.");
  await api.delete(`responses/${responseId}/`);
}