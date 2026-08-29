import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	normalizeLookupText,
	isSingleWord,
	wordCount,
	toSaveWordPayload,
	detectLang,
} from './text-utils.js';

describe('web-translator text-utils', () => {
	it('normalizes whitespace and soft hyphens', () => {
		assert.equal(normalizeLookupText('  hello\u00ad  world  '), 'hello world');
	});

	it('detects single words and language', () => {
		assert.equal(isSingleWord('hello'), true);
		assert.equal(isSingleWord('hello world'), false);
		assert.equal(wordCount('one two three'), 3);
		assert.equal(detectLang('مرحبا'), 'ar');
		assert.equal(detectLang('hello'), 'en');
	});

	it('strips lookup extras for save payload', () => {
		const payload = toSaveWordPayload({
			text: 'hello',
			translation: 'مرحبا',
			sourceLang: 'en',
			targetLang: 'ar',
			provider: 'x',
			saved: false,
			websitePath: '/x',
		});
		assert.equal(payload.text, 'hello');
		assert.equal(payload.translation, 'مرحبا');
		assert.equal(payload.provider, undefined);
		assert.equal(payload.saved, undefined);
	});
});
