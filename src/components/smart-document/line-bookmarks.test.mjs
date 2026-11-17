import test from 'node:test';
import assert from 'node:assert/strict';
import { lineFingerprint, locateBookmarks, toggleBookmark } from './line-bookmarks.js';

const lines = [
	{ pos: 0, text: 'المدخلات:', nth: 0 },
	{ pos: 20, text: 'كل مدخل: قيمة + وسم مصدر + مرجع.', nth: 0 },
	{ pos: 60, text: 'فحص PPP.', nth: 0 },
	{ pos: 90, text: 'فحص PPP.', nth: 1 },
];

test('fingerprint folds whitespace', () => {
	assert.equal(lineFingerprint('  كل   مدخل:\nقيمة '), 'كل مدخل: قيمة');
});

test('toggling adds then removes the same line', () => {
	const once = toggleBookmark([], lines[1]);
	assert.equal(once.length, 1);
	assert.equal(once[0].text, lines[1].text);
	assert.deepEqual(toggleBookmark(once, lines[1]), []);
});

test('identical lines are told apart by occurrence', () => {
	const marks = toggleBookmark([], lines[3]);
	const found = locateBookmarks(lines, marks);
	assert.equal(found.get(marks[0].id).pos, 90);
});

test('a bookmark follows its line when text is added above it', () => {
	const marks = toggleBookmark([], lines[1]);
	const moved = [{ pos: 0, text: 'سطر جديد فوق', nth: 0 }, ...lines.map((l) => ({ ...l, pos: l.pos + 30 }))];
	assert.equal(locateBookmarks(moved, marks).get(marks[0].id).pos, 50);
});

test('a rewritten line is reported missing, not matched to something else', () => {
	const marks = toggleBookmark([], lines[1]);
	const edited = lines.map((l) => (l.pos === 20 ? { ...l, text: 'نص اتغير' } : l));
	assert.equal(locateBookmarks(edited, marks).has(marks[0].id), false);
});
