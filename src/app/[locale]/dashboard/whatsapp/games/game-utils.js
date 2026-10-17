/** Small helpers shared by the idle-pane games. */

const BEST_KEY = 'wa-games:best';

export function loadBest(game) {
	if (typeof window === 'undefined') return 0;
	try {
		const all = JSON.parse(window.localStorage.getItem(BEST_KEY) || '{}');
		return Number(all?.[game]) || 0;
	} catch {
		return 0;
	}
}

/** Saves `score` if it beats the stored best (or, with `lowerIsBetter`, if it is lower). Returns the best. */
export function saveBest(game, score, { lowerIsBetter = false } = {}) {
	if (typeof window === 'undefined') return score;
	try {
		const all = JSON.parse(window.localStorage.getItem(BEST_KEY) || '{}');
		const prev = Number(all?.[game]) || 0;
		const better = !prev || (lowerIsBetter ? score < prev : score > prev);
		if (better) {
			all[game] = score;
			window.localStorage.setItem(BEST_KEY, JSON.stringify(all));
			return score;
		}
		return prev;
	} catch {
		return score;
	}
}

/** Typing in a field (search, composer) must never steer a game. */
export function isTypingTarget(target) {
	const el = target;
	if (!el || typeof el.closest !== 'function') return false;
	return Boolean(el.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]'));
}

/** Swipe direction from a pointer gesture, or null if it was a tap. */
export function swipeDirection(dx, dy, threshold = 24) {
	if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return null;
	if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
	return dy > 0 ? 'down' : 'up';
}

export const KEY_DIRECTIONS = {
	ArrowUp: 'up',
	ArrowDown: 'down',
	ArrowLeft: 'left',
	ArrowRight: 'right',
	w: 'up',
	s: 'down',
	a: 'left',
	d: 'right',
	W: 'up',
	S: 'down',
	A: 'left',
	D: 'right',
};
