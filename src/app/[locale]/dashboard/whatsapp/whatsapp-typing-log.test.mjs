import test from 'node:test';
import assert from 'node:assert/strict';
import {
	formatTypingDuration,
	formatTypingWindow,
	parseTypingWindow,
	typingAttemptMatchesFilter,
	typingAttemptWindow,
	typingElapsedMs,
	typingLogCopy,
	typingRangeParams,
	typingStatusLabel,
	upsertTypingAttempt,
} from './whatsapp-typing-log.js';

const attempt = (patch = {}) => ({
	id: 'a1',
	conversationId: 'c1',
	status: 'typing',
	startedAt: '2026-10-22T10:00:00.000Z',
	lastTypingAt: '2026-10-22T10:00:05.000Z',
	messageAt: null,
	name: 'Sara',
	phone: '201000000001',
	...patch,
});

test('ranges are local-midnight based and sent as UTC ISO', () => {
	const now = new Date(2026, 9, 22, 15, 30);
	const today = typingRangeParams('today', {}, now);
	assert.equal(new Date(today.from).getTime(), new Date(2026, 9, 22).getTime());
	const week = typingRangeParams('7d', {}, now);
	assert.equal(new Date(week.from).getTime(), new Date(2026, 9, 16).getTime());
	assert.deepEqual(typingRangeParams('all', {}, now), {});
	const custom = typingRangeParams('custom', { from: '2026-10-20', to: '2026-10-21' }, now);
	assert.equal(new Date(custom.from).getTime(), new Date(2026, 9, 20).getTime());
	assert.equal(new Date(custom.to).getTime(), new Date(2026, 9, 22).getTime());
	const swapped = typingRangeParams('custom', { from: '2026-10-21', to: '2026-10-20' }, now);
	assert.equal(new Date(swapped.from).getTime(), new Date(2026, 9, 20).getTime());
	assert.deepEqual(typingRangeParams('custom', { from: 'bad' }, now), {});
});

test('durations format in both languages', () => {
	assert.equal(formatTypingDuration(45_000), '45s');
	assert.equal(formatTypingDuration(190_000), '3m 10s');
	assert.equal(formatTypingDuration(5 * 60_000), '5m');
	assert.equal(formatTypingDuration(65 * 60_000), '1h 5m');
	assert.equal(formatTypingDuration(90_000, true), '1د 30ث');
	assert.equal(formatTypingDuration(-1), '');
});

test('elapsed time only for attempts without a message', () => {
	const now = new Date('2026-10-22T10:06:05.000Z').getTime();
	assert.equal(typingElapsedMs(attempt({ status: 'stopped' }), now), 6 * 60_000);
	assert.equal(typingElapsedMs(attempt({ status: 'sent', messageAt: '2026-10-22T10:01:00.000Z' }), now), null);
	assert.equal(typingElapsedMs(attempt({ status: 'no_message' }), now), 30 * 60_000);
	assert.equal(typingElapsedMs(attempt({ status: 'no_message', checkpointMinutes: 45 }), now), 45 * 60_000);
});

test('no-message window: parse, format, and labels follow the setting', () => {
	assert.equal(parseTypingWindow('45'), 45);
	assert.equal(parseTypingWindow('0'), null);
	assert.equal(parseTypingWindow('1441'), null);
	assert.equal(parseTypingWindow('2.5'), null);
	assert.equal(parseTypingWindow(''), null);
	assert.equal(formatTypingWindow(30), '30 min');
	assert.equal(formatTypingWindow(90), '1h 30m');
	assert.equal(formatTypingWindow(120, true), '2 س');
	assert.equal(typingLogCopy('en', 60).filters.no_message, 'No message in 1h');
	assert.equal(typingLogCopy('ar', 15).filters.no_message, 'لا رسالة خلال 15 د');
	const copy = typingLogCopy('en', 60);
	assert.equal(typingStatusLabel(attempt({ status: 'no_message', checkpointMinutes: 10 }), copy), 'No message within 10 min');
	assert.equal(typingAttemptWindow(attempt({ status: 'stopped', windowMinutes: 20 })), 20);
});

test('live upsert respects the single-chat filter', () => {
	const fresh = attempt({ id: 'a2', conversationId: 'c2' });
	assert.equal(upsertTypingAttempt([attempt()], fresh, { conversationId: 'c1' }).length, 1);
	assert.equal(upsertTypingAttempt([attempt()], fresh, { conversationId: 'c2' }).length, 2);
});

test('filters map to statuses', () => {
	assert.equal(typingAttemptMatchesFilter(attempt(), 'typing'), true);
	assert.equal(typingAttemptMatchesFilter(attempt({ status: 'stopped' }), 'waiting'), true);
	assert.equal(typingAttemptMatchesFilter(attempt({ status: 'sent' }), 'no_message'), false);
	assert.equal(typingAttemptMatchesFilter(attempt({ status: 'no_message' }), 'all'), true);
});

test('live upsert replaces in place and only inserts matching rows', () => {
	const list = [attempt()];
	const updated = upsertTypingAttempt(list, attempt({ status: 'sent', messageAt: '2026-10-22T10:01:00.000Z' }), {
		filter: 'typing',
	});
	assert.equal(updated.length, 1);
	assert.equal(updated[0].status, 'sent');

	const fresh = attempt({ id: 'a2', startedAt: '2026-10-22T11:00:00.000Z' });
	assert.equal(upsertTypingAttempt(list, fresh, { filter: 'sent' }).length, 1);
	const inserted = upsertTypingAttempt(list, fresh, { filter: 'all' });
	assert.equal(inserted[0].id, 'a2');
	assert.equal(upsertTypingAttempt(list, fresh, { range: { from: '2026-10-23T00:00:00.000Z' } }).length, 1);
	assert.equal(upsertTypingAttempt(list, fresh, { query: 'nobody' }).length, 1);
	assert.equal(upsertTypingAttempt(list, fresh, { query: '1000000001' }).length, 2);
	assert.equal(upsertTypingAttempt(list, null).length, 1);
});
