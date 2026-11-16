import test from 'node:test';
import assert from 'node:assert/strict';
import { findHeadingIndex, headingSlug } from './heading-links.js';

const headings = [
	'الفهرس',
	'1. المشكلة',
	'2. الحل – عملنا إيه',
	'9ب) دليل الشاشات بالتفصيل – كل صفحة وكل تبويب',
	'Rules & Roles',
	'المشكلة',
];

test('GitHub slugs, Arabic and English', () => {
	assert.equal(headingSlug('2. الحل – عملنا إيه'), '2-الحل--عملنا-إيه');
	assert.equal(headingSlug('Rules & Roles'), 'rules--roles');
});

test('a contents link finds its heading by slug (encoded or not)', () => {
	assert.equal(findHeadingIndex(headings, '#2-الحل--عملنا-إيه'), 2);
	assert.equal(findHeadingIndex(headings, `#${encodeURIComponent('2-الحل--عملنا-إيه')}`), 2);
	assert.equal(findHeadingIndex(headings, '#rules--roles'), 4);
});

test('repeated headings use GitHub\'s -1 suffix', () => {
	assert.equal(findHeadingIndex(headings, '#المشكلة'), 5);
	assert.equal(findHeadingIndex(headings, '#1-المشكلة'), 1);
});

test('other slug styles and plain text still match', () => {
	assert.equal(findHeadingIndex(headings, '#الحل-عملنا-إيه', 'الحل – عملنا إيه'), 2);
	assert.equal(findHeadingIndex(headings, '#section-9b', '-9ب) دليل الشاشات بالتفصيل – كل صفحة وكل تبويب'), 3);
});

test('unknown targets return -1', () => {
	assert.equal(findHeadingIndex(headings, '#nothing-here', 'nothing here'), -1);
});
