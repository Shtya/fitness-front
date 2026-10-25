import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanDisplayText } from './clean-text.js';

test('drops ChatGPT citation tokens wrapped in private-use characters', () => {
	const raw = 'التمييز بين ادعاءات المؤلف وما تدعمه الأدلة. fileciteturn0file0L102-L166';
	assert.equal(cleanDisplayText(raw), 'التمييز بين ادعاءات المؤلف وما تدعمه الأدلة.');
});

test('drops canvas markers but keeps the words around them', () => {
	const raw = ':::writing{variant="document" id="58321" title="The Mystery Method"} ماذا يبقى من الكتاب عند نزول';
	assert.equal(cleanDisplayText(raw), 'ماذا يبقى من الكتاب عند نزول');
	assert.equal(cleanDisplayText('النهاية :::'), 'النهاية');
});

test('leaves ordinary text untouched', () => {
	const s = 'Ratio 3:2 and a list: one, two — fine.';
	assert.equal(cleanDisplayText(s), s);
});
