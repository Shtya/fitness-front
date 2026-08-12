import { DEFAULT_PARTICLE_CONFIG } from './particle-config';

export const SETTINGS_LS_KEY = 'particle-studio:preferred-settings';

export function loadPreferredSettings() {
	if (typeof window === 'undefined') return { ...DEFAULT_PARTICLE_CONFIG };
	try {
		const raw = localStorage.getItem(SETTINGS_LS_KEY);
		if (!raw) return { ...DEFAULT_PARTICLE_CONFIG };
		const parsed = JSON.parse(raw);
		return { ...DEFAULT_PARTICLE_CONFIG, ...(parsed || {}) };
	} catch {
		return { ...DEFAULT_PARTICLE_CONFIG };
	}
}

export function savePreferredSettings(config) {
	if (typeof window === 'undefined') return;
	try {
		const payload = {
			...DEFAULT_PARTICLE_CONFIG,
			...(config || {}),
			savedAt: new Date().toISOString(),
		};
		localStorage.setItem(SETTINGS_LS_KEY, JSON.stringify(payload));
	} catch {
		/* ignore quota / private mode */
	}
}

export function clearPreferredSettings() {
	if (typeof window === 'undefined') return;
	try {
		localStorage.removeItem(SETTINGS_LS_KEY);
	} catch {
		/* ignore */
	}
}
