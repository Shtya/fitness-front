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

export async function fetchWhatsAppBoard(accountId) {
	return runWaApi(async () => {
		const { data } = await api.get(`/whatsapp/accounts/${accountId}/board`);
		return data;
	});
}

export async function createBoardColumn(accountId, payload) {
	return runWaApi(async () => {
		const { data } = await api.post(`/whatsapp/accounts/${accountId}/board/columns`, payload);
		return data;
	});
}

export async function updateBoardColumn(accountId, columnId, payload) {
	return runWaApi(async () => {
		const { data } = await api.patch(
			`/whatsapp/accounts/${accountId}/board/columns/${columnId}`,
			payload,
		);
		return data;
	});
}

export async function deleteBoardColumn(accountId, columnId) {
	return runWaApi(async () => {
		const { data } = await api.delete(
			`/whatsapp/accounts/${accountId}/board/columns/${columnId}`,
		);
		return data;
	});
}

export async function reorderBoardColumns(accountId, columnIds) {
	return runWaApi(async () => {
		const { data } = await api.post(`/whatsapp/accounts/${accountId}/board/columns/reorder`, {
			columnIds,
		});
		return data;
	});
}

export async function createBoardCard(accountId, payload) {
	return runWaApi(async () => {
		const { data } = await api.post(`/whatsapp/accounts/${accountId}/board/cards`, payload);
		return data;
	});
}

export async function createBoardCardFromMessages(accountId, payload) {
	return runWaApi(async () => {
		const { data } = await api.post(
			`/whatsapp/accounts/${accountId}/board/cards/from-messages`,
			payload,
		);
		return data;
	});
}

export async function updateBoardCard(accountId, cardId, payload) {
	return runWaApi(async () => {
		const { data } = await api.patch(
			`/whatsapp/accounts/${accountId}/board/cards/${cardId}`,
			payload,
		);
		return data;
	});
}

export async function moveBoardCard(accountId, cardId, payload) {
	return runWaApi(async () => {
		const { data } = await api.post(
			`/whatsapp/accounts/${accountId}/board/cards/${cardId}/move`,
			payload,
		);
		return data;
	});
}

export async function reorderBoardCards(accountId, columnId, cardIds) {
	return runWaApi(async () => {
		const { data } = await api.post(`/whatsapp/accounts/${accountId}/board/cards/reorder`, {
			columnId,
			cardIds,
		});
		return data;
	});
}

export async function deleteBoardCard(accountId, cardId) {
	return runWaApi(async () => {
		const { data } = await api.delete(`/whatsapp/accounts/${accountId}/board/cards/${cardId}`);
		return data;
	});
}

export function boardCardToUi(card) {
	return {
		id: card.id,
		listId: card.listId || card.columnId,
		title: card.title,
		description: card.description || '',
		dueDate: card.dueDate || null,
		isStarred: Boolean(card.isStarred),
		priority: card.priority || (card.isStarred ? 'high' : 'medium'),
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
	const rawLists = payload?.lists || payload?.columns || [];
	const lists = rawLists.map(list => ({
		id: list.id,
		title: list.title || list.name || '',
		color: list.color,
	}));
	const cards = (payload?.cards || []).map(boardCardToUi);
	return { board: payload?.board || null, lists, cards };
}
