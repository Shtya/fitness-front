import api from '@/utils/axios';

const BASE = '/email-memo';

export const emailMemoApi = {
	overview(signal) {
		return api.get(`${BASE}/overview`, { signal });
	},
	gmailAuthUrl(locale, connectionId, signal) {
		return api.get(`${BASE}/gmail/auth-url`, {
			params: {
				locale,
				connectionId,
				returnOrigin: typeof window !== 'undefined' ? window.location.origin : undefined,
				popup: '1',
			},
			signal,
		});
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
	importInbox(body = {}, signal) {
		return api.post(`${BASE}/gmail/import`, body, { signal, timeout: 120000 });
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
	connectWhatsApp(body = {}, signal) {
		return api.post(`${BASE}/whatsapp/connect`, body, { signal, timeout: 60000 });
	},
	whatsappQr(signal) {
		return api.get(`${BASE}/whatsapp/qr`, { signal });
	},
	whatsappChats(signal) {
		return api.get(`${BASE}/whatsapp/chats`, { signal });
	},
	disconnectWhatsApp(accountId, signal) {
		return api.post(`${BASE}/whatsapp/disconnect`, accountId ? { accountId } : {}, { signal });
	},
	useWhatsApp(accountId, signal) {
		return api.post(`${BASE}/whatsapp/use`, { accountId }, { signal });
	},
	testWhatsApp(signal) {
		return api.post(`${BASE}/whatsapp/test`, {}, { signal, timeout: 30000 });
	},
	messages(limit = 80, filters = {}, signal) {
		return api.get(`${BASE}/messages`, { params: { limit, ...filters }, signal });
	},
	message(id, signal) {
		return api.get(`${BASE}/messages/${id}`, { signal });
	},
	retry(id, signal) {
		return api.post(`${BASE}/messages/${id}/retry`, {}, { signal, timeout: 180000 });
	},
	sendNow(body = {}, signal) {
		return api.post(`${BASE}/send-now`, body, { signal, timeout: 300000 });
	},
	settings(signal) {
		return api.get(`${BASE}/settings`, { signal });
	},
	saveSettings(body, signal) {
		return api.put(`${BASE}/settings`, body, { signal });
	},
};
