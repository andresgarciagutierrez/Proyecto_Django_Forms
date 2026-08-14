import api from "./client";

export const getForms = () => api.get("forms/");
export const getForm = (id) => api.get(`forms/${id}/`);
export const createForm = (data) => api.post("forms/", data);
export const updateForm = (id, data) => api.put(`forms/${id}/`, data);
export const deleteForm = (id) => api.delete(`forms/${id}/`);
export const submitResponse = (data) => api.post("responses/", data);
export const getMyResponses = () => api.get("responses/");