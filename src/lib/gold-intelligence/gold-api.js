import api from '@/utils/axios';

const BASE = '/gold';

export const goldApi = {
  intelligence(refresh, signal) {
    return api.get(`${BASE}/intelligence`, {
      params: refresh ? { refresh: '1' } : {},
      signal,
      timeout: 120000,
    });
  },
  ingest(signal) {
    return api.post(`${BASE}/ingest`, {}, { signal, timeout: 120000 });
  },
  history(signal) {
    return api.get(`${BASE}/history`, { signal });
  },
  settings(signal) {
    return api.get(`${BASE}/settings`, { signal });
  },
  saveSettings(body, signal) {
    return api.put(`${BASE}/settings`, body, { signal });
  },
  alerts(signal) {
    return api.get(`${BASE}/alerts`, { signal });
  },
  createAlert(body, signal) {
    return api.post(`${BASE}/alerts`, body, { signal });
  },
  research(body, signal) {
    return api.post(`${BASE}/research`, body, { signal, timeout: 180000 });
  },
};
