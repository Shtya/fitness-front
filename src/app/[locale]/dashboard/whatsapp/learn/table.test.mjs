import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markdownText, parseMarkdown } from './english-model.js';

test('markdown tables (with Arabic, header row, no blank line before)', () => {
	const md = ['## **الكلمات والمصطلحات الصعبة**', '', '| الكلمة | المعنى بالعربي |', '|---|---|', '| disclaimer (ديسكليمَر) | تنويه أو توضيح مسبق |', '| adversity | محنة، ظروف صعبة |', 'After the table.'].join('\n');
	const b = parseMarkdown(md);
	assert.deepEqual(b.map(x => x.type), ['h2', 'table', 'p']);
	assert.deepEqual(b[1].head, ['الكلمة', 'المعنى بالعربي']);
	assert.equal(b[1].rows.length, 2);
	assert.deepEqual(b[1].rows[1], ['adversity', 'محنة، ظروف صعبة']);
	assert.match(markdownText(md), /adversity — محنة/);
});

test('table without a header line, and a pipe-less end', () => {
	const b = parseMarkdown('| a | b |\n| c | d |\n\ntext');
	assert.equal(b[0].type, 'table');
	assert.equal(b[0].head, null);
	assert.equal(b[0].rows.length, 2);
	assert.equal(b[1].type, 'p');
});

test('table rows remember their source line; dropLine / rowKey', async () => {
	const { dropLine, rowKey } = await import('./english-model.js');
	const md = 'Intro\n\n| الكلمة | المعنى |\n|---|---|\n| disclaimer (ديسكليمَر) | تنويه |\n| **far-flung** | بعيد |';
	const t = parseMarkdown(md).find(b => b.type === 'table');
	assert.deepEqual(t.lines, [4, 5]);
	assert.equal(dropLine(md, 4).includes('disclaimer'), false);
	assert.equal(dropLine(md, 4).includes('far-flung'), true);
	assert.equal(rowKey(t.rows[0]), 'disclaimer');
	assert.equal(rowKey(t.rows[1]), 'far-flung');
	assert.equal(rowKey(['تنويه', 'x']), 'x');
});
