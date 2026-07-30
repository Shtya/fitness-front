import api from '@/utils/axios';

export const phoneIntelApi = {
	providers(signal) {
		return api.get('/phone-intelligence/providers', { signal }).then(r => r.data);
	},
	credentials(signal) {
		return api.get('/phone-intelligence/credentials', { signal }).then(r => r.data);
	},
	categories(signal) {
		return api.get('/phone-intelligence/categories', { signal }).then(r => r.data);
	},
	lookup(payload, signal) {
		return api
			.post('/phone-intelligence/lookup', payload, { signal, timeout: 90000 })
			.then(r => r.data);
	},
	startEnrich(payload, signal) {
		return api
			.post('/phone-intelligence/enrich', payload, { signal, timeout: 30000 })
			.then(r => r.data);
	},
	getEnrichJob(jobId, signal) {
		return api
			.get(`/phone-intelligence/enrich/${jobId}`, { signal, timeout: 20000 })
			.then(r => r.data);
	},
	createReport(payload, signal) {
		return api.post('/phone-intelligence/reports', payload, { signal }).then(r => r.data);
	},
	listReports(phone, countryCode, signal) {
		return api
			.get('/phone-intelligence/reports', {
				params: { phone, countryCode },
				signal,
			})
			.then(r => r.data);
	},
	saveCredential(provider, fields, signal) {
		return api
			.put(`/phone-intelligence/providers/${provider}/credential`, { fields }, { signal })
			.then(r => r.data);
	},
	removeCredential(provider, signal) {
		return api
			.delete(`/phone-intelligence/providers/${provider}/credential`, { signal })
			.then(r => r.data);
	},
	analyze(report, locale, signal) {
		return api
			.post(
				'/phone-intelligence/analyze',
				{ report, locale },
				{ signal, timeout: 120000 },
			)
			.then(r => r.data);
	},
	listSearchSites(signal) {
		return api.get('/phone-intelligence/search-sites', { signal }).then(r => r.data);
	},
	createSearchSite(payload, signal) {
		return api.post('/phone-intelligence/search-sites', payload, { signal }).then(r => r.data);
	},
	updateSearchSite(id, payload, signal) {
		return api
			.put(`/phone-intelligence/search-sites/${id}`, payload, { signal })
			.then(r => r.data);
	},
	removeSearchSite(id, signal) {
		return api.delete(`/phone-intelligence/search-sites/${id}`, { signal }).then(r => r.data);
	},
};
