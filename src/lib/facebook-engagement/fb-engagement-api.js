import api from '@/utils/axios';

const BASE = '/facebook-engagement';
const data = (promise) => promise.then((res) => res.data);

export const fbEngagementApi = {
	overview: (signal) => data(api.get(`${BASE}/overview`, { signal })),
	config: (signal) => data(api.get(`${BASE}/config`, { signal })),

	oauthUrl: (locale, signal) =>
		data(
			api.get(`${BASE}/oauth/url`, {
				params: {
					locale,
					returnOrigin: typeof window !== 'undefined' ? window.location.origin : undefined,
					popup: '1',
				},
				signal,
			}),
		),
	completeOAuth: (claim) => data(api.post(`${BASE}/oauth/complete`, { claim }, { timeout: 60000 })),

	connections: (signal) => data(api.get(`${BASE}/connections`, { signal })),
	connectWithToken: (accessToken) =>
		data(api.post(`${BASE}/connections/token`, { accessToken }, { timeout: 60000 })),
	syncConnection: (id) => data(api.post(`${BASE}/connections/${id}/sync`, {}, { timeout: 60000 })),
	disconnect: (id) => data(api.delete(`${BASE}/connections/${id}`)),

	accounts: (signal) => data(api.get(`${BASE}/accounts`, { signal })),
	pagePosts: (accountId, after, signal) =>
		data(api.get(`${BASE}/accounts/${accountId}/posts`, { params: { after }, signal, timeout: 45000 })),

	resolvePost: (body) => data(api.post(`${BASE}/posts/resolve`, body, { timeout: 60000 })),
	refreshPost: (id) => data(api.post(`${BASE}/posts/${id}/refresh`, {}, { timeout: 45000 })),

	campaigns: (params, signal) => data(api.get(`${BASE}/campaigns`, { params, signal })),
	campaign: (id, signal) => data(api.get(`${BASE}/campaigns/${id}`, { signal })),
	createCampaign: (body) => data(api.post(`${BASE}/campaigns`, body)),
	updateCampaign: (id, body) => data(api.patch(`${BASE}/campaigns/${id}`, body)),
	deleteCampaign: (id) => data(api.delete(`${BASE}/campaigns/${id}`)),
	duplicateCampaign: (id) => data(api.post(`${BASE}/campaigns/${id}/duplicate`, {})),
	publishCampaign: (id, commentIds) => data(api.post(`${BASE}/campaigns/${id}/publish`, { commentIds })),
	retryFailed: (id, commentIds) => data(api.post(`${BASE}/campaigns/${id}/retry-failed`, { commentIds })),
	cancelCampaign: (id) => data(api.post(`${BASE}/campaigns/${id}/cancel`, {})),

	comments: (params, signal) => data(api.get(`${BASE}/comments`, { params, signal })),
	addComment: (campaignId, body) => data(api.post(`${BASE}/campaigns/${campaignId}/comments`, body)),
	bulkAddComments: (campaignId, body) => data(api.post(`${BASE}/campaigns/${campaignId}/comments/bulk`, body)),
	reorderComments: (campaignId, ids) => data(api.put(`${BASE}/campaigns/${campaignId}/comments/order`, { ids })),
	updateComment: (id, body) => data(api.patch(`${BASE}/comments/${id}`, body)),
	duplicateComment: (id) => data(api.post(`${BASE}/comments/${id}/duplicate`, {})),
	deleteComment: (id) => data(api.delete(`${BASE}/comments/${id}`)),
	bulkDeleteComments: (ids) => data(api.post(`${BASE}/comments/bulk-delete`, { ids })),
	bulkUpdateComments: (body) => data(api.post(`${BASE}/comments/bulk-update`, body)),
	bulkRetryComments: (ids) => data(api.post(`${BASE}/comments/bulk-retry`, { ids })),

	activity: (params, signal) => data(api.get(`${BASE}/activity`, { params, signal })),
};

export function apiErrorMessage(error, fallback = 'Request failed') {
	const message = error?.response?.data?.message;
	if (Array.isArray(message)) return message.join(', ');
	return message || error?.message || fallback;
}
