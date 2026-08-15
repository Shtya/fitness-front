import api from '@/utils/axios';

const BASE = '/email-memo';

export const emailMemoApi = {
	overview(signal) {
		return api.get(`${BASE}/overview`, { signal });
	},
	gmailAuthUrl(locale, connectionId, signal) {
		return api.get(`${BASE}/gmail/auth-url`, { params: { locale, connectionId }, signal });
	},
	disconnectGmail(connectionId, signal) {
		return api.post(
			connectionId ? `${BASE}/gmail/accounts/${connectionId}/disconnect` : `${BASE}/gmail/disconnect`,
			{},
			{ signal },
		);
	},
	syncGmail(connectionId, signal) {
		return api.post(
			connectionId ? `${BASE}/gmail/accounts/${connectionId}/sync` : `${BASE}/gmail/sync`,
			{},
			{ signal, timeout: 60000 },
		);
	},
	testGmailCredentials(body, signal) {
		return api.post(`${BASE}/gmail/credentials/test`, body, { signal, timeout: 20000 });
	},
	saveGmailCredentials(body, signal) {
		return api.put(`${BASE}/gmail/credentials`, body, { signal });
	},
	senders(signal) {
		return api.get(`${BASE}/senders`, { signal });
	},
	excludeSender(email, signal) {
		return api.post(`${BASE}/senders/exclude`, { email }, { signal });
	},
	includeSender(email, signal) {
		return api.post(`${BASE}/senders/include`, { email }, { signal });
	},
	connectWhatsApp(signal) {
		return api.post(`${BASE}/whatsapp/connect`, {}, { signal, timeout: 60000 });
	},
	whatsappQr(signal) {
		return api.get(`${BASE}/whatsapp/qr`, { signal });
	},
	whatsappChats(signal) {
		return api.get(`${BASE}/whatsapp/chats`, { signal });
	},
	disconnectWhatsApp(signal) {
		return api.post(`${BASE}/whatsapp/disconnect`, {}, { signal });
	},
	testWhatsApp(signal) {
		return api.post(`${BASE}/whatsapp/test`, {}, { signal, timeout: 30000 });
	},
	messages(limit = 40, signal) {
		return api.get(`${BASE}/messages`, { params: { limit }, signal });
	},
	message(id, signal) {
		return api.get(`${BASE}/messages/${id}`, { signal });
	},
	retry(id, signal) {
		return api.post(`${BASE}/messages/${id}/retry`, {}, { signal, timeout: 60000 });
	},
	settings(signal) {
		return api.get(`${BASE}/settings`, { signal });
	},
	saveSettings(body, signal) {
		return api.put(`${BASE}/settings`, body, { signal });
	},
};
