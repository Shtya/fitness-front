import assert from 'node:assert/strict';
import test from 'node:test';
import {
	conversationTitle,
	mergeMessages,
	relativeTime,
	seekRatio,
} from './whatsapp-utils.js';

test('mergeMessages deduplicates provider messages and sorts chronologically', () => {
	const result = mergeMessages(
		[
			{
				id: 'local-2',
				providerMessageId: 'provider-2',
				providerTimestamp: '2026-01-02T00:00:00.000Z',
				text: 'old',
			},
		],
		[
			{
				id: 'local-1',
				providerMessageId: 'provider-1',
				providerTimestamp: '2026-01-01T00:00:00.000Z',
			},
			{
				id: 'local-2-new',
				providerMessageId: 'provider-2',
				providerTimestamp: '2026-01-02T00:00:00.000Z',
				text: 'new',
			},
		],
	);
	assert.deepEqual(
		result.map(item => item.providerMessageId),
		['provider-1', 'provider-2'],
	);
	assert.equal(result[1].text, 'new');
});

test('conversationTitle follows group/contact/provider precedence', () => {
	assert.equal(conversationTitle({ group: { subject: 'Support' } }), 'Support');
	assert.equal(conversationTitle({ contact: { name: 'Ahmed' } }), 'Ahmed');
	assert.equal(conversationTitle({ providerChatId: '201000000000@c.us' }), '201000000000');
	assert.equal(conversationTitle(null), 'Chat');
});

test('seekRatio supports LTR and RTL and clamps values', () => {
	assert.equal(seekRatio(25, 0, 100, false), 0.25);
	assert.equal(seekRatio(25, 0, 100, true), 0.75);
	assert.equal(seekRatio(-10, 0, 100), 0);
	assert.equal(seekRatio(110, 0, 100), 1);
	assert.equal(seekRatio(10, 0, 0), 0);
});

test('relativeTime handles deterministic valid and invalid timestamps', () => {
	const now = new Date('2026-07-19T12:00:00.000Z').getTime();
	assert.equal(relativeTime('2026-07-19T11:55:00.000Z', now), '5 min');
	assert.equal(relativeTime('2026-07-17T12:00:00.000Z', now), '2d');
	assert.equal(relativeTime('invalid', now), '');
});
