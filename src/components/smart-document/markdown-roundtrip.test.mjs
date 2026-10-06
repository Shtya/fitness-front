import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveExtensions } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import { MarkdownManager } from '@tiptap/markdown';

const manager = new MarkdownManager({
	extensions: resolveExtensions([StarterKit, TaskList, TaskItem.configure({ nested: true }), TableKit]),
});

const roundTrip = (md) => manager.serialize(manager.parse(md));

test('keeps headings, emphasis, lists and checklists', () => {
	const md = ['# Title', '', '**bold** and *italic*', '', '- one', '- two', '', '- [ ] todo', '- [x] done'].join('\n');
	const out = roundTrip(md);
	assert.match(out, /^# Title/m);
	assert.match(out, /\*\*bold\*\*/);
	assert.match(out, /\*italic\*|_italic_/);
	assert.match(out, /^- one$/m);
	assert.match(out, /^- \[ \] todo$/m);
	assert.match(out, /^- \[x\] done$/m);
});

test('keeps mixed Arabic and English text', () => {
	const md = 'خطة **التمرين** for week 1\n\nSecond paragraph بالعربي';
	const out = roundTrip(md);
	assert.match(out, /خطة \*\*التمرين\*\* for week 1/);
	assert.match(out, /Second paragraph بالعربي/);
});

test('keeps GFM tables', () => {
	const md = '| A | B |\n| --- | --- |\n| 1 | 2 |';
	const out = roundTrip(md);
	assert.match(out, /\|\s*A\s*\|\s*B\s*\|/);
	assert.match(out, /\|\s*1\s*\|\s*2\s*\|/);
});

test('is stable after the first normalisation', () => {
	const md = '## Plan\n\n1. first\n2. second\n\n> quote\n\n`code` and [link](https://example.com)';
	const once = roundTrip(md);
	assert.equal(roundTrip(once), once);
});
