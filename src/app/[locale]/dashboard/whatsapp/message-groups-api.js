import api from '@/utils/axios';

export async function listChatMessageGroups(conversationId) {
	const { data } = await api.get(`/whatsapp/conversations/${conversationId}/message-groups`);
	return Array.isArray(data?.items) ? data.items : [];
}

export async function listChatMessageGroupMembership(conversationId) {
	const { data } = await api.get(
		`/whatsapp/conversations/${conversationId}/message-groups/membership`,
	);
	return data?.membership && typeof data.membership === 'object' ? data.membership : {};
}

export async function createChatMessageGroup(conversationId, name) {
	const { data } = await api.post(`/whatsapp/conversations/${conversationId}/message-groups`, {
		name,
	});
	return data;
}

export async function renameChatMessageGroup(conversationId, groupId, name) {
	const { data } = await api.put(
		`/whatsapp/conversations/${conversationId}/message-groups/${groupId}`,
		{ name },
	);
	return data;
}

export async function deleteChatMessageGroup(conversationId, groupId) {
	const { data } = await api.delete(
		`/whatsapp/conversations/${conversationId}/message-groups/${groupId}`,
	);
	return data;
}

export async function fetchChatMessageGroupMessages(conversationId, groupId) {
	const { data } = await api.get(
		`/whatsapp/conversations/${conversationId}/message-groups/${groupId}/messages`,
	);
	return data;
}

export async function addMessagesToChatGroup(conversationId, groupId, messageIds) {
	const { data } = await api.post(
		`/whatsapp/conversations/${conversationId}/message-groups/${groupId}/messages`,
		{ messageIds },
	);
	return data;
}

export async function removeMessagesFromChatGroup(conversationId, groupId, messageIds) {
	const { data } = await api.post(
		`/whatsapp/conversations/${conversationId}/message-groups/${groupId}/messages/remove`,
		{ messageIds },
	);
	return data;
}
