import api from '@/utils/axios';

export const fitnessLeadsApi = {
	options(signal) {
		return api.get('/fitness-leads/options', { signal }).then(r => r.data);
	},
	credentials(signal) {
		return api.get('/fitness-leads/credentials', { signal }).then(r => r.data);
	},
	saveCredential(provider, fields, signal) {
		return api
			.put(`/fitness-leads/providers/${provider}/credential`, { fields }, { signal })
			.then(r => r.data);
	},
	removeCredential(provider, signal) {
		return api
			.delete(`/fitness-leads/providers/${provider}/credential`, { signal })
			.then(r => r.data);
	},
	listJobs(signal) {
		return api.get('/fitness-leads/jobs', { signal }).then(r => r.data);
	},
	startJob(payload, signal) {
		return api.post('/fitness-leads/jobs', payload, { signal, timeout: 30000 }).then(r => r.data);
	},
	getJob(jobId, signal) {
		return api.get(`/fitness-leads/jobs/${jobId}`, { signal, timeout: 20000 }).then(r => r.data);
	},
	listLeads(jobId, signal) {
		return api
			.get('/fitness-leads/leads', { params: jobId ? { jobId } : {}, signal })
			.then(r => r.data);
	},
	suggestKeywords(payload, signal) {
		return api
			.post('/fitness-leads/suggest-keywords', payload, { signal, timeout: 90000 })
			.then(r => r.data);
	},
};
