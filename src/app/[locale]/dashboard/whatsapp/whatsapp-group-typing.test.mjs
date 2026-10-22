import test from 'node:test';
import assert from 'node:assert/strict';
import { applyGroupTyperPresence, groupTypersLabel } from './whatsapp-group-typing.js';

test('tracks several members typing and drops the one who stopped', () => {
	let typers = applyGroupTyperPresence([], { participantJid: 'a@lid', senderName: 'Ahmed', typing: true }, 1000);
	typers = applyGroupTyperPresence(typers, { participantJid: 'b@lid', senderName: 'Mona', typing: true }, 2000);
	assert.deepEqual(typers.map(t => t.name), ['Ahmed', 'Mona']);
	typers = applyGroupTyperPresence(typers, { participantJid: 'a@lid', typing: false }, 3000);
	assert.deepEqual(typers.map(t => t.name), ['Mona']);
});

test('keeps a known name, falls back to the phone, and expires stale typers', () => {
	let typers = applyGroupTyperPresence([], { participantJid: 'a@lid', senderName: 'Ahmed', typing: true }, 0);
	typers = applyGroupTyperPresence(typers, { participantJid: 'a@lid', recording: true }, 1000);
	assert.equal(typers[0].name, 'Ahmed');
	assert.equal(typers[0].recording, true);
	typers = applyGroupTyperPresence(
		typers,
		{ participantJid: 'c@lid', participantPhone: '201000000003', typing: true },
		40_000,
	);
	assert.deepEqual(typers.map(t => t.name), ['+201000000003']);
});

test('builds a readable label', () => {
	assert.equal(groupTypersLabel([], 'ar'), '');
	assert.equal(groupTypersLabel([{ name: 'أحمد' }], 'ar'), 'أحمد');
	assert.equal(groupTypersLabel([{ name: 'أحمد' }, { name: 'منى' }], 'ar'), 'أحمد ومنى');
	assert.equal(groupTypersLabel([{ name: 'A' }, { name: 'B' }, { name: 'C' }], 'en'), 'A and 2 others');
});
