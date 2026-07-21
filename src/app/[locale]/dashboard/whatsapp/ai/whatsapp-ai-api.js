import api from '@/utils/axios';

export const whatsappAiApi = {
	getSettings(accountId, signal) {
		return api
			.get(`/whatsapp/accounts/${accountId}/ai/settings`, { signal })
			.then(response => response.data);
	},
	updateSettings(accountId, payload) {
		return api
			.put(`/whatsapp/accounts/${accountId}/ai/settings`, payload)
			.then(response => response.data);
	},
	generateSuggestions(conversationId, payload = {}, signal) {
		return api
			.post(
				`/whatsapp/conversations/${conversationId}/ai-suggestions`,
				payload,
				{ signal, timeout: 150000 },
			)
			.then(response => response.data);
	},
};
