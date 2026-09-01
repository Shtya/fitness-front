import assert from 'node:assert/strict';
import test from 'node:test';
import {
	buildContactVcard,
	isContactMessage,
	parseContactFromMessage,
	parseVcardPhones,
} from './whatsapp-contact.js';

test('isContactMessage recognizes vcard types', () => {
	assert.equal(isContactMessage({ type: 'vcard' }), true);
	assert.equal(isContactMessage({ type: 'text' }), false);
});

test('parseContactFromMessage maps WPP vcard payload', () => {
	const message = {
		type: 'vcard',
		text: '201090998111@c.us',
		raw: {
			vcardFormattedName: 'خالو 😍',
			vcard: [
				'BEGIN:VCARD',
				'VERSION:3.0',
				'FN:خالو 😍',
				'TEL;type=CELL;waid=201090998111:+20 10 9099 8111',
				'END:VCARD',
			].join('\n'),
		},
	};
	const contact = parseContactFromMessage(message);
	assert.equal(contact.displayName, 'خالو 😍');
	assert.equal(contact.phones[0].formatted, '+201090998111');
	assert.equal(contact.waId, '201090998111@c.us');
});

test('parseVcardPhones supports multiple numbers', () => {
	const vcard = [
		'BEGIN:VCARD',
		'FN:Office',
		'TEL;type=CELL;waid=201000000001:+20 10 0000 0001',
		'TEL;type=HOME;waid=201000000002:+20 10 0000 0002',
		'END:VCARD',
	].join('\n');
	const phones = parseVcardPhones(vcard);
	assert.equal(phones.length, 2);
	assert.equal(phones[1].label, 'HOME');
});

test('parseContactFromMessage maps WPP vcard payload stored as text', () => {
	const message = {
		type: 'text',
		text: 'خالو 😍',
		raw: {
			type: 'chat',
			body: 'خالو 😍',
			vcardFormattedName: 'خالو 😍',
			vcard: [
				'BEGIN:VCARD',
				'VERSION:3.0',
				'FN:خالو 😍',
				'TEL;type=CELL;waid=201090998111:+20 10 9099 8111',
				'END:VCARD',
			].join('\n'),
		},
	};
	const contact = parseContactFromMessage(message);
	assert.equal(contact.displayName, 'خالو 😍');
	assert.equal(contact.phones[0].formatted, '+201090998111');
});

test('parseContactFromMessage ignores regular text messages', () => {
	const message = {
		type: 'text',
		text: 'على تلاته كده تاكل ولا ايه',
		raw: { body: 'على تلاته كده تاكل ولا ايه' },
	};
	assert.equal(parseContactFromMessage(message), null);
});

test('parseContactFromMessage reads top-level sharedContact from API', () => {
	const message = {
		type: 'contact',
		text: 'خالو 😍',
		sharedContact: {
			displayName: 'خالو 😍',
			phones: [
				{
					phone: '+20 10 9099 8111',
					waId: '201090998111@c.us',
					formatted: '+20 10 9099 8111',
				},
			],
			waId: '201090998111@c.us',
		},
	};
	const contact = parseContactFromMessage(message);
	assert.equal(contact.displayName, 'خالو 😍');
	assert.equal(contact.phones[0].formatted, '+20 10 9099 8111');
});

test('buildContactVcard keeps Arabic names', () => {
	const vcard = buildContactVcard({
		displayName: 'خالو 😍',
		phones: [{ waId: '201090998111@c.us', formatted: '+201090998111' }],
	});
	assert.match(vcard, /FN:خالو 😍/);
	assert.match(vcard, /waid=201090998111/);
});
