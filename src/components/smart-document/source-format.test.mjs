import test from 'node:test';
import assert from 'node:assert/strict';
import { detectSourceFormat, htmlForEditor, htmlToPlainText, isHtmlSource } from './source-format.js';

test('detects HTML when the source starts with a tag', () => {
	assert.equal(detectSourceFormat('<h1>Hello</h1>'), 'html');
	assert.equal(isHtmlSource('<p>Paragraph</p>'), true);
});

test('keeps Markdown when tags appear later', () => {
	assert.equal(detectSourceFormat('Hello <br> world'), 'markdown');
	assert.equal(isHtmlSource('# Title'), false);
});

test('extracts body content for TipTap', () => {
	const raw = '<!doctype html><html><head><title>x</title></head><body><h1>Hi</h1></body></html>';
	assert.equal(htmlForEditor(raw), '<h1>Hi</h1>');
});

test('strips tags for history titles', () => {
	assert.match(htmlToPlainText('<h1>خطة التمرين</h1><p>Week 1</p>'), /خطة التمرين/);
	assert.match(htmlToPlainText('<h1>خطة التمرين</h1><p>Week 1</p>'), /Week 1/);
});
