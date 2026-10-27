import test from 'node:test';
import assert from 'node:assert/strict';
import { badgeLabel, badgeTitle } from '../../../../lib/app-badge.js';

test('badgeTitle prefixes the unread count and replaces an older prefix', () => {
	assert.equal(badgeTitle('WhatsApp | So7baFit', 3), '(3) WhatsApp | So7baFit');
	assert.equal(badgeTitle('(3) WhatsApp | So7baFit', 7), '(7) WhatsApp | So7baFit');
	assert.equal(badgeTitle('(99+) WhatsApp', 150), '(99+) WhatsApp');
});

test('badgeTitle drops the prefix when everything is read', () => {
	assert.equal(badgeTitle('(4) WhatsApp', 0), 'WhatsApp');
	assert.equal(badgeTitle('WhatsApp', null), 'WhatsApp');
});

test('badgeLabel is what the favicon bubble shows', () => {
	assert.equal(badgeLabel(0), '');
	assert.equal(badgeLabel(5), '5');
	assert.equal(badgeLabel(100), '99+');
	assert.equal(badgeLabel('x'), '');
});
