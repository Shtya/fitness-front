import api from '@/utils/axios';

export const metaWhatsAppApi = {
	status(signal) {
		return api.get('/meta-whatsapp/status', { signal }).then(r => r.data);
	},
	saveConfig(payload, signal) {
		return api.put('/meta-whatsapp/config', payload, { signal }).then(r => r.data);
	},
	validate(signal) {
		return api.post('/meta-whatsapp/config/validate', {}, { signal }).then(r => r.data);
	},
	setEnabled(enabled, signal) {
		return api
			.post('/meta-whatsapp/config/enable', { enabled }, { signal })
			.then(r => r.data);
	},
	templates(signal) {
		return api.get('/meta-whatsapp/templates', { signal }).then(r => r.data);
	},
	createTemplate(payload, signal) {
		return api.post('/meta-whatsapp/templates', payload, { signal }).then(r => r.data);
	},
	updateTemplate(templateId, payload, signal) {
		return api
			.put(`/meta-whatsapp/templates/${encodeURIComponent(templateId)}`, payload, { signal })
			.then(r => r.data);
	},
	deleteTemplate({ name, hsmId } = {}, signal) {
		return api
			.delete('/meta-whatsapp/templates', {
				signal,
				params: {
					...(name ? { name } : {}),
					...(hsmId ? { hsmId } : {}),
				},
			})
			.then(r => r.data);
	},
	seedTemplates(signal) {
		return api.get('/meta-whatsapp/templates/seed', { signal }).then(r => r.data);
	},
	submitSeedTemplates(payload = {}, signal) {
		return api
			.post('/meta-whatsapp/templates/seed', payload, { signal, timeout: 120000 })
			.then(r => r.data);
	},
	cloneTemplates(payload = {}, signal) {
		return api
			.post('/meta-whatsapp/templates/clone', payload, { signal, timeout: 120000 })
			.then(r => r.data);
	},
	templateLibrary(params = {}, signal) {
		return api
			.get('/meta-whatsapp/templates/library', { params, signal })
			.then(r => r.data);
	},
	createFromLibrary(payload, signal) {
		return api
			.post('/meta-whatsapp/templates/from-library', payload, { signal, timeout: 120000 })
			.then(r => r.data);
	},
	uploadTemplateHeader(file, signal) {
		const form = new FormData();
		form.append('file', file);
		return api
			.post('/meta-whatsapp/templates/upload-header', form, {
				signal,
				headers: { 'Content-Type': 'multipart/form-data' },
				timeout: 120000,
			})
			.then(r => r.data);
	},

	activity(limit = 50, signal) {
		return api
			.get('/meta-whatsapp/activity', { params: { limit }, signal })
			.then(r => r.data);
	},
	usageBilling(signal) {
		return api
			.get('/meta-whatsapp/usage-billing', { signal, timeout: 120000 })
			.then(r => r.data);
	},
	conversations(params = {}, signal) {
		return api
			.get('/meta-whatsapp/conversations', { params, signal })
			.then(r => r.data);
	},
	conversation(id, signal) {
		return api.get(`/meta-whatsapp/conversations/${id}`, { signal }).then(r => r.data);
	},
	messages(id, params = {}, signal) {
		return api
			.get(`/meta-whatsapp/conversations/${id}/messages`, { params, signal })
			.then(r => r.data);
	},
	markRead(id, signal) {
		return api
			.post(`/meta-whatsapp/conversations/${id}/read`, {}, { signal })
			.then(r => r.data);
	},
	syncConversation(id, signal) {
		return api
			.post(`/meta-whatsapp/conversations/${id}/sync`, {}, { signal })
			.then(r => r.data);
	},
	openPhone(phone, displayName, signal) {
		return api
			.post('/meta-whatsapp/conversations/open-phone', { phone, displayName }, { signal })
			.then(r => r.data);
	},
	openLead(leadId, signal) {
		return api.post('/meta-whatsapp/leads/open', { leadId }, { signal }).then(r => r.data);
	},
	sendText(payload, signal) {
		return api.post('/meta-whatsapp/messages/text', payload, { signal }).then(r => r.data);
	},
	sendTemplate(payload, signal) {
		return api
			.post('/meta-whatsapp/messages/template', payload, { signal })
			.then(r => r.data);
	},
	sendMedia({ conversationId, file, caption, asVoice }, signal) {
		const form = new FormData();
		form.append('file', file);
		if (conversationId) form.append('conversationId', conversationId);
		if (caption) form.append('caption', caption);
		if (asVoice) form.append('asVoice', '1');
		return api
			.post('/meta-whatsapp/messages/media', form, {
				signal,
				headers: { 'Content-Type': 'multipart/form-data' },
				timeout: 120000,
			})
			.then(r => r.data);
	},
	async mediaBlobUrl(mediaPath) {
		if (!mediaPath) return null;
		const path = mediaPath.startsWith('/') ? mediaPath : `/${mediaPath}`;
		const res = await api.get(path, { responseType: 'blob' });
		return URL.createObjectURL(res.data);
	},
	startBulk(payload, signal) {
		return api.post('/meta-whatsapp/bulk', payload, { signal }).then(r => r.data);
	},
	checkBulkPhones(phones, signal) {
		return api
			.post('/meta-whatsapp/bulk/check-phones', { phones }, { signal })
			.then(r => r.data);
	},
	listBulk(signal) {
		return api.get('/meta-whatsapp/bulk', { signal }).then(r => r.data);
	},
	getBulk(id, signal) {
		return api
			.get(`/meta-whatsapp/bulk/${id}`, {
				signal,
				params: { _ts: Date.now() },
				headers: { 'Cache-Control': 'no-cache' },
			})
			.then(r => r.data);
	},
	cancelBulk(id, signal) {
		return api.post(`/meta-whatsapp/bulk/${id}/cancel`, {}, { signal }).then(r => r.data);
	},
	listQuickReplies(signal) {
		return api.get('/meta-whatsapp/quick-replies', { signal }).then(r => r.data);
	},
	createQuickReply(payload, signal) {
		return api.post('/meta-whatsapp/quick-replies', payload, { signal }).then(r => r.data);
	},
	updateQuickReply(id, payload, signal) {
		return api.put(`/meta-whatsapp/quick-replies/${id}`, payload, { signal }).then(r => r.data);
	},
	deleteQuickReply(id, signal) {
		return api.delete(`/meta-whatsapp/quick-replies/${id}`, { signal }).then(r => r.data);
	},
	translate(text, targetLang, signal) {
		return api
			.post(
				'/meta-whatsapp/translate',
				{ text, ...(targetLang ? { targetLang } : {}) },
				{ signal, timeout: 30000 },
			)
			.then(r => r.data);
	},
};
