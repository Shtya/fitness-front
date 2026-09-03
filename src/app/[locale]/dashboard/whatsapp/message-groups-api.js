import api from '@/utils/axios';

function whatsappApiError(error) {
	const raw = error?.response?.data?.message || error?.message || 'Request failed';
	const message = Array.isArray(raw) ? raw.join(', ') : String(raw);
	const next = new Error(message);
	next.response = error?.response;
	return next;
}

async function runWaApi(work) {
	try {
		return await work();
	} catch (error) {
		throw whatsappApiError(error);
	}
}

export async function listChatMessageGroups(conversationId) {
	return runWaApi(async () => {
		const { data } = await api.get(`/whatsapp/conversations/${conversationId}/message-groups`);
		return Array.isArray(data?.items) ? data.items : [];
	});
}

export async function listChatMessageGroupMembership(conversationId) {
	return runWaApi(async () => {
		const { data } = await api.get(
			`/whatsapp/conversations/${conversationId}/message-groups/membership`,
		);
		return data?.membership && typeof data.membership === 'object' ? data.membership : {};
	});
}

export async function createChatMessageGroup(conversationId, name) {
	return runWaApi(async () => {
		const { data } = await api.post(`/whatsapp/conversations/${conversationId}/message-groups`, {
			name,
		});
		return data;
	});
}

export async function renameChatMessageGroup(conversationId, groupId, name) {
	return runWaApi(async () => {
		const { data } = await api.put(
			`/whatsapp/conversations/${conversationId}/message-groups/${groupId}`,
			{ name },
		);
		return data;
	});
}

export async function deleteChatMessageGroup(conversationId, groupId) {
	return runWaApi(async () => {
		const { data } = await api.delete(
			`/whatsapp/conversations/${conversationId}/message-groups/${groupId}`,
		);
		return data;
	});
}

export async function fetchChatMessageGroupMessages(conversationId, groupId) {
	return runWaApi(async () => {
		const { data } = await api.get(
			`/whatsapp/conversations/${conversationId}/message-groups/${groupId}/messages`,
		);
		return data;
	});
}

export async function addMessagesToChatGroup(conversationId, groupId, messageIds) {
	return runWaApi(async () => {
		const { data } = await api.post(
			`/whatsapp/conversations/${conversationId}/message-groups/${groupId}/messages`,
			{ messageIds },
		);
		return data;
	});
}

export async function removeMessagesFromChatGroup(conversationId, groupId, messageIds) {
	return runWaApi(async () => {
		const { data } = await api.post(
			`/whatsapp/conversations/${conversationId}/message-groups/${groupId}/messages/remove`,
			{ messageIds },
		);
		return data;
	});
}
