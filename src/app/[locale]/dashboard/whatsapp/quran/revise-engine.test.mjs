import test from 'node:test';
import assert from 'node:assert/strict';
import { ayahList, nextStep, upcomingKeys, quarterRange, pageRange, surahRange, isVeiled, inSpan, groupRange, totalPlays } from './revise-engine.js';
import { RUB_STARTS } from './rub-starts.js';

const counts = { 1: 7, 2: 286, 6: 165, 7: 206, 113: 5, 114: 6 };
const vc = s => counts[s] || 10;

test('ayahList spans surahs and accepts either order', () => {
	assert.deepEqual(ayahList({ s: 7, a: 3 }, { s: 7, a: 5 }, vc), [{ s: 7, a: 3 }, { s: 7, a: 4 }, { s: 7, a: 5 }]);
	assert.deepEqual(ayahList({ s: 7, a: 5 }, { s: 7, a: 3 }, vc).length, 3);
	const cross = ayahList({ s: 113, a: 4 }, { s: 114, a: 2 }, vc);
	assert.deepEqual(cross.map(x => `${x.s}:${x.a}`), ['113:4', '113:5', '114:1', '114:2']);
});

test('nextStep repeats each ayah, then moves on, then loops rounds', () => {
	const cfg = { perAyah: 2, rounds: 2 };
	let pos = { i: 0, rep: 1, round: 1 };
	const seen = [];
	while (pos) {
		seen.push(`${pos.i}.${pos.rep}.${pos.round}`);
		pos = nextStep(pos, cfg, 2);
	}
	assert.deepEqual(seen, ['0.1.1', '0.2.1', '1.1.1', '1.2.1', '0.1.2', '0.2.2', '1.1.2', '1.2.2']);
	assert.deepEqual(nextStep({ i: 1, rep: 1, round: 9 }, { perAyah: 1, rounds: 0 }, 2), { i: 0, rep: 1, round: 10 });
});

test('upcomingKeys lists the next distinct ayat to download', () => {
	const list = [{ s: 7, a: 3 }, { s: 7, a: 4 }, { s: 7, a: 5 }];
	assert.deepEqual(upcomingKeys({ i: 0, rep: 1, round: 1 }, { perAyah: 3, rounds: 1 }, list), ['7:4', '7:5']);
});

test('spans: quarter, page, surah', () => {
	const q = quarterRange(7, 40, RUB_STARTS, vc);
	assert.deepEqual(q.from, { s: 7, a: 31 });
	assert.deepEqual(q.to, { s: 7, a: 46 });
	assert.deepEqual(pageRange(['91:1', '92:14']), { from: { s: 91, a: 1 }, to: { s: 92, a: 14 } });
	assert.deepEqual(surahRange(7, vc), { from: { s: 7, a: 1 }, to: { s: 7, a: 206 } });
	assert.equal(inSpan(7, 4, { s: 7, a: 3 }, { s: 7, a: 5 }), true);
	assert.equal(inSpan(7, 6, { s: 7, a: 3 }, { s: 7, a: 5 }), false);
});

test('isVeiled hides the chosen part of each ayah', () => {
	assert.equal(isVeiled('none', 3, 9), false);
	assert.equal(isVeiled('all', 1, 9), true);
	assert.equal(isVeiled('first', 1, 9), false);
	assert.equal(isVeiled('first', 2, 9), true);
	assert.deepEqual([1, 4, 7].map(p => isVeiled('middle', p, 9)), [false, true, false]);
	assert.deepEqual([1, 4, 7].map(p => isVeiled('end', p, 9)), [false, false, true]);
});

test('spans: hizb and juz', () => {
	const juz1 = groupRange(2, 100, RUB_STARTS, vc, 8);
	assert.equal(juz1.n, 1);
	assert.deepEqual(juz1.from, { s: 1, a: 1 });
	assert.deepEqual(juz1.to, { s: 2, a: 141 });
	const juz2 = groupRange(2, 142, RUB_STARTS, vc, 8);
	assert.equal(juz2.n, 2);
	assert.deepEqual(juz2.from, { s: 2, a: 142 });
	const hizb2 = groupRange(2, 80, RUB_STARTS, vc, 4);
	assert.equal(hizb2.n, 2);
	assert.deepEqual(hizb2.from, { s: 2, a: 75 });
	const juz30 = groupRange(114, 1, RUB_STARTS, vc, 8);
	assert.equal(juz30.n, 30);
	assert.deepEqual(juz30.to, { s: 114, a: 6 });
	assert.equal(totalPlays(10, 3, 2), 60);
	assert.equal(totalPlays(10, 3, 0), Infinity);
});
