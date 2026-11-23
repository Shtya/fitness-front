import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPageLines, juzOfPage, surahAtPage, clampPage, SURAH_START_PAGES, JUZ_START_PAGES } from './mushaf-pages.js';

const word = (key, position, line, end = false) => ({ position, line_number: line, char_type_name: end ? 'end' : 'word', text_qpc_hafs: end ? '١' : 'كلمة' });
const verse = (key, words) => ({ verse_key: key, words });

test('a surah starting mid-page gets a header line and a basmala line', () => {
	// Like page 595: Ash-Shams fills lines 2–8, Al-Layl starts on line 11 (lines 9–10 empty).
	const verses = [
		verse('91:1', [word('91:1', 1, 2), word('91:1', 2, 2), word('91:1', 3, 2, true)]),
		verse('91:15', [word('91:15', 1, 8), word('91:15', 2, 8, true)]),
		verse('92:1', [word('92:1', 1, 11), word('92:1', 2, 11, true)]),
	];
	const p = buildPageLines(verses, 595);
	assert.equal(p.lines.length, 15);
	assert.deepEqual(p.lines[0], { n: 1, kind: 'header', s: 91, basmala: true });
	assert.equal(p.lines[8].kind, 'header');
	assert.equal(p.lines[8].s, 92);
	assert.equal(p.lines[9].kind, 'basmala');
	assert.equal(p.lines[2].kind, 'blank');
	assert.equal(p.lines[1].kind, 'text');
	assert.deepEqual(p.chapters, [91, 92]);
	assert.deepEqual(p.keys, ['91:1', '91:15', '92:1']);
	assert.equal(p.lines[1].words[2].end, true);
});

test('At-Tawbah has no basmala, Al-Fatihah opens with its header only', () => {
	const tawbah = buildPageLines([verse('9:1', [word('9:1', 1, 3)])], 187);
	assert.equal(tawbah.lines[1].kind, 'header');
	assert.equal(tawbah.lines[1].basmala, false);
	assert.equal(tawbah.lines[0].kind, 'blank');
	const fatiha = buildPageLines([verse('1:1', [word('1:1', 1, 2)]), verse('1:7', [word('1:7', 1, 8)])], 1);
	assert.equal(fatiha.compact, true);
	assert.equal(fatiha.lines[0].kind, 'header');
	assert.equal(fatiha.lines.length, 3);
});

test('page helpers', () => {
	assert.equal(SURAH_START_PAGES.length, 114);
	assert.equal(JUZ_START_PAGES.length, 30);
	assert.equal(juzOfPage(1), 1);
	assert.equal(juzOfPage(21), 1);
	assert.equal(juzOfPage(22), 2);
	assert.equal(juzOfPage(604), 30);
	assert.equal(surahAtPage(595), 92);
	assert.equal(surahAtPage(3), 2);
	assert.equal(clampPage(0), 1);
	assert.equal(clampPage(900), 604);
});
