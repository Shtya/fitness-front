import api from '@/utils/axios';

const PREFIX = '/whatsapp-demo';

function data(response) {
	return response?.data;
}

export const demoApi = {
	getSettings: () => api.get(`${PREFIX}/settings`).then(data),
	updateSettings: payload => api.patch(`${PREFIX}/settings`, payload).then(data),

	listProfiles: () => api.get(`${PREFIX}/profiles`).then(data),
	createProfile: payload => api.post(`${PREFIX}/profiles`, payload).then(data),
	updateProfile: (id, payload) => api.patch(`${PREFIX}/profiles/${id}`, payload).then(data),
	deleteProfile: id => api.delete(`${PREFIX}/profiles/${id}`).then(data),
	activateProfile: id => api.post(`${PREFIX}/profiles/${id}/activate`).then(data),
	cloneProfile: (id, payload = {}) =>
		api.post(`${PREFIX}/profiles/${id}/clone`, payload).then(data),

	listContacts: profileId =>
		api.get(`${PREFIX}/profiles/${profileId}/contacts`).then(data),
	createContact: (profileId, payload) =>
		api.post(`${PREFIX}/profiles/${profileId}/contacts`, payload).then(data),
	updateContact: (profileId, id, payload) =>
		api.patch(`${PREFIX}/profiles/${profileId}/contacts/${id}`, payload).then(data),
	deleteContact: (profileId, id) =>
		api.delete(`${PREFIX}/profiles/${profileId}/contacts/${id}`).then(data),

	listConversations: profileId =>
		api.get(`${PREFIX}/profiles/${profileId}/conversations`).then(data),
	createConversation: (profileId, payload) =>
		api.post(`${PREFIX}/profiles/${profileId}/conversations`, payload).then(data),
	updateConversation: (profileId, id, payload) =>
		api.patch(`${PREFIX}/profiles/${profileId}/conversations/${id}`, payload).then(data),
	deleteConversation: (profileId, id) =>
		api.delete(`${PREFIX}/profiles/${profileId}/conversations/${id}`).then(data),

	listMessages: conversationId =>
		api.get(`${PREFIX}/conversations/${conversationId}/messages`).then(data),
	createMessage: (conversationId, payload) =>
		api.post(`${PREFIX}/conversations/${conversationId}/messages`, payload).then(data),
	updateMessage: (conversationId, id, payload) =>
		api.patch(`${PREFIX}/conversations/${conversationId}/messages/${id}`, payload).then(data),
	deleteMessage: (conversationId, id) =>
		api.delete(`${PREFIX}/conversations/${conversationId}/messages/${id}`).then(data),

	listEvents: profileId =>
		api.get(`${PREFIX}/profiles/${profileId}/events`).then(data),
	createEvent: (profileId, payload) =>
		api.post(`${PREFIX}/profiles/${profileId}/events`, payload).then(data),
	updateEvent: (profileId, id, payload) =>
		api.patch(`${PREFIX}/profiles/${profileId}/events/${id}`, payload).then(data),
	deleteEvent: (profileId, id) =>
		api.delete(`${PREFIX}/profiles/${profileId}/events/${id}`).then(data),

	uploadMedia: (profileId, file, onUploadProgress) => {
		const form = new FormData();
		form.append('file', file);
		return api
			.post(`${PREFIX}/profiles/${profileId}/media`, form, {
				headers: { 'Content-Type': 'multipart/form-data' },
				onUploadProgress,
			})
			.then(data);
	},
	getMedia: id =>
		api.get(`${PREFIX}/attachments/${id}/content`, { responseType: 'blob' }).then(data),
	deleteMedia: id => api.delete(`${PREFIX}/attachments/${id}`).then(data),
};

export function asList(payload) {
	if (Array.isArray(payload)) return payload;
	if (Array.isArray(payload?.items)) return payload.items;
	if (Array.isArray(payload?.data)) return payload.data;
	return [];
}
