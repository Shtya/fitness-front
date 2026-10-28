import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCompletionModel, foldWord, suggestCompletion } from './wa-autocomplete.js';

const model = sources => buildCompletionModel(sources, { history: false });

test('finishes the word being typed from what was written before', () => {
	const m = model([{ text: 'the subscription renews monthly', weight: 3 }]);
	assert.equal(suggestCompletion(m, 'your subsc'), 'ription');
});

test('needs at least two letters and nothing after the word', () => {
	const m = model([{ text: 'tomorrow', weight: 3 }]);
	assert.equal(suggestCompletion(m, 't'), '');
	assert.equal(suggestCompletion(m, 'to,'), '');
	assert.equal(suggestCompletion(m, 'to'), 'morrow');
});

test('the previous word steers the choice', () => {
	const m = model([
		{ text: 'see you today, today is fine, today works', weight: 1 },
		{ text: 'see you tomorrow', weight: 3 },
	]);
	assert.equal(suggestCompletion(m, 'you to'), 'morrow');
});

test('offers the next word after a space only when it is the clear habit', () => {
	const m = model([]);
	assert.equal(suggestCompletion(m, 'إن شاء '), 'الله');
	assert.equal(suggestCompletion(m, 'random words '), '');
});

test('Arabic letter variants match each other', () => {
	assert.equal(foldWord('إن'), foldWord('ان'));
	const m = model([{ text: 'الاشتراك الشهري', weight: 3 }]);
	assert.equal(suggestCompletion(m, 'الاشتر'), 'اك');
});

test('keeps the casing being typed', () => {
	const m = model([{ text: 'perfect', weight: 3 }]);
	assert.equal(suggestCompletion(m, 'PER'), 'FECT');
	assert.equal(suggestCompletion(m, 'Per'), 'fect');
});
