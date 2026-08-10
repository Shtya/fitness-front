/**
 * Singleton Quran audio player that survives route changes.
 * Studio hands off playback when leaving /dashboard/quran-revision.
 */

import { BUILTIN_RECITERS, ayahAudioUrl } from '@/app/[locale]/dashboard/quran-revision/quran-data';

const listeners = new Set();

const state = {
	active: false,
	playing: false,
	hidden: false,
	studioMounted: false,
	surahId: null,
	surahNameAr: '',
	surahNameEn: '',
	ayahN: null,
	verseIndex: 0,
	verseRepeat: 1,
	completedRepeats: 0,
	repeatCount: 3,
	repeatScope: 'selection',
	reciterId: 'minshawi',
	volume: 0.9,
	muted: false,
	verses: [],
};

let audioEl = null;
let lastHandoffAt = 0;

/** Cached for useSyncExternalStore — must return the same reference until state changes. */
let cachedSnapshot = null;

function rebuildSnapshot() {
	const rec = getReciter();
	cachedSnapshot = {
		...state,
		reciterNameAr: rec?.nameAr || '',
		reciterNameEn: rec?.nameEn || '',
		reciters: BUILTIN_RECITERS,
	};
	return cachedSnapshot;
}

function notify() {
	const snap = rebuildSnapshot();
	listeners.forEach(fn => {
		try { fn(snap); } catch { /* ignore */ }
	});
}

function getAudio() {
	if (typeof window === 'undefined') return null;
	if (!audioEl) {
		audioEl = new Audio();
		audioEl.preload = 'none';
		audioEl.addEventListener('play', () => {
			state.playing = true;
			notify();
		});
		audioEl.addEventListener('pause', () => {
			state.playing = false;
			notify();
		});
		audioEl.addEventListener('ended', () => {
			advanceAfterEnded();
		});
	}
	return audioEl;
}

function getReciter(id = state.reciterId) {
	return BUILTIN_RECITERS.find(r => r.id === id) || BUILTIN_RECITERS[0];
}

function playAt(verseIndex, verseRepeat = 1, completedRepeats = 0, { autoplay = true } = {}) {
	const el = getAudio();
	const vs = state.verses;
	if (!el || !vs[verseIndex] || !state.surahId) return;

	const ayah = vs[verseIndex];
	const rec = getReciter();
	const url = ayahAudioUrl(rec.folder, state.surahId, ayah.n);

	state.verseIndex = verseIndex;
	state.verseRepeat = verseRepeat;
	state.completedRepeats = completedRepeats;
	state.ayahN = ayah.n;
	state.active = true;

	el.pause();
	el.src = url;
	el.volume = state.muted ? 0 : state.volume;
	el.load();

	if (autoplay) {
		const p = el.play();
		if (p?.catch) p.catch(() => { state.playing = false; notify(); });
		state.playing = true;
	} else {
		state.playing = false;
	}
	notify();
}

function advanceAfterEnded() {
	if (state.studioMounted) {
		// Studio owns sequencing while mounted — just notify pause-like end
		state.playing = false;
		notify();
		return;
	}

	const vs = state.verses;
	const total = vs.length;
	const verseIndex = state.verseIndex;
	const verseRepeat = state.verseRepeat;
	const reps = state.repeatCount;
	const scope = state.repeatScope;
	const nextRepeats = state.completedRepeats + 1;

	if (scope === 'selection') {
		const nextIndex = verseIndex + 1;
		if (nextIndex < total) {
			playAt(nextIndex, verseRepeat, nextRepeats);
			return;
		}
		if (verseRepeat < reps) {
			playAt(0, verseRepeat + 1, nextRepeats);
			return;
		}
		stop();
		return;
	}

	if (verseRepeat < reps) {
		playAt(verseIndex, verseRepeat + 1, nextRepeats);
		return;
	}
	const nextIndex = verseIndex + 1;
	if (nextIndex < total) {
		playAt(nextIndex, 1, nextRepeats);
		return;
	}
	stop();
}

export function getSnapshot() {
	// Returning a fresh object every call makes React think the store changed on
	// every render → infinite loop → minified React error #185.
	if (!cachedSnapshot) rebuildSnapshot();
	return cachedSnapshot;
}

export function subscribe(fn) {
	listeners.add(fn);
	return () => listeners.delete(fn);
}

/** Studio mounts — mini bar should hide while on the page. */
export function setStudioMounted(mounted) {
	state.studioMounted = !!mounted;
	if (mounted) state.hidden = false;
	notify();
}

/**
 * Sync / hand off current session playback to the background player.
 * Call from studio whenever builtin audio starts (and on unmount while playing).
 */
export function syncSession({
	surahId,
	surahNameAr,
	surahNameEn,
	verses,
	verseIndex = 0,
	verseRepeat = 1,
	completedRepeats = 0,
	repeatCount = 3,
	repeatScope = 'selection',
	reciterId,
	volume,
	muted,
	playing,
} = {}) {
	if (surahId != null) state.surahId = surahId;
	if (surahNameAr != null) state.surahNameAr = surahNameAr;
	if (surahNameEn != null) state.surahNameEn = surahNameEn;
	if (Array.isArray(verses)) state.verses = verses;
	if (reciterId) state.reciterId = reciterId;
	if (typeof volume === 'number') state.volume = volume;
	if (typeof muted === 'boolean') state.muted = muted;
	if (typeof repeatCount === 'number') state.repeatCount = repeatCount;
	if (repeatScope) state.repeatScope = repeatScope;

	state.verseIndex = verseIndex;
	state.verseRepeat = verseRepeat;
	state.completedRepeats = completedRepeats;
	state.ayahN = state.verses[verseIndex]?.n ?? null;
	state.active = true;

	const el = getAudio();
	if (el) {
		el.volume = state.muted ? 0 : state.volume;
		// If studio already set src on its element, we may need to adopt.
		// Prefer continuing current src if same ayah url.
		const rec = getReciter();
		const ayah = state.verses[verseIndex];
		if (ayah && state.surahId) {
			const url = ayahAudioUrl(rec.folder, state.surahId, ayah.n);
			// Must include folder — same ayah digits with a different reciter is not "same".
			const same = Boolean(el.src && url && el.src.includes(`/${rec.folder}/`)
				&& el.src.includes(`${String(state.surahId).padStart(3, '0')}${String(ayah.n).padStart(3, '0')}`));
			if (!same || el.paused) {
				if (playing) playAt(verseIndex, verseRepeat, completedRepeats, { autoplay: true });
				else {
					el.src = url;
					state.playing = false;
				}
			} else {
				state.playing = !el.paused;
			}
		}
	}
	notify();
}

/**
 * Copy playing studio <audio> into the singleton so React can unmount safely.
 */
export function handoffFromStudio(el, meta = {}) {
	if (!el?.src) return false;
	const wasPlaying = !el.paused;
	const currentTime = el.currentTime || 0;
	const src = el.currentSrc || el.src;
	const vol = el.volume;

	Object.assign(state, {
		active: true,
		surahId: meta.surahId ?? state.surahId,
		surahNameAr: meta.surahNameAr ?? state.surahNameAr,
		surahNameEn: meta.surahNameEn ?? state.surahNameEn,
		verses: meta.verses ?? state.verses,
		verseIndex: meta.verseIndex ?? state.verseIndex,
		verseRepeat: meta.verseRepeat ?? state.verseRepeat,
		completedRepeats: meta.completedRepeats ?? state.completedRepeats,
		repeatCount: meta.repeatCount ?? state.repeatCount,
		repeatScope: meta.repeatScope ?? state.repeatScope,
		reciterId: meta.reciterId ?? state.reciterId,
		volume: typeof meta.volume === 'number' ? meta.volume : (vol ?? state.volume),
		muted: meta.muted ?? state.muted,
		ayahN: meta.ayahN ?? state.verses?.[meta.verseIndex ?? state.verseIndex]?.n ?? state.ayahN,
		studioMounted: false,
		hidden: false,
	});

	el.onended = null;
	el.ontimeupdate = null;
	el.onloadedmetadata = null;
	el.onerror = null;
	el.oncanplay = null;
	try { el.pause(); } catch { /* */ }

	const shared = getAudio();
	shared.src = src;
	shared.volume = state.muted ? 0 : state.volume;
	const resume = () => {
		try { if (currentTime > 0) shared.currentTime = currentTime; } catch { /* */ }
		if (wasPlaying) {
			shared.play()?.catch?.(() => { state.playing = false; notify(); });
			state.playing = true;
		} else {
			state.playing = false;
		}
		notify();
	};
	if (shared.readyState >= 1) resume();
	else shared.addEventListener('loadedmetadata', resume, { once: true });
	lastHandoffAt = Date.now();
	notify();
	return true;
}

/** Stop bg when returning to the studio (skip React StrictMode remount right after handoff). */
export function reclaimIfStale(ms = 800) {
	if (!state.active) return;
	if (Date.now() - lastHandoffAt < ms) return;
	stop();
}

export function togglePlay() {
	const el = getAudio();
	if (!el || !state.active) return;
	if (el.paused) {
		el.play()?.catch?.(() => {});
		state.playing = true;
	} else {
		el.pause();
		state.playing = false;
	}
	notify();
}

export function stop() {
	const el = getAudio();
	if (el) {
		el.onended = null;
		try { el.pause(); } catch { /* */ }
		el.removeAttribute('src');
		try { el.load(); } catch { /* */ }
	}
	state.active = false;
	state.playing = false;
	state.hidden = false;
	state.verses = [];
	notify();
}

export function setHidden(hidden) {
	state.hidden = !!hidden;
	notify();
}

export function setVolume(v) {
	state.volume = Math.min(1, Math.max(0, Number(v) || 0));
	const el = getAudio();
	if (el && !state.muted) el.volume = state.volume;
	notify();
}

export function setMuted(muted) {
	state.muted = !!muted;
	const el = getAudio();
	if (el) el.volume = state.muted ? 0 : state.volume;
	notify();
}

export function setReciter(reciterId) {
	if (!reciterId || reciterId === state.reciterId) return;
	state.reciterId = reciterId;
	const wasPlaying = state.playing;
	const el = getAudio();
	const ratio = el?.duration > 0 ? el.currentTime / el.duration : 0;
	playAt(state.verseIndex, state.verseRepeat, state.completedRepeats, { autoplay: wasPlaying });
	if (el && ratio > 0.02 && ratio < 0.98) {
		const onMeta = () => {
			try { if (el.duration) el.currentTime = el.duration * ratio; } catch { /* */ }
			el.removeEventListener('loadedmetadata', onMeta);
		};
		el.addEventListener('loadedmetadata', onMeta);
	}
	notify();
}

export function getSharedAudioElement() {
	return getAudio();
}
