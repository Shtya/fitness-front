import api from '@/utils/axios';

const emptyState = () => ({
	folders: [],
	favorites: [],
	history: [],
	wordErrors: {},
	activeSession: null,
});

export async function fetchQuranRevisionState() {
	const { data } = await api.get('/quran-revision/state');
	return normalizeCloudState(data);
}

export async function putQuranRevisionState(patch) {
	const { data } = await api.put('/quran-revision/state', patch || {});
	return normalizeCloudState(data);
}

export async function importQuranRevisionState(payload) {
	const { data } = await api.post('/quran-revision/import', payload || {});
	return normalizeCloudState(data);
}

function normalizeCloudState(raw) {
	if (!raw || typeof raw !== 'object') return emptyState();
	return {
		folders: Array.isArray(raw.folders) ? raw.folders : [],
		favorites: Array.isArray(raw.favorites) ? raw.favorites : [],
		history: Array.isArray(raw.history) ? raw.history : [],
		wordErrors:
			raw.wordErrors && typeof raw.wordErrors === 'object' && !Array.isArray(raw.wordErrors)
				? raw.wordErrors
				: {},
		activeSession:
			raw.activeSession && typeof raw.activeSession === 'object'
				? raw.activeSession
				: null,
		updatedAt: raw.updatedAt || null,
		imported: Boolean(raw.imported),
		merged: Boolean(raw.merged),
	};
}

export function cloudStateIsEmpty(state) {
	if (!state) return true;
	return (
		!(state.folders?.length)
		&& !(state.favorites?.length)
		&& !(state.history?.length)
		&& !Object.keys(state.wordErrors || {}).length
		&& !state.activeSession
	);
}

/** Debounced PUT helper (one timer per key). */
export function createDebouncedPutter(delayMs = 700) {
	const timers = new Map();
	const pending = new Map();

	return {
		schedule(key, patchBuilder) {
			pending.set(key, patchBuilder);
			if (timers.has(key)) clearTimeout(timers.get(key));
			timers.set(
				key,
				setTimeout(async () => {
					timers.delete(key);
					const builder = pending.get(key);
					pending.delete(key);
					if (!builder) return;
					try {
						const patch = typeof builder === 'function' ? builder() : builder;
						await putQuranRevisionState(patch);
					} catch {
						/* offline / auth — LS cache remains */
					}
				}, delayMs),
			);
		},
		flush() {
			timers.forEach((t) => clearTimeout(t));
			timers.clear();
			const jobs = [...pending.entries()];
			pending.clear();
			return Promise.all(
				jobs.map(async ([, builder]) => {
					try {
						const patch = typeof builder === 'function' ? builder() : builder;
						await putQuranRevisionState(patch);
					} catch {
						/* ignore */
					}
				}),
			);
		},
	};
}
