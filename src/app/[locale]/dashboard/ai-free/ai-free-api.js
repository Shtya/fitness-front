import api from '@/utils/axios';

export const aiFreeApi = {
	listProviders(signal) {
		return api.get('/ai-free/providers', { signal }).then(response => response.data);
	},
	knowledge(signal) {
		return api.get('/ai-free/knowledge', { signal }).then(response => response.data);
	},
	chat(payload, signal) {
		return api
			.post('/ai-free/chat', payload, { signal, timeout: 160000 })
			.then(response => response.data);
	},
	title(payload, signal) {
		return api
			.post('/ai-free/title', payload, { signal, timeout: 60000 })
			.then(response => response.data);
	},
};
