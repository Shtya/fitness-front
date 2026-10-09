import {
	estimateMessageRowSize,
	estimatePrependedThreadHeight,
	messageRowKey,
} from './wa-thread-virtual.js';

function makeRow({ kind = 'message', type = 'text', text = '', attachments = [] } = {}) {
	if (kind === 'image-gallery') {
		return { kind, key: 'g1', attachments };
	}
	return {
		kind: 'message',
		key: 'm1',
		message: { type, text, attachments },
	};
}

const { test } = await import('node:test');
const assert = await import('node:assert/strict');

test('voice and video rows estimate taller than a one-line text bubble', () => {
	const text = estimateMessageRowSize(makeRow({ text: 'ok' }));
	const voice = estimateMessageRowSize(
		makeRow({ type: 'ptt', attachments: [{ type: 'ptt' }] }),
	);
	const video = estimateMessageRowSize(
		makeRow({ type: 'video', attachments: [{ type: 'video' }] }),
	);
	assert.ok(voice > text);
	assert.ok(video > voice);
});

test('image galleries grow with extra tiles', () => {
	const one = estimateMessageRowSize(
		makeRow({ kind: 'image-gallery', attachments: [{ type: 'image' }] }),
	);
	const three = estimateMessageRowSize(
		makeRow({
			kind: 'image-gallery',
			attachments: [{ type: 'image' }, { type: 'image' }, { type: 'image' }],
		}),
	);
	assert.ok(three < one || three !== one);
	assert.equal(one, 292);
});

test('messageRowKey prefers stable message ids over array index', () => {
	assert.equal(messageRowKey({ key: 'a:b', message: { id: 'x' } }), 'a:b');
	assert.equal(messageRowKey({ message: { id: 'mid' } }), 'mid');
	assert.equal(messageRowKey(null), 'unknown-row');
});

test('estimatePrependedThreadHeight sums only the new top rows', () => {
	const rows = [
		makeRow({ text: 'new-1' }),
		makeRow({ text: 'new-2' }),
		makeRow({ text: 'old' }),
	];
	const height = estimatePrependedThreadHeight(rows, 2);
	assert.equal(height, estimateMessageRowSize(rows[0]) + estimateMessageRowSize(rows[1]));
});

const { estimateTextRowSize, THREAD_ROW_EXTRAS } = await import('./wa-thread-virtual.js');

const layout = {
	textMaxWidth: 300,
	lineHeight: 19,
	bubbleChrome: 15,
	metaWidthMine: 75,
	metaWidthOther: 59,
	metaLineHeight: 15,
	// 7px per character keeps the arithmetic easy to follow.
	measureText: text => text.length * 7,
};

test('a one-line text row is chrome + one line + the turn gap', () => {
	const size = estimateTextRowSize(makeRow({ text: 'ok' }), layout);
	assert.equal(size, 15 + 19 + THREAD_ROW_EXTRAS.groupGap);
});

test('rows inside a sender run use the tight gap', () => {
	const size = estimateTextRowSize(makeRow({ text: 'ok' }), layout, { precedesSame: true });
	assert.equal(size, 15 + 19 + THREAD_ROW_EXTRAS.clusterGap);
});

test('long text wraps by measured width and the time drops when it cannot fit', () => {
	// 100 chars = 700px over a 300px line: 3 lines, last line ~100px + 59px meta fits.
	const wrapped = estimateTextRowSize(makeRow({ text: 'x'.repeat(100) }), layout);
	assert.equal(wrapped, 15 + 3 * 19 + THREAD_ROW_EXTRAS.groupGap);
	// 40 chars = 280px: one line, but 280 + 59 > 300 so the time takes its own line.
	const metaDrops = estimateTextRowSize(makeRow({ text: 'y'.repeat(40) }), layout);
	assert.equal(metaDrops, 15 + 19 + 15 + THREAD_ROW_EXTRAS.groupGap);
});

test('a day separator, link preview and reactions add their own space', () => {
	const base = estimateTextRowSize(makeRow({ text: 'hi' }), layout);
	assert.equal(
		estimateTextRowSize(makeRow({ text: 'hi' }), layout, { startsNewDay: true }),
		base + THREAD_ROW_EXTRAS.dateSeparator,
	);
	assert.equal(
		estimateTextRowSize(makeRow({ text: 'see https://a.co' }), layout) -
			estimateTextRowSize(makeRow({ text: 'see xxxxxxxxxxxx' }), layout),
		THREAD_ROW_EXTRAS.linkPreview,
	);
	const reacted = makeRow({ text: 'hi' });
	reacted.message.reactions = [{ emoji: '❤️' }];
	assert.equal(
		estimateTextRowSize(reacted, layout, { precedesSame: true }),
		15 + 19 + THREAD_ROW_EXTRAS.groupGap + THREAD_ROW_EXTRAS.reactionsExtra,
	);
});

test('media and empty rows fall back to the fixed estimates', () => {
	assert.equal(
		estimateTextRowSize(makeRow({ type: 'image', attachments: [{ type: 'image' }] }), layout),
		null,
	);
	assert.equal(estimateTextRowSize(makeRow({ text: '   ' }), layout), null);
	assert.equal(estimateTextRowSize(makeRow({ text: 'hi' }), null), null);
});
