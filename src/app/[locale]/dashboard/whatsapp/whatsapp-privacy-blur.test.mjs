import assert from 'node:assert/strict';
import test from 'node:test';
import {
	isWhatsAppChatPrivacyBlurred,
	normalizeWhatsAppPrivacyBlur,
	privacyBlurRootClassNames,
	toggleWhatsAppPrivacyBlurChat,
} from './whatsapp-privacy-blur.js';

test('privacy blur defaults hide list and thread, and prefer hover persist', () => {
	const next = normalizeWhatsAppPrivacyBlur({});
	assert.equal(next.enabled, false);
	assert.equal(next.list, true);
	assert.equal(next.thread, true);
	assert.equal(next.hoverReveal, true);
	assert.equal(next.persistReveal, true);
	assert.equal(next.selectedOnly, false);
	assert.deepEqual(next.chatIds, []);
});

test('privacy blur root classes follow the enabled scopes', () => {
	assert.equal(privacyBlurRootClassNames({ enabled: false, selectedOnly: true }), '');
	assert.equal(
		privacyBlurRootClassNames({
			enabled: true,
			list: true,
			thread: false,
			hoverReveal: true,
			persistReveal: false,
		}),
		'wa-privacy-on wa-privacy-list wa-privacy-hover',
	);
	assert.equal(
		privacyBlurRootClassNames({ enabled: true, list: false, thread: true, hoverReveal: false, persistReveal: false, selectedOnly: true }),
		'wa-privacy-on wa-privacy-thread wa-privacy-selected',
	);
});

test('privacy blur chat ids are trimmed, unique, and strings only', () => {
	const next = normalizeWhatsAppPrivacyBlur({ chatIds: [' a ', 'a', '', 3, null, 'b'] });
	assert.deepEqual(next.chatIds, ['a', 'b']);
});

test('privacy blur chat toggle adds and removes one chat', () => {
	let next = toggleWhatsAppPrivacyBlurChat({ enabled: true, selectedOnly: true }, 'c1');
	assert.deepEqual(next.chatIds, ['c1']);
	assert.equal(isWhatsAppChatPrivacyBlurred(next, 'c1'), true);
	assert.equal(isWhatsAppChatPrivacyBlurred(next, 'c2'), false);
	next = toggleWhatsAppPrivacyBlurChat(next, 'c1', false);
	assert.deepEqual(next.chatIds, []);
	assert.equal(isWhatsAppChatPrivacyBlurred({ ...next, chatIds: ['c1'], selectedOnly: false }, 'c1'), false);
});
