import api from "./client";


// ============================================================
// FORMS
// ============================================================

export async function fetchForms() {
  const response = await api.get("forms/");
  return response.data;
}


export async function fetchForm(formId) {
  if (formId == null || formId === "") {
    throw new Error("El ID del formulario es obligatorio.");
  }

  const response = await api.get(`forms/${formId}/`);

  return response.data;
}


export async function createForm(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Los datos del formulario son obligatorios.");
  }

  if (!payload.title?.trim()) {
    throw new Error("El título del formulario es obligatorio.");
  }

  const response = await api.post(
    "forms/",
    payload
  );

  return response.data;
}


export async function updateForm(formId, payload) {
  if (formId == null || formId === "") {
    throw new Error("El ID del formulario es obligatorio.");
  }

  if (!payload || Object.keys(payload).length === 0) {
    throw new Error("No hay datos para actualizar.");
  }

  const response = await api.patch(
    `forms/${formId}/`,
    payload
  );

  return response.data;
}


export async function deleteForm(formId) {
  if (formId == null || formId === "") {
    throw new Error("El ID del formulario es obligatorio.");
  }

  await api.delete(
    `forms/${formId}/`
  );
}


// ============================================================
// RESPONSES
// ============================================================

export async function fetchMyResponses() {
  const response = await api.get(
    "responses/"
  );

  return response.data;
}


export async function fetchResponse(responseId) {
  if (responseId == null || responseId === "") {
    throw new Error(
      "El ID de la respuesta es obligatorio."
    );
  }

  const response = await api.get(
    `responses/${responseId}/`
  );

  return response.data;
}


export async function createResponse(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error(
      "Los datos de la respuesta son obligatorios."
    );
  }

  if (
    payload.form == null ||
    payload.form === ""
  ) {
    throw new Error(
      "El formulario es obligatorio."
    );
  }

  if (
    !Array.isArray(payload.answers)
  ) {
    throw new Error(
      "Las respuestas deben enviarse como una lista."
    );
  }

  const response = await api.post(
    "responses/",
    payload
  );

  return response.data;
}


export async function deleteResponse(responseId) {
  if (responseId == null || responseId === "") {
    throw new Error(
      "El ID de la respuesta es obligatorio."
    );
  }

  await api.delete(
    `responses/${responseId}/`
  );
}