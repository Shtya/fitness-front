/*
 * Practice loop for the day's YouTube video: play one part (from → to) N times, then stop.
 * Pure helpers here; the player wiring lives in VideoLoop.jsx.
 */

/**
 * "5" → 300 (a bare number means minutes), "5:30" → 330, "1:02:03" → 3723, "90s" → 90, "2m" → 120.
 * Empty or unreadable → null.
 */
export function parseClock(v) {
	const s = String(v ?? '')
		.trim()
		.replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x660))
		.replace(/[：٫]/g, ':');
	if (!s) return null;
	let m = s.match(/^(\d+(?:\.\d+)?)\s*(s|sec|m|min|h)?$/i);
	if (m) {
		const n = Number(m[1]);
		const unit = (m[2] || 'm').toLowerCase();
		return Math.round(unit.startsWith('s') ? n : unit === 'h' ? n * 3600 : n * 60);
	}
	m = s.match(/^(\d+):([0-5]?\d)(?::([0-5]?\d))?$/);
	if (!m) return null;
	return m[3] == null ? Number(m[1]) * 60 + Number(m[2]) : Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

/** 330 → "5:30", 3723 → "1:02:03". */
export function fmtClock(sec) {
	const t = Math.max(0, Math.round(sec || 0));
	const h = Math.floor(t / 3600);
	const m = Math.floor((t % 3600) / 60);
	const s = String(t % 60).padStart(2, '0');
	return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

export const MAX_REPS = 20;
/** Longest piece when playing the part piece by piece (seconds). */
export const MAX_STEP = 600;

/** A piece length: a bare number means seconds here ("2" → 2s, "1m" → 60, "0:30" → 30). */
export function parseStep(v) {
	const s = String(v ?? '').trim();
	if (!s || /^(0|none|-)$/i.test(s)) return 0;
	if (/^\d+(\.\d+)?$/.test(s)) return Math.min(MAX_STEP, Math.round(Number(s)));
	const t = parseClock(s);
	return t == null ? null : Math.min(MAX_STEP, t);
}

/** Keep a loop sane: from < to, inside the video, reps 0 (= no limit) … MAX_REPS. */
export function cleanLoop({ from, to, reps, step } = {}, duration = 0) {
	let a = Math.max(0, Math.round(Number(from) || 0));
	let b = Math.round(Number(to) || 0);
	if (duration > 0) {
		a = Math.min(a, Math.max(0, Math.floor(duration) - 1));
		b = Math.min(b || duration, Math.floor(duration));
	}
	if (!(b > a)) b = a + 300;
	if (duration > 0) b = Math.min(b, Math.floor(duration));
	const r = Math.round(Number(reps));
	const st = Math.round(Number(step) || 0);
	return { from: a, to: b, reps: Number.isFinite(r) ? Math.min(MAX_REPS, Math.max(0, r)) : 1, step: Math.min(MAX_STEP, Math.max(0, st)) };
}

/** The part right after this one, the same length (stops at the end of the video). */
export function nextPart({ from, to, reps, step }, duration = 0) {
	const len = Math.max(1, to - from);
	if (duration > 0 && to >= Math.floor(duration) - 1) return null;
	return cleanLoop({ from: to, to: to + len, reps, step }, duration);
}

/** A part of `minutes` starting at `t` (the current time). */
export function partFrom(t, minutes, reps, duration = 0) {
	return cleanLoop({ from: Math.floor(t), to: Math.floor(t) + minutes * 60, reps }, duration);
}

/** Drag a handle: it settles on the nearest whole minute (or the very end of the video). */
export function snapMinute(t, duration) {
	const end = Math.max(0, Math.floor(duration || 0));
	const m = Math.round(Math.max(0, t) / 60) * 60;
	if (end && (m > end || end - t < Math.min(30, end - m))) return end;
	return m;
}

/** Minute marks for the timeline: every minute for short videos, wider apart for long ones. */
export function minuteTicks(duration) {
	const d = Math.max(60, Math.floor(duration || 0));
	const step = d <= 20 * 60 ? 60 : d <= 45 * 60 ? 120 : d <= 90 * 60 ? 300 : 600;
	const label = step * (d / step > 12 ? Math.ceil(d / step / 8) : 1);
	const out = [];
	for (let t = 0; t <= d; t += step) out.push({ t, label: t % label === 0 });
	return out;
}

/**
 * One poll of the running loop.
 * `t` is the player's current time; `round` starts at 1.
 * → { do: 'none' } | { do: 'seek', round } (start the next round) | { do: 'stop' } (all rounds heard)
 */
export function loopTick({ from, to, reps, round }, t) {
	// The YouTube player reports time in coarse steps, so treat "almost at the end" as the end.
	if (t < to - 0.3) return { do: 'none' };
	if (reps === 0 || round < reps) return { do: 'seek', round: round + 1 };
	return { do: 'stop' };
}

/** 0…1: how far through the whole session (all rounds) we are. */
export function loopProgress({ from, to, reps, round }, t) {
	const len = Math.max(1, to - from);
	const inRound = Math.min(1, Math.max(0, (t - from) / len));
	if (!reps) return inRound;
	return Math.min(1, (round - 1 + inRound) / reps);
}

const KEY = id => `wa-learn:yt-loop:${id}`;

export function readLoop(id) {
	try {
		const v = JSON.parse(window.localStorage.getItem(KEY(id)) || 'null');
		return v && typeof v === 'object' ? cleanLoop(v) : null;
	} catch {
		return null;
	}
}

export function saveLoop(id, loop) {
	try {
		window.localStorage.setItem(KEY(id), JSON.stringify({ from: loop.from, to: loop.to, reps: loop.reps, step: loop.step || 0 }));
	} catch {
		/* private mode */
	}
}

/* ─── piece by piece: split the part into pieces of `step` seconds, hear each one N times ─── */

/** How many pieces the part has (1 when playing the whole part). */
export function pieceCount({ from, to, step }) {
	return step > 0 ? Math.max(1, Math.ceil((to - from) / step)) : 1;
}

/** Start / end of piece number `seg` (0-based). */
export function pieceOf({ from, to, step }, seg = 0) {
	if (!(step > 0)) return { a: from, b: to };
	const a = Math.min(to, from + seg * step);
	return { a, b: Math.min(to, a + step) };
}

/**
 * One poll of the running loop (whole part, or piece by piece).
 * → { do: 'none' } | { do: 'seek', at, round, seg } (again, or the next piece) | { do: 'stop' }
 */
export function pieceTick(l, t) {
	const { reps, round, seg = 0 } = l;
	const { a, b } = pieceOf(l, seg);
	if (t < b - 0.25) return { do: 'none' };
	if (reps === 0 || round < reps) return { do: 'seek', at: a, round: round + 1, seg };
	if (seg + 1 < pieceCount(l)) return { do: 'seek', at: pieceOf(l, seg + 1).a, round: 1, seg: seg + 1 };
	return { do: 'stop' };
}

/** 0…1 across every piece and round. */
export function pieceProgress(l, t) {
	const { reps, round, seg = 0 } = l;
	const { a, b } = pieceOf(l, seg);
	const inPiece = Math.min(1, Math.max(0, (t - a) / Math.max(0.5, b - a)));
	const n = pieceCount(l);
	if (!reps) return Math.min(1, (seg + inPiece) / n);
	return Math.min(1, (seg * reps + (round - 1) + inPiece) / (n * reps));
}
