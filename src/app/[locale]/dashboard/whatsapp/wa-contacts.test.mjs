import assert from 'node:assert/strict';
import test from 'node:test';

import {
	canRetrySync,
	canStartChatFor,
	contactInitials,
	countryOptions,
	duplicateContactFrom,
	precheckPhone,
	profileRows,
	syncErrorText,
	syncTone,
	toAsciiDigits,
} from './wa-contacts.js';

test('precheck accepts international numbers in any common spelling', () => {
	for (const value of ['+20 100 123 4567', '0020 100-123-4567', '+٢٠١٠٠١٢٣٤٥٦٧']) {
		assert.deepEqual(precheckPhone(value), { ok: true, code: null, e164: '+201001234567' });
	}
});

test('precheck rejects empty, malformed and impossible numbers', () => {
	assert.equal(precheckPhone('  ').code, 'PHONE_REQUIRED');
	assert.equal(precheckPhone('+20 abc').code, 'PHONE_INVALID');
	assert.equal(precheckPhone('+20 12').code, 'PHONE_INVALID');
});

test('local numbers use the chosen country, or wait for the server to pick one', () => {
	assert.equal(precheckPhone('01001234567', 'EG').e164, '+201001234567');
	assert.deepEqual(precheckPhone('01001234567'), { ok: true, code: null, e164: null });
});

test('Arabic-Indic and Persian digits become ASCII', () => {
	assert.equal(toAsciiDigits('٠١٢۳۴'), '01234');
});

test('country list carries dialing codes and localized names', () => {
	const en = countryOptions('en');
	const egypt = en.find(item => item.code === 'EG');
	assert.equal(egypt.dial, '+20');
	assert.equal(egypt.name, 'Egypt');
	assert.notEqual(countryOptions('ar').find(item => item.code === 'EG').name, 'Egypt');
});

test('duplicate errors expose the contact that already exists', () => {
	const contact = { id: 'c1' };
	assert.equal(
		duplicateContactFrom({ response: { status: 409, data: { code: 'DUPLICATE_CONTACT', contact } } }),
		contact,
	);
	assert.equal(duplicateContactFrom({ response: { status: 400, data: { code: 'PHONE_INVALID' } } }), null);
});

test('initials handle multi-word, Arabic and empty names', () => {
	assert.equal(contactInitials('ali hassan'), 'AH');
	assert.equal(contactInitials('محمد'), 'م');
	assert.equal(contactInitials('  '), '#');
});

test('sync tone and retry follow the server status', () => {
	assert.equal(syncTone('synced'), 'ok');
	assert.equal(syncTone('failed'), 'error');
	assert.equal(syncTone('weird'), 'muted');
	assert.equal(canRetrySync({ sync: { status: 'failed' } }), true);
	assert.equal(canRetrySync({ sync: { status: 'synced' } }), false);
});

test('sync errors are localized by code, with the server text as fallback', () => {
	const messages = { NOT_CONNECTED: 'غير متصل' };
	assert.equal(syncErrorText({ error: 'offline', errorCode: 'NOT_CONNECTED' }, messages), 'غير متصل');
	assert.equal(syncErrorText({ error: 'odd failure', errorCode: 'NEW_CODE' }, messages), 'odd failure');
	assert.equal(syncErrorText({ error: null }, messages), null);
});

test('only verified registered numbers can start a chat', () => {
	assert.equal(canStartChatFor({ registration: { status: 'registered' } }), true);
	assert.equal(canStartChatFor({ registration: { status: 'unknown' } }), false);
	assert.equal(canStartChatFor({ registration: { status: 'not_registered' } }), false);
});

test('profile rows only list what WhatsApp shared', () => {
	const rows = profileRows({
		profile: {
			pushName: 'Sam',
			about: { status: 'hidden', text: null },
			business: {
				status: 'available',
				description: 'Bakery',
				category: null,
				email: null,
				websites: ['https://a.test'],
				address: null,
			},
		},
	});
	assert.deepEqual(
		rows.map(row => row.key),
		['pushName', 'description', 'website'],
	);
	assert.deepEqual(profileRows({ profile: null }), []);
});
