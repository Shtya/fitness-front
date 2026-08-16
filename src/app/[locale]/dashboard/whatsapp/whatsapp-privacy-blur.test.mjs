import assert from 'node:assert/strict';
import test from 'node:test';
import {
	normalizeWhatsAppPrivacyBlur,
	privacyBlurRootClassNames,
} from './whatsapp-privacy-blur.js';

test('privacy blur defaults hide list and thread, and prefer hover persist', () => {
	const next = normalizeWhatsAppPrivacyBlur({});
	assert.equal(next.enabled, false);
	assert.equal(next.list, true);
	assert.equal(next.thread, true);
	assert.equal(next.hoverReveal, true);
	assert.equal(next.persistReveal, true);
});

test('privacy blur root classes follow the enabled scopes', () => {
	assert.equal(privacyBlurRootClassNames({ enabled: false }), '');
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
});
