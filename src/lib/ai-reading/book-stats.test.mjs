import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_WPM, countText, measureBook, minutesFor, wordsLeft, wpmFor } from './book-stats.js';

const book = {
	language: 'ar',
	chapters: [
		{
			title: 'الفصل الأول',
			pages: [
				{ id: 'p1', title: 'البداية', blocks: [{ type: 'paragraph', text: 'القراءة تفتح أبوابًا جديدة.' }] },
				{ id: 'p2', blocks: [{ type: 'list', items: ['خطوة أولى', 'خطوة ثانية'] }, { type: 'quote', text: 'اقرأ كل يوم.' }] },
			],
		},
	],
};

test('counts Arabic words and letters from real blocks, titles and list items', () => {
	assert.deepEqual(countText('القراءة تفتح أبوابًا جديدة.'), { words: 4, letters: 22, arabic: 23, latin: 0 });
	const m = measureBook(book);
	// "الفصل الأول" 2 + "البداية" 1 + 4  |  "خطوة أولى" 2 + "خطوة ثانية" 2 + "اقرأ كل يوم" 3
	assert.equal(m.words, 14);
	assert.equal(m.language, 'ar');
	assert.deepEqual(m.pages.map(p => [p.id, p.words, p.wordsBefore]), [['p1', 5, 2], ['p2', 7, 7]]);
});

test('English words keep contractions and hyphenated words whole; punctuation is not a letter', () => {
	assert.deepEqual(countText("Don't over-think it — read 2 pages."), { words: 6, letters: 24, arabic: 0, latin: 24 });
});

test('reading speed falls back to the language default and respects a saved speed', () => {
	assert.equal(wpmFor('ar'), DEFAULT_WPM.ar);
	assert.equal(wpmFor('en', { wpm: { en: 300 } }), 300);
	assert.equal(wpmFor('en', { wpm: { en: 5 } }), 60, 'clamped to the minimum');
	assert.equal(minutesFor(0, 200), 0);
	assert.equal(minutesFor(50, 200), 1, 'never shows 0 for a non-empty book');
	assert.equal(minutesFor(4800, 160), 30);
});

test('words left follow the saved page and the scroll position inside it', () => {
	const m = measureBook(book);
	assert.equal(wordsLeft(m, {}), 14);
	assert.equal(wordsLeft(m, { pageId: 'p2', scrollRatio: 0 }), 7);
	assert.equal(wordsLeft(m, { pageId: 'p2', scrollRatio: 1 }), 0);
	assert.equal(wordsLeft(m, { percent: 50 }), 7, 'unknown page falls back to percent');
});
