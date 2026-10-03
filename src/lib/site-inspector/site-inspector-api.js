import api from '@/utils/axios';

const BASE = '/site-inspector';

export const siteInspectorApi = {
	analyze(url, signal) {
		return api.post(`${BASE}/analyze`, { url }, { signal, timeout: 150000 });
	},
	insights(body, signal) {
		return api.post(`${BASE}/insights`, body, { signal, timeout: 90000 });
	},
};
