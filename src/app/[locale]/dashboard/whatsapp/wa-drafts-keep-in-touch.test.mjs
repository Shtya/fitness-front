import test from 'node:test';
import assert from 'node:assert/strict';
import { getChatDraft, setChatDraft } from './workspace/wa-chat-drafts.js';
import { KEEP_IN_TOUCH_GROUPS, arabicDays, intervalLabel, keepInTouchGroupLabel, keepInTouchSummary, sinceLabel } from './workspace/wa-keep-in-touch.js';

test('each chat keeps its own draft and a new chat starts empty', () => {
	setChatDraft('chat-a', 'hello A');
	setChatDraft('chat-b', 'hello B');
	assert.equal(getChatDraft('chat-a'), 'hello A');
	assert.equal(getChatDraft('chat-b'), 'hello B');
	assert.equal(getChatDraft('chat-c'), '');
});

test('clearing the box (or sending) removes the draft', () => {
	setChatDraft('chat-a', 'typed');
	setChatDraft('chat-a', '   ');
	assert.equal(getChatDraft('chat-a'), '');
	setChatDraft('chat-b', '');
	assert.equal(getChatDraft('chat-b'), '');
});

test('no chat key stores nothing', () => {
	setChatDraft('', 'lost');
	assert.equal(getChatDraft(''), '');
});

const DAY = 86_400_000;
const now = Date.UTC(2026, 10, 16, 12);

test('interval labels', () => {
	assert.equal(intervalLabel(7, 'ar'), 'كل أسبوع');
	assert.equal(intervalLabel(3, 'en'), 'Every 3 days');
	assert.equal(intervalLabel(1, 'ar'), 'كل يوم');
});

test('since label counts whole days', () => {
	assert.equal(sinceLabel(now - 2 * 3600_000, 'en', now), 'today');
	assert.equal(sinceLabel(now - DAY - 1000, 'en', now), 'yesterday');
	assert.equal(sinceLabel(now - 9 * DAY, 'ar', now), 'منذ 9 أيام');
	assert.equal(sinceLabel(now - 2 * DAY, 'ar', now), 'منذ يومين');
	assert.equal(sinceLabel(now - 14 * DAY, 'ar', now), 'منذ 14 يومًا');
	assert.equal(sinceLabel(null, 'ar', now), 'لم تراسله بعد');
});

test('overdue person says when you last wrote', () => {
	const summary = keepInTouchSummary(
		{ days: 7, lastContactAt: new Date(now - 9 * DAY).toISOString(), dueAt: new Date(now - 2 * DAY).toISOString(), overdue: true },
		'en',
		now,
	);
	assert.deepEqual(summary, { text: 'Last message 9 days ago · Every week', overdue: true });
});

test('someone not due yet says how long is left', () => {
	const summary = keepInTouchSummary(
		{ days: 7, lastContactAt: new Date(now - 5 * DAY).toISOString(), dueAt: new Date(now + 2 * DAY).toISOString(), overdue: false },
		'en',
		now,
	);
	assert.deepEqual(summary, { text: 'Due in 2 days · Every week', overdue: false });
});

test('never messaged is due now', () => {
	const summary = keepInTouchSummary({ days: 30, lastContactAt: null, dueAt: null, overdue: true }, 'ar', now);
	assert.equal(summary.overdue, true);
	assert.equal(summary.text, 'لم تراسله بعد · كل شهر');
});

test('Arabic day counts use the right form', () => {
	assert.equal(arabicDays(1), 'يوم');
	assert.equal(arabicDays(2), 'يومين');
	assert.equal(arabicDays(3), '3 أيام');
	assert.equal(arabicDays(10), '10 أيام');
	assert.equal(arabicDays(14), '14 يومًا');
	assert.equal(intervalLabel(3, 'ar'), 'كل 3 أيام');
});

test('keep in touch groups have Arabic and English names', () => {
	assert.deepEqual(KEEP_IN_TOUCH_GROUPS, ['friends', 'family', 'acquaintances', 'unknown']);
	assert.equal(keepInTouchGroupLabel('friends', 'ar'), 'اصحابي');
	assert.equal(keepInTouchGroupLabel('family', 'ar'), 'قرايبي');
	assert.equal(keepInTouchGroupLabel('acquaintances', 'ar'), 'معارف');
	assert.equal(keepInTouchGroupLabel('unknown', 'ar'), 'غير معروفين');
	assert.equal(keepInTouchGroupLabel('family', 'en'), 'Family');
	assert.equal(keepInTouchGroupLabel('nope', 'en'), '');
});

test('the row summary names the group next to the interval', () => {
	const now = Date.parse('2026-11-19T10:00:00Z');
	const due = new Date(now + 3 * 86_400_000).toISOString();
	const last = new Date(now - 7 * 86_400_000).toISOString();
	const summary = keepInTouchSummary({ days: 10, group: 'family', lastContactAt: last, dueAt: due, overdue: false }, 'ar', now);
	assert.match(summary.text, /قرايبي/);
	assert.match(summary.text, /10 أيام/);
	const ungrouped = keepInTouchSummary({ days: 10, group: null, lastContactAt: last, dueAt: due, overdue: false }, 'en', now);
	assert.doesNotMatch(ungrouped.text, /·.*·/);
});
