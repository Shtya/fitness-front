import { DEFAULT_PARTICLE_CONFIG } from './particle-config';

export const SESSION_LS_KEY = 'particle-studio:active-session-id';
export const SESSION_DRAFT_LS_KEY = 'particle-studio:draft';

export function createSessionId() {
	return `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createBlankSession(name = 'Untitled Session', configOverride = null) {
	const now = new Date().toISOString();
	return {
		id: createSessionId(),
		name,
		createdAt: now,
		updatedAt: now,
		selectedId: null,
		assets: [],
		config: { ...DEFAULT_PARTICLE_CONFIG, ...(configOverride || {}) },
		morphTargets: [],
		timeline: {
			playing: false,
			currentIndex: 0,
			progress: 0,
		},
		history: [
			{
				at: now,
				type: 'created',
				message: 'Session created',
			},
		],
	};
}

export function serializeSession({
	id,
	name,
	createdAt,
	selectedId,
	assets = [],
	config,
	morphTargets = [],
	timeline,
	history = [],
}) {
	return {
		id,
		name,
		createdAt: createdAt || new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		selectedId: selectedId || null,
		assets: assets.map(({ objectUrl, ...rest }) => rest),
		config: { ...DEFAULT_PARTICLE_CONFIG, ...(config || {}) },
		morphTargets: morphTargets.map(({ sample, ...rest }) => rest),
		timeline: {
			playing: false,
			currentIndex: timeline?.currentIndex || 0,
			progress: timeline?.progress || 0,
		},
		history: Array.isArray(history) ? history.slice(-80) : [],
	};
}

export function pushHistory(history = [], type, message, extra = {}) {
	return [
		...history,
		{
			at: new Date().toISOString(),
			type,
			message,
			...extra,
		},
	].slice(-80);
}

export function formatSessionTime(iso) {
	if (!iso) return '';
	try {
		return new Date(iso).toLocaleString();
	} catch {
		return iso;
	}
}
