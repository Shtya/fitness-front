import assert from 'node:assert/strict';
import test from 'node:test';
import {
	buildSelectedMessagesCopyText,
	messageNeedsTranscription,
	sortMessagesByTime,
} from './whatsapp-selected-copy.js';

test('sortMessagesByTime orders chronologically', () => {
	const sorted = sortMessagesByTime([
		{ id: 'b', providerTimestamp: '2026-01-02T10:00:00.000Z', text: 'second' },
		{ id: 'a', providerTimestamp: '2026-01-01T10:00:00.000Z', text: 'first' },
	]);
	assert.deepEqual(sorted.map(item => item.id), ['a', 'b']);
});

test('buildSelectedMessagesCopyText puts time above body', () => {
	const text = buildSelectedMessagesCopyText(
		[
			{
				id: '1',
				type: 'text',
				providerTimestamp: '2026-01-01T14:30:00.000Z',
				text: 'Hello',
			},
		],
		{ locale: 'en' },
	);
	assert.match(text, /^[\d:]+\s*(AM|PM)?\nHello$/);
});

test('messageNeedsTranscription is false when transcript exists', () => {
	const message = {
		id: 'v1',
		type: 'ptt',
		attachments: [{ type: 'ptt' }],
	};
	assert.equal(messageNeedsTranscription(message, { v1: { text: 'done' } }), false);
	assert.equal(messageNeedsTranscription(message, {}), true);
});
