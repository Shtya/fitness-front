import test from 'node:test';
import assert from 'node:assert/strict';
import { firstStrongDir, normalizeDirection, numberedPrefix, oppositeRuns } from './bidi.js';

const slice = (text, runs) => runs.map(r => text.slice(r.from, r.to));

test('firstStrongDir skips digits, brackets and emoji', () => {
	assert.equal(firstStrongDir('11) تاريخ الـTopologies'), 'rtl');
	assert.equal(firstStrongDir('⚠️ Note: افتكر'), 'ltr');
	assert.equal(firstStrongDir('  (2024) — 15%'), null);
	assert.equal(firstStrongDir('الـ Router بيوصل'), 'rtl');
});

test('English runs inside Arabic are isolated without their sentence punctuation', () => {
	const text = 'الـTopologies بتوضح شكل الـNetwork (زي Star و Bus). استخدم TCP/IP و C++ و node.js.';
	assert.deepEqual(slice(text, oppositeRuns(text, 'rtl')), ['Topologies', 'Network', 'Star', 'Bus', 'TCP/IP', 'C++', 'node.js']);
	assert.ok(oppositeRuns(text, 'rtl').every(r => r.dir === 'ltr'));
});

test('multi-word English terms stay one run', () => {
	const text = 'الكورس اسمه Network Fundamentals وفيه OSI model.';
	assert.deepEqual(slice(text, oppositeRuns(text, 'rtl')), ['Network Fundamentals', 'OSI model']);
});

test('Arabic runs inside English are isolated too', () => {
	const text = 'The term الشبكة means network.';
	assert.deepEqual(slice(text, oppositeRuns(text, 'ltr')), ['الشبكة']);
	assert.deepEqual(oppositeRuns(text, null), []);
});

test('numberedPrefix finds the leading list number exactly as typed', () => {
	const at = (text) => {
		const r = numberedPrefix(text);
		return r ? text.slice(r.from, r.to) : null;
	};
	assert.equal(at('11) تاريخ الـTopologies'), '11)');
	assert.equal(at('3. المقدمة'), '3.');
	assert.equal(at('٢- الطبقات'), '٢-');
	assert.equal(at('2.1) التفاصيل'), '2.1)');
	assert.equal(at('الطبقة 7'), null);
});

test('normalizeDirection falls back to auto', () => {
	assert.equal(normalizeDirection('rtl'), 'rtl');
	assert.equal(normalizeDirection('sideways'), 'auto');
});
