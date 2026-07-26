'use client';

import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/axios';

/** Matches ReactQuery provider defaults closely; WhatsApp list TTL historically 30s. */
export const WHATSAPP_STALE_TIME = 30_000;

export const whatsappKeys = {
	all: ['whatsapp'],
	conversations: (accountId, params = {}) => [
		'whatsapp',
		'conversations',
		accountId,
		{
			page: params.page ?? 1,
			search: params.search || '',
			filter: params.filter || 'all',
			assignedUserId: params.assignedUserId || '',
		},
	],
	conversationsRoot: (accountId) => ['whatsapp', 'conversations', accountId],
	messages: (conversationId) => ['whatsapp', 'messages', conversationId],
	messagesRoot: () => ['whatsapp', 'messages'],
};

export async function fetchConversations(accountId, params = {}) {
	const page = params.page || 1;
	const { data } = await api.get(`/whatsapp/accounts/${accountId}/conversations`, {
		params: {
			page,
			limit: params.limit || 50,
			search: params.search || undefined,
			filter: params.filter && params.filter !== 'all' ? params.filter : undefined,
			assignedUserId: params.assignedUserId || undefined,
		},
	});
	// Defensive: accept both `{ items }` and a bare array payload.
	const items = Array.isArray(data?.items)
		? data.items
		: Array.isArray(data)
			? data
			: [];
	const total =
		typeof data?.total === 'number' && Number.isFinite(data.total)
			? data.total
			: items.length;
	return {
		items,
		page: data?.page || page,
		total,
		scope: data?.scope || 'all',
		cachedAt: Date.now(),
	};
}

export async function fetchMessages(conversationId, params = {}) {
	const { data } = await api.get(`/whatsapp/conversations/${conversationId}/messages`, {
		params: {
			limit: params.limit || 30,
			before: params.before || undefined,
		},
	});
	return Array.isArray(data) ? data : [];
}

/**
 * Imperative TanStack Query cache helpers for the WhatsApp workspace.
 * Prefer these over ad-hoc Map/TTL caches so identical GETs share one store.
 */
export function useWhatsAppQueryCache() {
	const queryClient = useQueryClient();

	const getConversationsCache = useCallback(
		(accountId, params = { page: 1 }) => {
			if (!accountId) return undefined;
			return queryClient.getQueryData(whatsappKeys.conversations(accountId, params));
		},
		[queryClient],
	);

	const setConversationsCache = useCallback(
		(accountId, data, params = { page: 1 }) => {
			if (!accountId || !data) return;
			queryClient.setQueryData(whatsappKeys.conversations(accountId, params), {
				...data,
				cachedAt: data.cachedAt || Date.now(),
			});
		},
		[queryClient],
	);

	const invalidateConversations = useCallback(
		(accountId) => {
			if (accountId) {
				return queryClient.invalidateQueries({
					queryKey: whatsappKeys.conversationsRoot(accountId),
				});
			}
			return queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
		},
		[queryClient],
	);

	const removeConversationsCache = useCallback(
		(accountId) => {
			if (!accountId) return;
			queryClient.removeQueries({ queryKey: whatsappKeys.conversationsRoot(accountId) });
		},
		[queryClient],
	);

	/** Drop in-flight + cached conversation lists so a post-sync reload cannot be
	 *  overwritten by an older empty GET that was still pending. */
	const resetConversationsCache = useCallback(
		async (accountId) => {
			if (!accountId) return;
			const queryKey = whatsappKeys.conversationsRoot(accountId);
			await queryClient.cancelQueries({ queryKey });
			queryClient.removeQueries({ queryKey });
		},
		[queryClient],
	);

	const getMessagesCache = useCallback(
		(conversationId) => {
			if (!conversationId) return undefined;
			return queryClient.getQueryData(whatsappKeys.messages(conversationId));
		},
		[queryClient],
	);

	const setMessagesCache = useCallback(
		(conversationId, data) => {
			if (!conversationId || !data) return;
			queryClient.setQueryData(whatsappKeys.messages(conversationId), {
				...data,
				cachedAt: data.cachedAt || Date.now(),
			});
		},
		[queryClient],
	);

	const invalidateMessages = useCallback(
		(conversationId) => {
			if (conversationId) {
				return queryClient.invalidateQueries({
					queryKey: whatsappKeys.messages(conversationId),
				});
			}
			return queryClient.invalidateQueries({ queryKey: whatsappKeys.messagesRoot() });
		},
		[queryClient],
	);

	const clearMessagesCache = useCallback(() => {
		queryClient.removeQueries({ queryKey: whatsappKeys.messagesRoot() });
	}, [queryClient]);

	const prefetchMessages = useCallback(
		async (conversationId, limit = 30) => {
			if (!conversationId) return;
			await queryClient.prefetchQuery({
				queryKey: whatsappKeys.messages(conversationId),
				queryFn: async () => {
					const items = await fetchMessages(conversationId, { limit });
					return {
						items,
						hasMore: items.length >= limit,
						cachedAt: Date.now(),
					};
				},
				staleTime: WHATSAPP_STALE_TIME,
			});
		},
		[queryClient],
	);

	/** Map-compatible adapters so existing workspace call sites stay small. */
	const conversationsCacheAdapter = useMemo(
		() => ({
			get: (accountId) => getConversationsCache(accountId),
			set: (accountId, data) => setConversationsCache(accountId, data),
			delete: (accountId) => removeConversationsCache(accountId),
		}),
		[getConversationsCache, setConversationsCache, removeConversationsCache],
	);

	const messagesCacheAdapter = useMemo(
		() => ({
			get: (conversationId) => getMessagesCache(conversationId),
			set: (conversationId, data) => setMessagesCache(conversationId, data),
			delete: (conversationId) => {
				if (!conversationId) return;
				queryClient.removeQueries({ queryKey: whatsappKeys.messages(conversationId) });
			},
			clear: () => clearMessagesCache(),
		}),
		[getMessagesCache, setMessagesCache, clearMessagesCache, queryClient],
	);

	return useMemo(
		() => ({
			queryClient,
			staleTime: WHATSAPP_STALE_TIME,
			getConversationsCache,
			setConversationsCache,
			invalidateConversations,
			removeConversationsCache,
			resetConversationsCache,
			getMessagesCache,
			setMessagesCache,
			invalidateMessages,
			clearMessagesCache,
			prefetchMessages,
			conversationsCacheAdapter,
			messagesCacheAdapter,
			fetchConversations,
			fetchMessages,
		}),
		[
			queryClient,
			getConversationsCache,
			setConversationsCache,
			invalidateConversations,
			removeConversationsCache,
			resetConversationsCache,
			getMessagesCache,
			setMessagesCache,
			invalidateMessages,
			clearMessagesCache,
			prefetchMessages,
			conversationsCacheAdapter,
			messagesCacheAdapter,
		],
	);
}

export function useWhatsAppConversationsQuery(accountId, params = {}, options = {}) {
	return useQuery({
		queryKey: whatsappKeys.conversations(accountId, params),
		queryFn: () => fetchConversations(accountId, params),
		enabled: Boolean(accountId) && options.enabled !== false,
		staleTime: WHATSAPP_STALE_TIME,
		...options,
	});
}

export function useWhatsAppMessagesQuery(conversationId, options = {}) {
	const limit = options.limit || 30;
	return useQuery({
		queryKey: whatsappKeys.messages(conversationId),
		queryFn: async () => {
			const items = await fetchMessages(conversationId, { limit });
			return {
				items,
				hasMore: items.length >= limit,
				cachedAt: Date.now(),
			};
		},
		enabled: Boolean(conversationId) && options.enabled !== false,
		staleTime: WHATSAPP_STALE_TIME,
		...options,
	});
}
