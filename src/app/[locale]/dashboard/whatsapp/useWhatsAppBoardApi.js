'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import api, { baseImg } from '@/utils/axios';
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

function toUiCard(created, overrides = {}) {
	return {
		id: created.id,
		listId: created.listId || created.columnId,
		title: created.title,
		description: created.description || '',
		dueDate: created.dueDate || null,
		labels: created.labels || [],
		checklist: created.checklist || [],
		comments: created.comments || [],
		attachments: created.attachments || [],
		coverImage: created.coverImage || null,
		isStarred: Boolean(created.isStarred),
		priority: created.priority || (created.isStarred ? 'high' : 'medium'),
		isCompleted: Boolean(created.isCompleted),
		orderIndex: created.orderIndex ?? 0,
		createdAt: created.createdAt || new Date().toISOString(),
		updatedAt: created.updatedAt || new Date().toISOString(),
		links: created.links || [],
		...overrides,
	};
}

export async function uploadBoardImage(file) {
	const form = new FormData();
	form.append('file', file);
	const { data } = await api.post('/chat/upload/image', form, {
		headers: { 'Content-Type': 'multipart/form-data' },
	});
	return data?.url || data?.path || '';
}

export async function uploadBoardFile(file) {
	const form = new FormData();
	form.append('file', file);
	const { data } = await api.post('/chat/upload/file', form, {
		headers: { 'Content-Type': 'multipart/form-data' },
	});
	return data?.url || data?.path || '';
}

export function resolveBoardMediaUrl(url) {
	if (!url) return '';
	if (/^(https?:|data:|blob:)/i.test(url)) return url;
	const origin =
		(typeof baseImg === 'string' && baseImg) ||
		String(api.defaults?.baseURL || '').replace(/\/api(?:\/v\d+)?\/?$/i, '') ||
		(typeof window !== 'undefined' ? window.location.origin : '');
	const base = String(origin).replace(/\/$/, '');
	return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function useWhatsAppBoardApi(accountId) {
	const [lists, setLists] = useState([]);
	const [cards, setCards] = useState([]);
	const [board, setBoard] = useState(null);
	const [loading, setLoading] = useState(Boolean(accountId));
	const [error, setError] = useState('');
	const reloadRef = useRef(0);
	const cardCreateLock = useRef(new Set());
	const listCreateLock = useRef(false);
	const deletingCardIds = useRef(new Set());

	const reload = useCallback(async () => {
		if (!accountId) return;
		const requestId = ++reloadRef.current;
		setLoading(true);
		setError('');
		try {
			const payload = await fetchWhatsAppBoard(accountId);
			if (requestId !== reloadRef.current) return;
			const ui = boardPayloadToUi(payload);
			setBoard(ui.board);
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
			if (!accountId || !title?.trim() || listCreateLock.current) return null;
			listCreateLock.current = true;
			const tempId = `temp-list-${Date.now()}`;
			const optimistic = { id: tempId, title: title.trim(), color: null, __optimistic: true };
			setLists(current => [...current, optimistic]);
			try {
				const created = await createBoardColumn(accountId, { name: title.trim() });
				const real = { id: created.id, title: created.title, color: created.color };
				setLists(current => current.map(item => (item.id === tempId ? real : item)));
				return real;
			} catch (err) {
				setLists(current => current.filter(item => item.id !== tempId));
				throw err;
			} finally {
				listCreateLock.current = false;
			}
		},
		[accountId],
	);

	const updateList = useCallback(
		async (listId, updates) => {
			if (!accountId || String(listId).startsWith('temp-')) return;
			const previous = lists.find(item => item.id === listId);
			setLists(current =>
				current.map(item => (item.id === listId ? { ...item, ...updates } : item)),
			);
			try {
				await updateBoardColumn(accountId, listId, {
					name: updates.title,
					color: updates.color,
				});
			} catch (err) {
				if (previous) {
					setLists(current =>
						current.map(item => (item.id === listId ? previous : item)),
					);
				}
				throw err;
			}
		},
		[accountId, lists],
	);

	const removeList = useCallback(
		async listId => {
			if (!accountId || String(listId).startsWith('temp-')) return;
			const prevLists = lists;
			const prevCards = cards;
			setLists(current => current.filter(item => item.id !== listId));
			setCards(current => current.filter(item => item.listId !== listId));
			try {
				await deleteBoardColumn(accountId, listId);
			} catch (err) {
				setLists(prevLists);
				setCards(prevCards);
				throw err;
			}
		},
		[accountId, cards, lists],
	);

	const addCard = useCallback(
		async (listId, title, options = {}) => {
			if (!accountId || !listId || !title?.trim()) return null;
			if (String(listId).startsWith('temp-')) {
				throw new Error('Column is still saving');
			}
			const lockKey = `${listId}:${title.trim().toLowerCase()}`;
			if (cardCreateLock.current.has(lockKey)) return null;
			cardCreateLock.current.add(lockKey);

			const {
				description = '',
				images = [],
				dueDate = null,
				labels = [],
				isStarred = false,
			} = options;

			const tempId = `temp-card-${Date.now()}`;
			const optimistic = toUiCard(
				{
					id: tempId,
					listId,
					title: title.trim(),
					description,
					dueDate,
					labels,
					isStarred,
					attachments: images.map((url, index) => ({
						id: `tmp-att-${index}`,
						url,
						name: `Image ${index + 1}`,
					})),
					coverImage: images[0] || null,
				},
				{ __optimistic: true },
			);
			setCards(current => [...current, optimistic]);

			try {
				// CreateBoardCardDto only allows title/description/columnId/dueAt/… —
				// isStarred + labels belong on PATCH (UpdateBoardCardDto).
				const created = await createBoardCard(accountId, {
					columnId: listId,
					title: title.trim(),
					description: description || '',
					dueAt: dueDate ? new Date(dueDate).toISOString() : undefined,
				});
				let uiCard = toUiCard(created, {
					listId: created.listId || created.columnId || listId,
					description: description || created.description || '',
					dueDate: dueDate || created.dueDate || null,
					labels: labels.length ? labels : created.labels || [],
					isStarred,
				});
				const needsMetaPatch =
					Boolean(isStarred) || labels.length > 0 || images.length > 0;
				if (needsMetaPatch) {
					const attachments = images.map((url, index) => ({
						id: `att-${created.id}-${index}`,
						url,
						name: `Image ${index + 1}`,
					}));
					const patch = {
						...(isStarred ? { isStarred: true } : {}),
						...(labels.length ? { labels } : {}),
						...(images.length
							? { attachments, coverImageUrl: images[0] }
							: {}),
					};
					await updateBoardCard(accountId, created.id, patch);
					uiCard = {
						...uiCard,
						...(images.length ? { attachments, coverImage: images[0] } : {}),
						...(labels.length ? { labels } : {}),
						isStarred: Boolean(isStarred),
					};
				}
				setCards(current =>
					current.map(item => (item.id === tempId ? uiCard : item)),
				);
				return uiCard;
			} catch (err) {
				setCards(current => current.filter(item => item.id !== tempId));
				throw err;
			} finally {
				cardCreateLock.current.delete(lockKey);
			}
		},
		[accountId],
	);

	const patchCard = useCallback(
		async (cardId, updates) => {
			if (!accountId || !cardId || String(cardId).startsWith('temp-')) return;
			if (deletingCardIds.current.has(cardId)) return;
			let previous = null;
			setCards(current => {
				previous = current.find(item => item.id === cardId) || null;
				return current.map(item => (item.id === cardId ? { ...item, ...updates } : item));
			});
			try {
				await updateBoardCard(accountId, cardId, {
					title: updates.title,
					description: updates.description,
					columnId: updates.listId,
					isStarred: updates.isStarred,
					priority: updates.priority,
					isCompleted: updates.isCompleted,
					labels: updates.labels,
					checklist: updates.checklist,
					comments: updates.comments,
					attachments: updates.attachments,
					coverImageUrl: updates.coverImage,
					dueAt:
						updates.dueDate === undefined
							? undefined
							: updates.dueDate
								? new Date(updates.dueDate).toISOString()
								: null,
				});
			} catch (err) {
				if (deletingCardIds.current.has(cardId)) return;
				if (previous) {
					setCards(current =>
						current.map(item => (item.id === cardId ? previous : item)),
					);
				}
				throw err;
			}
		},
		[accountId],
	);

	const removeCard = useCallback(
		async cardId => {
			if (!accountId || String(cardId).startsWith('temp-')) return;
			deletingCardIds.current.add(cardId);
			let snapshot = [];
			setCards(current => {
				snapshot = current;
				return current.filter(item => item.id !== cardId);
			});
			try {
				await deleteBoardCard(accountId, cardId);
			} catch (err) {
				setCards(snapshot);
				throw err;
			} finally {
				deletingCardIds.current.delete(cardId);
			}
		},
		[accountId],
	);

	const persistColumnOrder = useCallback(
		async orderedLists => {
			if (!accountId) return;
			const ids = orderedLists.map(item => item.id).filter(id => !String(id).startsWith('temp-'));
			await reorderBoardColumns(accountId, ids);
		},
		[accountId],
	);

	const persistCardMove = useCallback(
		async (cardId, columnId, cardIdsInColumn) => {
			if (!accountId || String(cardId).startsWith('temp-')) return;
			await moveBoardCard(accountId, cardId, { columnId });
			if (cardIdsInColumn?.length) {
				await reorderBoardCards(
					accountId,
					columnId,
					cardIdsInColumn.filter(id => !String(id).startsWith('temp-')),
				);
			}
		},
		[accountId],
	);

	return {
		accountId,
		board,
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
