import api from '@/utils/axios';

export async function fetchWhatsAppBoard(accountId) {
	const { data } = await api.get(`/whatsapp/accounts/${accountId}/board`);
	return data;
}

export async function createBoardColumn(accountId, payload) {
	const { data } = await api.post(`/whatsapp/accounts/${accountId}/board/columns`, payload);
	return data;
}

export async function updateBoardColumn(accountId, columnId, payload) {
	const { data } = await api.patch(
		`/whatsapp/accounts/${accountId}/board/columns/${columnId}`,
		payload,
	);
	return data;
}

export async function deleteBoardColumn(accountId, columnId) {
	const { data } = await api.delete(
		`/whatsapp/accounts/${accountId}/board/columns/${columnId}`,
	);
	return data;
}

export async function reorderBoardColumns(accountId, columnIds) {
	const { data } = await api.post(`/whatsapp/accounts/${accountId}/board/columns/reorder`, {
		columnIds,
	});
	return data;
}

export async function createBoardCard(accountId, payload) {
	const { data } = await api.post(`/whatsapp/accounts/${accountId}/board/cards`, payload);
	return data;
}

export async function createBoardCardFromMessages(accountId, payload) {
	const { data } = await api.post(
		`/whatsapp/accounts/${accountId}/board/cards/from-messages`,
		payload,
	);
	return data;
}

export async function updateBoardCard(accountId, cardId, payload) {
	const { data } = await api.patch(
		`/whatsapp/accounts/${accountId}/board/cards/${cardId}`,
		payload,
	);
	return data;
}

export async function moveBoardCard(accountId, cardId, payload) {
	const { data } = await api.post(
		`/whatsapp/accounts/${accountId}/board/cards/${cardId}/move`,
		payload,
	);
	return data;
}

export async function reorderBoardCards(accountId, columnId, cardIds) {
	const { data } = await api.post(`/whatsapp/accounts/${accountId}/board/cards/reorder`, {
		columnId,
		cardIds,
	});
	return data;
}

export async function deleteBoardCard(accountId, cardId) {
	const { data } = await api.delete(`/whatsapp/accounts/${accountId}/board/cards/${cardId}`);
	return data;
}

export function boardCardToUi(card) {
	return {
		id: card.id,
		listId: card.listId || card.columnId,
		title: card.title,
		description: card.description || '',
		dueDate: card.dueDate || null,
		isStarred: Boolean(card.isStarred),
		isCompleted: Boolean(card.isCompleted),
		labels: card.labels || [],
		checklist: card.checklist || [],
		comments: card.comments || [],
		attachments: card.attachments || [],
		coverImage: card.coverImage || null,
		conversationId: card.conversationId || null,
		orderIndex: card.orderIndex ?? 0,
		createdAt: card.createdAt || null,
		updatedAt: card.updatedAt || null,
		links: card.links || [],
	};
}

export function boardPayloadToUi(payload) {
	const lists = (payload?.lists || []).map(list => ({
		id: list.id,
		title: list.title,
		color: list.color,
	}));
	const cards = (payload?.cards || []).map(boardCardToUi);
	return { board: payload?.board || null, lists, cards };
}
