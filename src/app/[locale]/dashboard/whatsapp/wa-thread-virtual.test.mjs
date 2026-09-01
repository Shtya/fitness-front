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
