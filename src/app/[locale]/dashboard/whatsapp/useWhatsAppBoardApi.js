'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
	boardPayloadToUi,
	createBoardCard,
	createBoardColumn,
	deleteBoardCard,
	deleteBoardColumn,
	fetchWhatsAppBoard,
	moveBoardCard,
	reorderBoardCards,
	reorderBoardColumns,
	updateBoardCard,
	updateBoardColumn,
} from './whatsapp-board-api';

export function useWhatsAppBoardApi(accountId) {
	const [lists, setLists] = useState([]);
	const [cards, setCards] = useState([]);
	const [loading, setLoading] = useState(Boolean(accountId));
	const [error, setError] = useState('');
	const reloadRef = useRef(0);

	const reload = useCallback(async () => {
		if (!accountId) return;
		const requestId = ++reloadRef.current;
		setLoading(true);
		setError('');
		try {
			const payload = await fetchWhatsAppBoard(accountId);
			if (requestId !== reloadRef.current) return;
			const ui = boardPayloadToUi(payload);
			setLists(ui.lists);
			setCards(ui.cards);
		} catch (err) {
			if (requestId !== reloadRef.current) return;
			setError(err?.response?.data?.message || err?.message || 'Could not load board');
		} finally {
			if (requestId === reloadRef.current) setLoading(false);
		}
	}, [accountId]);

	useEffect(() => {
		void reload();
	}, [reload]);

	const addList = useCallback(
		async title => {
			if (!accountId || !title?.trim()) return null;
			const created = await createBoardColumn(accountId, { name: title.trim() });
			setLists(current => [...current, { id: created.id, title: created.title, color: created.color }]);
			return created;
		},
		[accountId],
	);

	const updateList = useCallback(
		async (listId, updates) => {
			if (!accountId) return;
			setLists(current =>
				current.map(item => (item.id === listId ? { ...item, ...updates } : item)),
			);
			await updateBoardColumn(accountId, listId, {
				name: updates.title,
				color: updates.color,
			});
		},
		[accountId],
	);

	const removeList = useCallback(
		async listId => {
			if (!accountId) return;
			await deleteBoardColumn(accountId, listId);
			setLists(current => current.filter(item => item.id !== listId));
			setCards(current => current.filter(item => item.listId !== listId));
		},
		[accountId],
	);

	const addCard = useCallback(
		async (listId, title, images = []) => {
			if (!accountId || !listId || !title?.trim()) return null;
			const created = await createBoardCard(accountId, {
				columnId: listId,
				title: title.trim(),
				description: '',
			});
			const uiCard = {
				id: created.id,
				listId: created.listId || created.columnId,
				title: created.title,
				description: created.description || '',
				labels: created.labels || [],
				checklist: created.checklist || [],
				comments: created.comments || [],
				attachments:
					images.length > 0
						? images.map((url, index) => ({
								id: `att-${created.id}-${index}`,
								url,
								name: `Image ${index + 1}`,
							}))
						: [],
				coverImage: images[0] || null,
				isStarred: false,
				links: created.links || [],
			};
			if (images.length) {
				await updateBoardCard(accountId, created.id, {
					attachments: uiCard.attachments,
					coverImageUrl: uiCard.coverImage,
				});
			}
			setCards(current => [...current, uiCard]);
			return uiCard;
		},
		[accountId],
	);

	const patchCard = useCallback(
		async (cardId, updates) => {
			if (!accountId || !cardId) return;
			setCards(current =>
				current.map(item => (item.id === cardId ? { ...item, ...updates } : item)),
			);
			await updateBoardCard(accountId, cardId, {
				title: updates.title,
				description: updates.description,
				columnId: updates.listId,
				isStarred: updates.isStarred,
				labels: updates.labels,
				checklist: updates.checklist,
				comments: updates.comments,
				attachments: updates.attachments,
				coverImageUrl: updates.coverImage,
				dueAt: updates.dueDate ? new Date(updates.dueDate).toISOString() : updates.dueDate,
			});
		},
		[accountId],
	);

	const removeCard = useCallback(
		async cardId => {
			if (!accountId) return;
			await deleteBoardCard(accountId, cardId);
			setCards(current => current.filter(item => item.id !== cardId));
		},
		[accountId],
	);

	const persistColumnOrder = useCallback(
		async orderedLists => {
			if (!accountId) return;
			await reorderBoardColumns(
				accountId,
				orderedLists.map(item => item.id),
			);
		},
		[accountId],
	);

	const persistCardMove = useCallback(
		async (cardId, columnId, cardIdsInColumn) => {
			if (!accountId) return;
			await moveBoardCard(accountId, cardId, { columnId });
			if (cardIdsInColumn?.length) {
				await reorderBoardCards(accountId, columnId, cardIdsInColumn);
			}
		},
		[accountId],
	);

	return {
		lists,
		cards,
		setLists,
		setCards,
		loading,
		error,
		reload,
		addList,
		updateList,
		removeList,
		addCard,
		patchCard,
		removeCard,
		persistColumnOrder,
		persistCardMove,
	};
}
