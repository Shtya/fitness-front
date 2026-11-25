/**
 * Revision mode of the mushaf reader: the span to revise, how recitation steps through it
 * (each ayah N times, the whole span M rounds), and which words to hide when memorising.
 * Pure functions (no React) so node --test covers them.
 */

export const PER_AYAH_OPTIONS = [1, 2, 3, 5, 7, 10, 20];
export const ROUND_OPTIONS = [1, 2, 3, 5, 0]; // 0 = until stopped
export const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5];
export const HIDE_OPTIONS = ['none', 'first', 'middle', 'end', 'all'];

export const DEFAULT_REVISE = { from: null, to: null, perAyah: 3, rounds: 1, speed: 1, hide: 'none' };

const before = (x, y) => x.s < y.s || (x.s === y.s && x.a < y.a);

/** Every ayah from `from` to `to` (inclusive, either order), across surahs. */
export function ayahList(from, to, versesCountOf, max = 2000) {
	if (!from || !to) return [];
	let [start, end] = before(to, from) ? [to, from] : [from, to];
	const out = [];
	let s = start.s;
	let a = start.a;
	while (out.length < max) {
		out.push({ s, a });
		if (s === end.s && a === end.a) break;
		if (a < versesCountOf(s)) a += 1;
		else if (s < 114) {
			s += 1;
			a = 1;
		} else break;
	}
	return out;
}

/**
 * Next step after an ayah finished: same ayah again, the next ayah, the next round, or null
 * when the session is over. pos = { i, rep, round }; rounds 0 = endless.
 */
export function nextStep(pos, cfg, length) {
	if (!length) return null;
	const perAyah = Math.max(1, cfg.perAyah || 1);
	if (pos.rep < perAyah) return { i: pos.i, rep: pos.rep + 1, round: pos.round };
	if (pos.i + 1 < length) return { i: pos.i + 1, rep: 1, round: pos.round };
	if (!cfg.rounds || pos.round < cfg.rounds) return { i: 0, rep: 1, round: pos.round + 1 };
	return null;
}

/** The ayah keys ("s:a") the next steps will need, distinct, for downloading ahead. */
export function upcomingKeys(pos, cfg, list, count = 2) {
	const out = [];
	let p = pos;
	for (let guard = 0; guard < 60 && out.length < count; guard += 1) {
		p = nextStep(p, cfg, list.length);
		if (!p) break;
		const k = `${list[p.i].s}:${list[p.i].a}`;
		if (!out.includes(k) && k !== `${list[pos.i].s}:${list[pos.i].a}`) out.push(k);
	}
	return out;
}

/** The rub' (quarter) that contains ayah s:a, as a { from, to } span. */
export function quarterRange(s, a, rubStarts, versesCountOf) {
	let idx = 0;
	for (let i = 0; i < rubStarts.length; i += 1) {
		const [rs, ra] = rubStarts[i];
		if (rs < s || (rs === s && ra <= a)) idx = i;
		else break;
	}
	const [fs, fa] = rubStarts[idx];
	const next = rubStarts[idx + 1];
	let to;
	if (!next) to = { s: 114, a: versesCountOf(114) };
	else if (next[1] > 1) to = { s: next[0], a: next[1] - 1 };
	else to = { s: next[0] - 1, a: versesCountOf(next[0] - 1) };
	return { from: { s: fs, a: fa }, to, quarter: idx + 1 };
}

/** First and last ayah on a page (its "s:a" keys in order). */
/**
 * The hizb (size 4) or juz (size 8) of quarters around an ayah: { from, to, n } where n is the
 * hizb / juz number (1-based). Quarters come from RUB_STARTS ([surah, ayah, page, …], 240 of them).
 */
export function groupRange(s, a, rubStarts, versesCountOf, size) {
	let idx = 0;
	for (let i = 0; i < rubStarts.length; i += 1) {
		const [rs, ra] = rubStarts[i];
		if (rs < s || (rs === s && ra <= a)) idx = i;
		else break;
	}
	const first = Math.floor(idx / size) * size;
	const [fs, fa] = rubStarts[first];
	const next = rubStarts[first + size];
	let to;
	if (!next) to = { s: 114, a: versesCountOf(114) };
	else if (next[1] > 1) to = { s: next[0], a: next[1] - 1 };
	else to = { s: next[0] - 1, a: versesCountOf(next[0] - 1) };
	return { from: { s: fs, a: fa }, to, n: first / size + 1 };
}

/** How many times you will hear ayat in a session: ayat × repeats × rounds (rounds 0 = endless). */
export function totalPlays(count, perAyah, rounds) {
	return rounds ? count * perAyah * rounds : Infinity;
}

export function pageRange(keys) {
	if (!keys?.length) return null;
	const [fs, fa] = keys[0].split(':').map(Number);
	const [ts, ta] = keys[keys.length - 1].split(':').map(Number);
	return { from: { s: fs, a: fa }, to: { s: ts, a: ta } };
}

export function surahRange(s, versesCountOf) {
	return { from: { s, a: 1 }, to: { s, a: versesCountOf(s) } };
}

/**
 * Memorising: is word p (1-based) of an ayah with `count` words hidden?
 * first = only the first word shows; middle / end = that third hidden; all = everything.
 */
export function isVeiled(mode, p, count) {
	if (!mode || mode === 'none') return false;
	if (mode === 'all') return true;
	if (mode === 'first') return p > 1;
	const n = Math.max(1, count || p);
	const third = Math.min(2, Math.floor(((p - 1) * 3) / n));
	return mode === 'middle' ? third === 1 : mode === 'end' ? third === 2 : false;
}

export function inSpan(s, a, from, to) {
	if (!from || !to) return false;
	const [x, y] = before(to, from) ? [to, from] : [from, to];
	const k = { s, a };
	return !before(k, x) && !before(y, k);
}
