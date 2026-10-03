'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiErrorMessage, fbEngagementApi } from '@/lib/facebook-engagement/fb-engagement-api';

const ROOT = 'fb-engagement';
const ACTIVE_CAMPAIGN = new Set(['queued', 'processing']);
const LIVE_REFRESH_MS = 4000;

export const fbKeys = {
	root: [ROOT],
	overview: [ROOT, 'overview'],
	config: [ROOT, 'config'],
	accounts: [ROOT, 'accounts'],
	connections: [ROOT, 'connections'],
	campaigns: (params) => [ROOT, 'campaigns', params],
	campaign: (id) => [ROOT, 'campaign', id],
	comments: (params) => [ROOT, 'comments', params],
	activity: (params) => [ROOT, 'activity', params],
	pagePosts: (accountId) => [ROOT, 'page-posts', accountId],
};

export const isActiveCampaign = (campaign) => ACTIVE_CAMPAIGN.has(campaign?.status);

export function useFbOverview() {
	return useQuery({
		queryKey: fbKeys.overview,
		queryFn: ({ signal }) => fbEngagementApi.overview(signal),
		refetchInterval: (query) => (query.state.data?.campaigns?.active ? LIVE_REFRESH_MS : false),
	});
}

export function useFbConfig() {
	return useQuery({ queryKey: fbKeys.config, queryFn: ({ signal }) => fbEngagementApi.config(signal), staleTime: 60_000 });
}

export function useFbAccounts() {
	return useQuery({ queryKey: fbKeys.accounts, queryFn: ({ signal }) => fbEngagementApi.accounts(signal) });
}

export function useFbConnections() {
	return useQuery({ queryKey: fbKeys.connections, queryFn: ({ signal }) => fbEngagementApi.connections(signal) });
}

export function useFbCampaigns(params) {
	return useQuery({
		queryKey: fbKeys.campaigns(params),
		queryFn: ({ signal }) => fbEngagementApi.campaigns(params, signal),
		placeholderData: (previous) => previous,
		refetchInterval: (query) => (query.state.data?.items?.some(isActiveCampaign) ? LIVE_REFRESH_MS : false),
	});
}

export function useFbCampaign(id) {
	return useQuery({
		queryKey: fbKeys.campaign(id),
		queryFn: ({ signal }) => fbEngagementApi.campaign(id, signal),
		enabled: Boolean(id),
		refetchInterval: (query) => (isActiveCampaign(query.state.data) ? LIVE_REFRESH_MS : false),
	});
}

const LIVE_COMMENT = new Set(['pending', 'processing']);

export function useFbComments(params) {
	return useQuery({
		queryKey: fbKeys.comments(params),
		queryFn: ({ signal }) => fbEngagementApi.comments(params, signal),
		placeholderData: (previous) => previous,
		refetchInterval: (query) =>
			query.state.data?.items?.some((row) => LIVE_COMMENT.has(row.status)) ? LIVE_REFRESH_MS : false,
	});
}

export function useFbActivity(params, { live = false } = {}) {
	return useQuery({
		queryKey: fbKeys.activity(params),
		queryFn: ({ signal }) => fbEngagementApi.activity(params, signal),
		placeholderData: (previous) => previous,
		refetchInterval: live ? LIVE_REFRESH_MS : false,
	});
}

export function useFbPagePosts(accountId) {
	return useInfiniteQuery({
		queryKey: fbKeys.pagePosts(accountId),
		queryFn: ({ pageParam, signal }) => fbEngagementApi.pagePosts(accountId, pageParam, signal),
		initialPageParam: undefined,
		getNextPageParam: (lastPage) => lastPage?.nextCursor || undefined,
		enabled: Boolean(accountId),
		retry: false,
	});
}

/** Every mutation refreshes the whole feature cache so counters, lists and progress stay consistent. */
export function useFbMutation(mutationFn, { success, onSuccess, silentError = false } = {}) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn,
		onSuccess: (data, variables) => {
			const message = typeof success === 'function' ? success(data, variables) : success;
			if (message) toast.success(message);
			onSuccess?.(data, variables);
			return queryClient.invalidateQueries({ queryKey: fbKeys.root });
		},
		onError: (error) => {
			if (!silentError) toast.error(apiErrorMessage(error));
		},
	});
}
