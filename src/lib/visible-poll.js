/**
 * Visibility-aware poller for badge counts and similar lightweight GETs.
 * - Interval ticks are skipped while the tab is hidden; one catch-up load runs on return.
 * - `request()` (events, focus) is debounced so bursts collapse into one request.
 * - Single-flight: a load never overlaps itself; a request during flight reruns once after it.
 */
export function createVisiblePoller({
	load,
	intervalMs,
	debounceMs = 1500,
	immediate = true,
	doc = typeof document === 'undefined' ? null : document,
	timers = globalThis,
}) {
	let intervalId = null;
	let debounceId = null;
	let inFlight = false;
	let rerun = false;
	let stale = false;
	let stopped = true;

	const isHidden = () => Boolean(doc && doc.visibilityState === 'hidden');

	async function run() {
		if (stopped) return;
		if (isHidden()) {
			stale = true;
			return;
		}
		if (inFlight) {
			rerun = true;
			return;
		}
		inFlight = true;
		stale = false;
		try {
			await load();
		} catch {
			/* loaders own their error handling; polling must keep going */
		} finally {
			inFlight = false;
			if (rerun && !stopped) {
				rerun = false;
				void run();
			}
		}
	}

	function request() {
		if (stopped) return;
		if (isHidden()) {
			stale = true;
			return;
		}
		if (debounceId) timers.clearTimeout(debounceId);
		debounceId = timers.setTimeout(() => {
			debounceId = null;
			void run();
		}, debounceMs);
	}

	function onVisibilityChange() {
		if (!isHidden() && stale) request();
	}

	function start() {
		if (!stopped) return;
		stopped = false;
		if (immediate) void run();
		intervalId = timers.setInterval(() => void run(), intervalMs);
		doc?.addEventListener?.('visibilitychange', onVisibilityChange);
	}

	function stop() {
		stopped = true;
		if (intervalId) timers.clearInterval(intervalId);
		if (debounceId) timers.clearTimeout(debounceId);
		intervalId = null;
		debounceId = null;
		doc?.removeEventListener?.('visibilitychange', onVisibilityChange);
	}

	return { start, stop, request, run };
}
