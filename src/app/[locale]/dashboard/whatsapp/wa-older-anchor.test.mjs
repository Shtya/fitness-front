import test from 'node:test';
import assert from 'node:assert/strict';
import { applyThreadScrollAnchor, captureThreadScrollAnchor, threadAnchorTarget } from './whatsapp-utils.js';

// Minimal DOM stand-ins: a scroll box with one row; the row holds a date separator and a bubble.
function fakeThread({ rowTop, bubbleTop }) {
	const state = { rowTop, bubbleTop, scrollTop: 1000 };
	const bubble = { getBoundingClientRect: () => ({ top: state.bubbleTop, bottom: state.bubbleTop + 40 }) };
	const row = {
		getAttribute: (name) => (name === 'data-wa-row-key' ? 'm-401' : ''),
		getBoundingClientRect: () => ({ top: state.rowTop, bottom: state.bubbleTop + 40 }),
		querySelector: (sel) => (sel === '.wa-message-bubble' ? bubble : null),
	};
	const box = {
		get scrollTop() { return state.scrollTop; },
		set scrollTop(value) { state.scrollTop = value; },
		scrollHeight: 5000,
		clientHeight: 800,
		getBoundingClientRect: () => ({ top: 0 }),
		querySelectorAll: () => [row],
		querySelector: (sel) => (sel.includes('m-401') ? row : null),
	};
	return { state, box, row, bubble };
}

test('the anchor is the message bubble, not the row top', () => {
	const { row, bubble } = fakeThread({ rowTop: 100, bubbleTop: 160 });
	assert.equal(threadAnchorTarget(row), bubble);
	assert.equal(threadAnchorTarget(null), null);
});

test('a date separator disappearing above the message does not move the message', () => {
	// Before: separator (60px) at the row top, bubble 60px below it.
	const { state, box } = fakeThread({ rowTop: 100, bubbleTop: 160 });
	const pending = captureThreadScrollAnchor(box, {});
	assert.equal(pending.offsetFromViewport, 160);
	// Older messages of the same day were prepended: the separator is gone. The row top stays,
	// the bubble moved up by 60 — that was the visible jump.
	state.bubbleTop = 100;
	applyThreadScrollAnchor(box, pending, {});
	// The restore scrolls so the bubble is back where the reader saw it.
	assert.equal(state.scrollTop, 1000 - 60);
});
