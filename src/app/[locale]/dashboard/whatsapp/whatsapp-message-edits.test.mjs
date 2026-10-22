import test from 'node:test';
import assert from 'node:assert/strict';
import {
	diffWhatsAppEditWords,
	normalizeWhatsAppEditHistory,
	whatsAppEditAuthorLabel,
} from './whatsapp-message-edits.js';

test('marks replaced words as removed then added', () => {
	assert.deepEqual(diffWhatsAppEditWords('السعر 500 جنيه', 'السعر 450 جنيه'), [
		{ type: 'same', value: 'السعر ' },
		{ type: 'removed', value: '500' },
		{ type: 'added', value: '450' },
		{ type: 'same', value: ' جنيه' },
	]);
});

test('handles pure additions and removals', () => {
	assert.deepEqual(diffWhatsAppEditWords('hello', 'hello there'), [
		{ type: 'same', value: 'hello' },
		{ type: 'added', value: ' there' },
	]);
	assert.deepEqual(diffWhatsAppEditWords('see you tomorrow', 'see you'), [
		{ type: 'same', value: 'see you' },
		{ type: 'removed', value: ' tomorrow' },
	]);
});

test('rebuilds both texts from the parts', () => {
	const before = 'I will come at 5 pm to the gym';
	const after = 'I can come at 6 pm to the new gym';
	const parts = diffWhatsAppEditWords(before, after);
	assert.equal(parts.filter(p => p.type !== 'added').map(p => p.value).join(''), before);
	assert.equal(parts.filter(p => p.type !== 'removed').map(p => p.value).join(''), after);
});

test('falls back to whole replace for very long texts', () => {
	const long = Array.from({ length: 600 }, (_, i) => `w${i}`).join(' ');
	const parts = diffWhatsAppEditWords(long, `${long} x`);
	assert.deepEqual(parts.map(p => p.type), ['removed', 'added']);
});

test('normalizes stored history and labels authors', () => {
	assert.deepEqual(normalizeWhatsAppEditHistory(null), []);
	assert.equal(
		normalizeWhatsAppEditHistory([null, { text: 'b', previousText: 'a' }, { text: 1 }]).length,
		1,
	);
	assert.equal(whatsAppEditAuthorLabel('contact', 'ar'), 'العميل عدّل الرسالة');
	assert.equal(whatsAppEditAuthorLabel('phone', 'en'), 'Edited from the phone');
});
