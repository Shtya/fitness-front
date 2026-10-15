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
	writingAssist(conversationId, payload = {}, signal) {
		return api
			.post(
				`/whatsapp/conversations/${conversationId}/writing-assist`,
				payload,
				{ signal, timeout: 150000 },
			)
			.then(response => response.data);
	},
};

const agentBase = accountId => `/whatsapp/accounts/${accountId}/ai-agent`;
const agentConversation = conversationId => `/whatsapp/conversations/${conversationId}/ai-agent`;

export const whatsappAiAgentApi = {
	getSettings(accountId, signal) {
		return api.get(`${agentBase(accountId)}/settings`, { signal }).then(response => response.data);
	},
	updateSettings(accountId, payload) {
		return api.put(`${agentBase(accountId)}/settings`, payload).then(response => response.data);
	},
	catalog(accountId, signal) {
		return api.get(`${agentBase(accountId)}/catalog`, { signal }).then(response => response.data);
	},
	listExternalModels(accountId, signal) {
		return api.get(`${agentBase(accountId)}/models`, { signal }).then(response => response.data);
	},
	createExternalModel(accountId, payload) {
		return api.post(`${agentBase(accountId)}/models`, payload).then(response => response.data);
	},
	updateExternalModel(accountId, id, payload) {
		return api.put(`${agentBase(accountId)}/models/${id}`, payload).then(response => response.data);
	},
	deleteExternalModel(accountId, id) {
		return api.delete(`${agentBase(accountId)}/models/${id}`).then(response => response.data);
	},
	testExternalModel(accountId, id) {
		return api
			.post(`${agentBase(accountId)}/models/${id}/test`, {}, { timeout: 30000 })
			.then(response => response.data);
	},
	listKnowledge(accountId, signal) {
		return api.get(`${agentBase(accountId)}/knowledge`, { signal }).then(response => response.data);
	},
	createKnowledge(accountId, payload) {
		return api.post(`${agentBase(accountId)}/knowledge`, payload).then(response => response.data);
	},
	updateKnowledge(accountId, id, payload) {
		return api.put(`${agentBase(accountId)}/knowledge/${id}`, payload).then(response => response.data);
	},
	deleteKnowledge(accountId, id) {
		return api.delete(`${agentBase(accountId)}/knowledge/${id}`).then(response => response.data);
	},
	test(accountId, payload, signal) {
		return api
			.post(`${agentBase(accountId)}/test`, payload, { signal, timeout: 150000 })
			.then(response => response.data);
	},
	listRuns(accountId, signal) {
		return api.get(`${agentBase(accountId)}/runs`, { signal, params: { limit: 50 } }).then(response => response.data);
	},
	listConversationStates(accountId, signal) {
		return api.get(`${agentBase(accountId)}/conversations`, { signal }).then(response => response.data);
	},
	getConversation(conversationId, signal) {
		return api.get(agentConversation(conversationId), { signal }).then(response => response.data);
	},
	setMode(conversationId, mode) {
		return api.put(agentConversation(conversationId), { mode }).then(response => response.data);
	},
	resume(conversationId) {
		return api.post(`${agentConversation(conversationId)}/resume`).then(response => response.data);
	},
	sendSuggestion(conversationId, text) {
		return api
			.post(`${agentConversation(conversationId)}/suggestion/send`, text == null ? {} : { text })
			.then(response => response.data);
	},
	dismissSuggestion(conversationId) {
		return api.delete(`${agentConversation(conversationId)}/suggestion`).then(response => response.data);
	},
	clearMemory(conversationId) {
		return api.delete(`${agentConversation(conversationId)}/memory`).then(response => response.data);
	},
};

export function apiErrorMessage(error, fallback) {
	const message = error?.response?.data?.message;
	if (Array.isArray(message)) return message.join(' · ');
	return message || error?.message || fallback;
}
