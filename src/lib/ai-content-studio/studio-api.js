import api from '@/utils/axios';

const BASE = '/ai-content-studio';

export const studioApi = {
  listProviders(type, signal) {
    return api.get(`${BASE}/providers`, { params: type ? { type } : {}, signal });
  },
  providerHelp(id, signal) {
    return api.get(`${BASE}/providers/${id}/help`, { signal });
  },
  providerModels(id, signal) {
    return api.get(`${BASE}/providers/${id}/models`, { signal });
  },
  validateProvider(id, signal) {
    return api.post(`${BASE}/providers/${id}/validate`, {}, { signal });
  },
  getConfig(signal) {
    return api.get(`${BASE}/config`, { signal });
  },
  saveConfig(config, signal) {
    return api.put(`${BASE}/config`, { config }, { signal });
  },
  inspectSecrets(force, signal) {
    return api.get(`${BASE}/secrets/inspect`, { params: force ? { force: '1' } : {}, signal, timeout: 45000 });
  },
  getSecrets(signal) {
    return api.get(`${BASE}/secrets`, { signal });
  },
  upsertSecrets(secrets, signal) {
    return api.put(`${BASE}/secrets`, { secrets }, { signal });
  },
  testModule(module, body, signal) {
    return api.post(`${BASE}/test/${module}`, body || {}, { signal, timeout: 180000 });
  },
  run(body, signal) {
    return api.post(`${BASE}/run`, body || {}, { signal, timeout: 300000 });
  },
  retry(executionId, module, signal) {
    return api.post(`${BASE}/retry/${executionId}/${module}`, {}, { signal, timeout: 300000 });
  },
  publish(body, signal) {
    return api.post(`${BASE}/publish`, body, { signal, timeout: 180000 });
  },
  history(limit = 30, signal) {
    return api.get(`${BASE}/history`, { params: { limit }, signal });
  },
  historyOne(id, signal) {
    return api.get(`${BASE}/history/${id}`, { signal });
  },
  defaults(signal) {
    return api.get(`${BASE}/defaults`, { signal });
  },
  facebookTestPublish(message, signal) {
    return api.post(`${BASE}/facebook/test-publish`, { message }, { signal, timeout: 180000 });
  },
  trending(signal) {
    return api.post(`${BASE}/trending`, {}, { signal, timeout: 90000 });
  },
};
