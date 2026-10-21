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

test('buildSelectedMessagesCopyText writes date - time - sender: text', () => {
	const text = buildSelectedMessagesCopyText(
		[
			{ id: '2', type: 'text', providerTimestamp: '2026-01-01T14:31:00.000Z', text: 'Hi', direction: 'outbound' },
			{ id: '1', type: 'text', providerTimestamp: '2026-01-01T14:30:00.000Z', text: 'Hello' },
		],
		{ locale: 'en', senderName: message => (message.direction === 'outbound' ? 'Ahmed' : 'Amira') },
	);
	const lines = text.split('\n');
	assert.equal(lines.length, 2);
	assert.match(lines[0], /^\d{2}\/\d{2}\/2026 - [\d:]+\s*(AM|PM)? - Amira: Hello$/i);
	assert.match(lines[1], / - Ahmed: Hi$/);
});

test('buildSelectedMessagesCopyText skips messages without text', () => {
	const text = buildSelectedMessagesCopyText([
		{ id: '1', type: 'image', providerTimestamp: '2026-01-01T14:30:00.000Z', text: '' },
	]);
	assert.equal(text, '');
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
