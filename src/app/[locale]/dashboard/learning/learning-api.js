import api from '@/utils/axios';

export const learningApi = {
	getState: async () => {
		const { data } = await api.get('/learning/state');
		return data;
	},
	saveState: async state => {
		const { data } = await api.put('/learning/state', state);
		return data;
	},
	ai: async payload => {
		const { data } = await api.post('/learning/ai', payload, { timeout: 120000 });
		return data;
	},
	fetchUrl: async url => {
		const { data } = await api.post('/learning/fetch-url', { url }, { timeout: 30000 });
		return data;
	},
	importUrl: async payload => {
		const { data } = await api.post('/learning/import-url', payload, { timeout: 600000 });
		return data;
	},
	roadmapTopic: async payload => {
		const { data } = await api.post('/learning/roadmap-topic', payload, { timeout: 30000 });
		return data;
	},
	searchRoadmaps: async payload => {
		const { data } = await api.post('/learning/search-roadmaps', payload, { timeout: 180000 });
		return data;
	},
	officialRoadmaps: async () => {
		const { data } = await api.get('/learning/official-roadmaps', { timeout: 30000 });
		return data;
	},
	videoTranscript: async url => {
		const { data } = await api.post('/learning/video-transcript', { url }, { timeout: 60000 });
		return data;
	},
	translate: async payload => {
		const { data } = await api.post('/learning/translate', payload, { timeout: 300000 });
		return data;
	},
};
