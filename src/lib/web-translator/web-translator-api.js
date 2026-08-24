import api from '@/utils/axios';

const BASE = '/web-translator';

export const webTranslatorApi = {
	me(signal) {
		return api.get(`${BASE}/me`, { signal });
	},
	lookup(body, signal) {
		return api.post(`${BASE}/lookup`, body, { signal });
	},
	words(params, signal) {
		return api.get(`${BASE}/words`, { params, signal });
	},
	word(id, signal) {
		return api.get(`${BASE}/words/${id}`, { signal });
	},
	saveWord(body, signal) {
		return api.post(`${BASE}/words`, body, { signal });
	},
	deleteWord(id, signal) {
		return api.delete(`${BASE}/words/${id}`, { signal });
	},
	recent(limit = 20, signal) {
		return api.get(`${BASE}/recent`, { params: { limit }, signal });
	},
	settings(signal) {
		return api.get(`${BASE}/settings`, { signal });
	},
	saveSettings(body, signal) {
		return api.put(`${BASE}/settings`, body, { signal });
	},
	createPairing(signal) {
		return api.post(`${BASE}/auth/pairing`, {}, { signal });
	},
};
