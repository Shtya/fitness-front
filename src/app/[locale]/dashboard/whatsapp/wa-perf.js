/**
 * Opt-in navigation timing for real devices: `localStorage.setItem('wa:perf', '1')`.
 * Measures tap → first frame painted after React commits. Logs durations only,
 * never message or contact data. Results also land on `window.__waPerf`.
 */
const PERF_FLAG_KEY = 'wa:perf';
const MAX_SAMPLES = 200;

export function waPerfEnabled() {
	if (typeof window === 'undefined') return false;
	try {
		return window.localStorage.getItem(PERF_FLAG_KEY) === '1';
	} catch {
		return false;
	}
}

export function waPerfMark(label) {
	if (!waPerfEnabled()) return;
	const startedAt = performance.now();
	// rAF fires before the next paint; the macrotask after it runs once that
	// frame is on screen, which is what the user perceives.
	window.requestAnimationFrame(() => {
		window.setTimeout(() => {
			const ms = Math.round(performance.now() - startedAt);
			const samples = (window.__waPerf = window.__waPerf || []);
			samples.push({ label, ms, at: Date.now() });
			if (samples.length > MAX_SAMPLES) samples.splice(0, samples.length - MAX_SAMPLES);
			console.info(`[wa-perf] ${label}: ${ms}ms`);
		}, 0);
	});
}
