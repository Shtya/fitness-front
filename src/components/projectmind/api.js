import api from '@/utils/axios';

/** Thin typed-by-convention client for /api/v1/projectmind/*. Every function returns response.data. */
const base = '/projectmind';
const p = (id) => `${base}/projects/${id}`;
const d = (r) => r.data;

export const pmApi = {
	meta: () => api.get(`${base}/meta`).then(d),
	aiStatus: () => api.get(`${base}/ai-status`).then(d),

	githubTokenStatus: () => api.get(`${base}/settings/github-token`).then(d),
	saveGithubToken: (token) => api.put(`${base}/settings/github-token`, { token }).then(d),
	removeGithubToken: () => api.delete(`${base}/settings/github-token`).then(d),

	listProjects: () => api.get(`${base}/projects`).then(d),
	getProject: (id) => api.get(p(id)).then(d),
	createProject: (body) => api.post(`${base}/projects`, body).then(d),
	deleteProject: (id) => api.delete(p(id)).then(d),
	importZip: (id, file, onProgress) => {
		const fd = new FormData();
		fd.append('file', file);
		return api
			.post(`${p(id)}/import`, fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 10 * 60 * 1000, onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0) })
			.then(d);
	},
	resync: (id, githubToken) => api.post(`${p(id)}/resync`, { githubToken }).then(d),
	dashboard: (id) => api.get(`${p(id)}/dashboard`).then(d),

	tree: (id) => api.get(`${p(id)}/tree`).then(d),
	file: (id, path) => api.get(`${p(id)}/file`, { params: { path } }).then(d),
	search: (id, q) => api.get(`${p(id)}/search`, { params: { q } }).then(d),

	ask: (id, body, signal) => api.post(`${p(id)}/ask`, body, { signal, timeout: 180000 }).then(d),
	conversations: (id) => api.get(`${p(id)}/conversations`).then(d),
	conversation: (id, cid) => api.get(`${p(id)}/conversations/${cid}`).then(d),
	deleteConversation: (id, cid) => api.delete(`${p(id)}/conversations/${cid}`).then(d),

	docs: (id) => api.get(`${p(id)}/docs`).then(d),
	docExport: (id) => api.get(`${p(id)}/docs-export`).then(d),
	docUpdate: (id, key, contentMd) => api.put(`${p(id)}/docs/${key}`, { contentMd }).then(d),
	docReset: (id, key) => api.post(`${p(id)}/docs/${key}/reset`).then(d),
	docAi: (id, key) => api.post(`${p(id)}/docs/ai/${key}`, {}, { timeout: 180000 }).then(d),

	gaps: (id, params) => api.get(`${p(id)}/gaps`, { params }).then(d),
	gapChecklist: (id) => api.get(`${p(id)}/gaps-checklist`).then(d),
	gapCreate: (id, body) => api.post(`${p(id)}/gaps`, body).then(d),
	gapUpdate: (id, gid, body) => api.patch(`${p(id)}/gaps/${gid}`, body).then(d),
	gapDelete: (id, gid) => api.delete(`${p(id)}/gaps/${gid}`).then(d),
	gapRescan: (id) => api.post(`${p(id)}/gaps-rescan`).then(d),

	meetings: (id) => api.get(`${p(id)}/meetings`).then(d),
	meetingCreate: (id, body) => api.post(`${p(id)}/meetings`, body).then(d),
	meeting: (id, mid) => api.get(`${p(id)}/meetings/${mid}`).then(d),
	meetingStatus: (id, mid, status) => api.patch(`${p(id)}/meetings/${mid}`, { status }).then(d),
	meetingDelete: (id, mid) => api.delete(`${p(id)}/meetings/${mid}`).then(d),
	meetingPrep: (id, mid) => api.post(`${p(id)}/meetings/${mid}/prep`, {}, { timeout: 180000 }).then(d),
	noteAdd: (id, mid, body) => api.post(`${p(id)}/meetings/${mid}/notes`, body).then(d),
	noteDelete: (id, mid, nid) => api.delete(`${p(id)}/meetings/${mid}/notes/${nid}`).then(d),

	simSessions: (id) => api.get(`${p(id)}/simulator/sessions`).then(d),
	simTrend: (id) => api.get(`${p(id)}/simulator/trend`).then(d),
	simStart: (id, body) => api.post(`${p(id)}/simulator/sessions`, body, { timeout: 180000 }).then(d),
	simGet: (id, sid) => api.get(`${p(id)}/simulator/sessions/${sid}`).then(d),
	simAnswer: (id, sid, answer) => api.post(`${p(id)}/simulator/sessions/${sid}/answer`, { answer }, { timeout: 180000 }).then(d),
};

/** Best human message from an axios error (never leaks stack traces). */
export function errorMessage(err, fallback = 'Something went wrong') {
	const m = err?.response?.data?.message;
	if (Array.isArray(m)) return m.join(', ');
	return (typeof m === 'string' && m) || (err?.code === 'ERR_CANCELED' ? 'Cancelled' : err?.message) || fallback;
}

export function errorCode(err) {
	return err?.response?.data?.code || null;
}

export function downloadText(filename, text, mime = 'text/markdown') {
	const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}
