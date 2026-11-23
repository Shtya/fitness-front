import test from 'node:test';
import assert from 'node:assert/strict';
import {
	surahPlace,
	spotForWord,
	createMistake,
	gradeMistake,
	dueQueue,
	mergeMistakes,
	normalizeMistakes,
	mistakesFromWordMarks,
	surahSummaries,
	surahWarmup,
	hiddenRange,
	overallStats,
	BOX_DAYS,
	AGAIN_DELAY_MS,
} from './quran-mistakes.js';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 23, 12);

test('surahPlace splits a surah into thirds', () => {
	assert.equal(surahPlace(1, 165), 'start');
	assert.equal(surahPlace(55, 165), 'start');
	assert.equal(surahPlace(56, 165), 'middle');
	assert.equal(surahPlace(110, 165), 'middle');
	assert.equal(surahPlace(111, 165), 'end');
	assert.equal(surahPlace(165, 165), 'end');
	assert.equal(surahPlace(2, 3), 'middle');
	assert.equal(surahPlace(1, 1), 'start');
});

test('spotForWord maps a tapped word to start / middle / end of the ayah', () => {
	assert.equal(spotForWord(0, 9), 'start');
	assert.equal(spotForWord(4, 9), 'middle');
	assert.equal(spotForWord(8, 9), 'end');
	assert.equal(spotForWord(1, 2), 'end');
});

test('a new mistake is due now; good answers walk up the boxes', () => {
	let m = createMistake({ surahId: 6, ayah: 12, kind: 'swap', spot: 'middle', wordStart: 3, said: 'قل' }, NOW);
	assert.equal(m.box, 0);
	assert.equal(m.dueAt, NOW);
	m = gradeMistake(m, 'good', NOW);
	assert.equal(m.box, 1);
	assert.equal(m.dueAt, NOW + BOX_DAYS[1] * DAY);
	m = gradeMistake(m, 'good', NOW);
	m = gradeMistake(m, 'good', NOW);
	assert.equal(m.box, 3);
	const hard = gradeMistake(m, 'hard', NOW);
	assert.equal(hard.box, 3);
	assert.equal(hard.dueAt, NOW + (BOX_DAYS[3] / 2) * DAY);
	const fresh = createMistake({ surahId: 6, ayah: 1 }, NOW);
	assert.ok(gradeMistake(fresh, 'hard', NOW).dueAt < gradeMistake(fresh, 'good', NOW).dueAt);
	const again = gradeMistake(m, 'again', NOW);
	assert.equal(again.box, 0);
	assert.equal(again.lapses, 1);
	assert.equal(again.dueAt, NOW + AGAIN_DELAY_MS);
	assert.equal(again.reviews, 4);
});

test('dueQueue puts often-missed mistakes first, then mushaf order', () => {
	const a = { ...createMistake({ id: 'a', surahId: 7, ayah: 50 }, NOW - DAY), lapses: 0, box: 2 };
	const b = { ...createMistake({ id: 'b', surahId: 6, ayah: 20 }, NOW - DAY), lapses: 3, box: 1 };
	const c = { ...createMistake({ id: 'c', surahId: 6, ayah: 5 }, NOW - DAY), lapses: 0, box: 2 };
	const later = { ...createMistake({ id: 'd', surahId: 1, ayah: 1 }, NOW), dueAt: NOW + DAY };
	const q = dueQueue([a, b, c, later], NOW);
	assert.deepEqual(q.map(m => m.id), ['b', 'c', 'a']);
});

test('merge keeps the newest edit and carries deletes across devices', () => {
	const base = createMistake({ id: 'x', surahId: 6, ayah: 1 }, NOW - 1000);
	const edited = { ...base, note: 'phone', updatedAt: NOW };
	const deleted = { ...base, deletedAt: NOW + 5, updatedAt: NOW + 5 };
	assert.equal(mergeMistakes([base], [edited])[0].note, 'phone');
	const merged = mergeMistakes([edited], [deleted]);
	assert.equal(merged.length, 1);
	assert.ok(merged[0].deletedAt);
	assert.equal(overallStats(merged, NOW + 10).total, 0);
});

test('normalize drops junk and clamps fields', () => {
	const out = normalizeMistakes([
		null,
		{ id: 'ok', surahId: 2, ayah: 255, kind: 'nope', spot: 'nope', wordStart: 4, wordEnd: 2, box: 99 },
		{ id: 'bad', surahId: 200, ayah: 1 },
	]);
	assert.equal(out.length, 1);
	assert.equal(out[0].kind, 'forgot');
	assert.equal(out[0].spot, 'whole');
	assert.equal(out[0].wordEnd, 4);
	assert.equal(out[0].box, 6);
	const noWord = createMistake({ surahId: 7, ayah: 200, spot: 'link', wordStart: null, wordEnd: null }, NOW);
	assert.equal(noWord.wordStart, null);
	assert.equal(noWord.wordEnd, null);
});

test('studio word marks become grouped notebook mistakes, once', () => {
	const marks = { '6:10:2': 'forgot', '6:10:3': 'forgot', '6:10:7': 'forgot', '7:3:0': 'tashkeel', '7:3:1': 'junk' };
	const made = mistakesFromWordMarks(marks, [], () => 9, NOW);
	assert.equal(made.length, 3);
	const run = made.find(m => m.wordStart === 2);
	assert.equal(run.wordEnd, 3);
	assert.equal(run.kind, 'forgot');
	assert.equal(run.spot, 'start');
	assert.equal(mistakesFromWordMarks(marks, made, () => 9, NOW).length, 0);
});

test('summaries count due mistakes and where they cluster in the surah', () => {
	const list = [
		createMistake({ surahId: 6, ayah: 160 }, NOW),
		createMistake({ surahId: 6, ayah: 150 }, NOW),
		createMistake({ surahId: 6, ayah: 3 }, NOW),
		{ ...createMistake({ surahId: 7, ayah: 3 }, NOW), dueAt: NOW + DAY },
	];
	const s = surahSummaries(list, id => (id === 6 ? 165 : 206), NOW);
	assert.equal(s[0].surahId, 6);
	assert.deepEqual(s[0].places, { start: 1, middle: 0, end: 2 });
	assert.equal(s[0].due, 3);
	assert.equal(s[1].due, 0);
	assert.deepEqual(surahWarmup(list, 6).map(m => m.ayah), [3, 150, 160]);
});

test('hiddenRange hides the words the reader has to recall', () => {
	assert.deepEqual(hiddenRange({ spot: 'between', wordStart: 3, wordEnd: 4, kind: 'forgot' }, 10), { from: 4, to: 6 });
	assert.deepEqual(hiddenRange({ spot: 'middle', wordStart: 5, wordEnd: 5, kind: 'swap' }, 10), { from: 5, to: 5 });
	assert.deepEqual(hiddenRange({ spot: 'end', wordStart: null, kind: 'forgot' }, 9), { from: 6, to: 8 });
	assert.equal(hiddenRange({ spot: 'link', wordStart: null }, 9).next, true);
});

test('new mushaf mark types map to log kinds, and removed marks drop unreviewed entries', async () => {
	const { dropUnmarked } = await import('./quran-mistakes.js');
	const marks = { '6:20:1': 'added', '6:21:4': 'swap' };
	const made = mistakesFromWordMarks(marks, [], () => 10, NOW);
	assert.deepEqual(made.map(m => m.kind).sort(), ['add', 'swap']);
	const reviewed = made.map(m => (m.kind === 'swap' ? { ...m, reviews: 1 } : m));
	const after = dropUnmarked(reviewed, {}, NOW + 1);
	assert.ok(after.find(m => m.kind === 'add').deletedAt);
	assert.equal(after.find(m => m.kind === 'swap').deletedAt, null);
	assert.equal(dropUnmarked(made, marks, NOW), made);
});
