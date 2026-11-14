import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeMessages } from './whatsapp-utils.js';
import { sortMessagesByTime } from './whatsapp-selected-copy.js';

// Two replies sent in the same WhatsApp second (11:58:00): only the arrival time, stored to the
// millisecond, says which came first. Their ids are random, so the second one sorts first by id.
const sameSecond = 1794649080;
const first = {
	id: 'f6000000-0000-4000-8000-000000000000',
	providerMessageId: 'A1',
	providerTimestamp: sameSecond,
	created_at: '2026-11-14T09:58:00.120Z',
	text: 'لا مش عايزة ابقى 19 انا كده زي الفل',
};
const second = {
	id: '1b000000-0000-4000-8000-000000000000',
	providerMessageId: 'A2',
	providerTimestamp: sameSecond,
	created_at: '2026-11-14T09:58:00.870Z',
	text: 'هذا من فضل ربي',
};

test('messages sent in the same second keep the order they arrived in', () => {
	assert.deepEqual(
		mergeMessages([second], [first]).map(message => message.providerMessageId),
		['A1', 'A2'],
	);
	assert.deepEqual(
		mergeMessages([], [second, first]).map(message => message.providerMessageId),
		['A1', 'A2'],
	);
});

test('different seconds still order by WhatsApp time, whatever the arrival', () => {
	const earlier = { ...second, providerMessageId: 'B0', providerTimestamp: sameSecond - 5, created_at: '2026-11-14T10:30:00Z' };
	assert.deepEqual(
		mergeMessages([], [first, earlier]).map(message => message.providerMessageId),
		['B0', 'A1'],
	);
});

test('copying or forwarding several messages uses the same order', () => {
	assert.deepEqual(
		sortMessagesByTime([second, first]).map(message => message.providerMessageId),
		['A1', 'A2'],
	);
});
