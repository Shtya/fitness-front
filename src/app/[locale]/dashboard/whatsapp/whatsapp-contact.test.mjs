import assert from 'node:assert/strict';
import test from 'node:test';
import {
	buildContactVcard,
	extractRawVcardFromMessage,
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

test('iPhone cards with grouped item1.TEL lines are read with their labels', () => {
	const vcard = [
		'BEGIN:VCARD',
		'VERSION:3.0',
		'N:;Mostafa;;;',
		'FN:Mostafa',
		'item1.TEL;waid=201115171339:+20 111 517 1339',
		'item1.X-ABLabel:Mobile',
		'item2.TEL:+20 2 1234 5678',
		'item2.X-ABLabel:_$!<Work>!$_',
		'END:VCARD',
	].join('\r\n');
	const phones = parseVcardPhones(vcard);
	assert.equal(phones.length, 2);
	assert.equal(phones[0].waId, '201115171339@c.us');
	assert.equal(phones[0].label, 'Mobile');
	assert.equal(phones[1].label, 'Work');
	const contact = parseContactFromMessage({
		type: 'contact',
		raw: { message: { contactMessage: { displayName: 'Mostafa', vcard } } },
	});
	assert.equal(contact.displayName, 'Mostafa');
	assert.equal(contact.waId, '201115171339@c.us');
});

test('a card sent in a disappearing-messages chat is unwrapped', () => {
	const vcard = 'BEGIN:VCARD\nFN:Sara\nTEL;type=CELL;waid=201000000002:+20 10 0000 0002\nEND:VCARD';
	const message = {
		type: 'contact',
		raw: { message: { ephemeralMessage: { message: { contactMessage: { displayName: 'Sara', vcard } } } } },
	};
	const contact = parseContactFromMessage(message);
	assert.equal(contact.displayName, 'Sara');
	assert.equal(contact.phones.length, 1);
	assert.equal(extractRawVcardFromMessage(message), vcard);
});

test('folded vCard lines and a card without a number still show the name', () => {
	const folded = 'BEGIN:VCARD\nFN:Long\n  Name\nTEL;waid=201000000003:+20 10 00\n 00 0003\nEND:VCARD';
	assert.equal(parseVcardPhones(folded)[0].waId, '201000000003@c.us');
	const contact = parseContactFromMessage({
		type: 'contact',
		raw: { message: { contactMessage: { displayName: 'No number', vcard: 'BEGIN:VCARD\nFN:No number\nEND:VCARD' } } },
	});
	assert.equal(contact.displayName, 'No number');
	assert.deepEqual(contact.phones, []);
});
