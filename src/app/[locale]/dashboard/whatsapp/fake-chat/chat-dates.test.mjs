import assert from 'node:assert/strict';
import test from 'node:test';
import {
	addMinutesToClock,
	dateKeyDaysAgo,
	dayPillLabel,
	listRowTime,
	messengerGapStarts,
	messengerRowTime,
	messengerStamp,
	resolveMessageDays,
	toDateKey,
} from './chat-dates.js';

const NOW = new Date(2026, 10, 7, 18, 51); // Saturday 7 Nov 2026

test('dateKeyDaysAgo crosses month boundaries', () => {
	assert.equal(toDateKey(NOW), '2026-11-07');
	assert.equal(dateKeyDaysAgo(2, NOW), '2026-11-05');
	assert.equal(dateKeyDaysAgo(7, NOW), '2026-10-31');
});

test('dayPillLabel follows the age of the day', () => {
	assert.equal(dayPillLabel('2026-11-07', NOW), 'Today');
	assert.equal(dayPillLabel('2026-11-06', NOW), 'Yesterday');
	assert.equal(dayPillLabel('2026-11-05', NOW), 'Thursday');
	assert.equal(dayPillLabel('2026-10-20', NOW), 'Tue, 20 Oct');
	assert.equal(dayPillLabel('2025-11-05', NOW), '5 Nov 2025');
	assert.equal(dayPillLabel('', NOW), '');
});

test('listRowTime shows the clock only for today', () => {
	assert.equal(listRowTime('2026-11-07', '6:47 pm', NOW), '6:47 pm');
	assert.equal(listRowTime('', '6:47 pm', NOW), '6:47 pm');
	assert.equal(listRowTime('2026-11-06', '6:47 pm', NOW), 'Yesterday');
	assert.equal(listRowTime('2026-11-04', '6:47 pm', NOW), 'Wednesday');
	assert.equal(listRowTime('2026-10-20', '6:47 pm', NOW), '20/10/2026');
});

test('resolveMessageDays carries the day forward', () => {
	const days = resolveMessageDays([{}, { date: '2026-11-05' }, {}, { date: '2026-11-07' }, { date: 'bad' }]);
	assert.deepEqual(days, ['', '2026-11-05', '2026-11-05', '2026-11-07', '2026-11-07']);
});

test('addMinutesToClock wraps noon and midnight', () => {
	assert.equal(addMinutesToClock('3:31 pm', 1), '3:32 pm');
	assert.equal(addMinutesToClock('11:59 am', 1), '12:00 pm');
	assert.equal(addMinutesToClock('11:59 pm', 2), '12:01 am');
	assert.equal(addMinutesToClock('12:00 am', -1), '11:59 pm');
	assert.equal(addMinutesToClock('soon', 1), 'soon');
});

test('messengerStamp shows the day until it is today', () => {
	assert.equal(messengerStamp('2026-11-07', '6:42 pm', NOW), '6:42 PM');
	assert.equal(messengerStamp('2026-11-06', '12:28 pm', NOW), '6 NOV AT 12:28 PM');
	assert.equal(messengerStamp('2025-11-06', '12:28 pm', NOW), '6 NOV 2025 AT 12:28 PM');
});

test('messengerGapStarts breaks on a new day or a 10 minute pause', () => {
	const days = ['2026-11-06', '2026-11-06', '2026-11-06', '2026-11-07'];
	const clocks = ['12:28 pm', '12:29 pm', '12:43 pm', '12:44 pm'];
	assert.deepEqual(messengerGapStarts(days, clocks), [true, false, true, true]);
});

test('messengerRowTime rewrites list dates and keeps clocks', () => {
	assert.equal(messengerRowTime('14/08/2024'), '14 Aug 2024');
	assert.equal(messengerRowTime('Friday'), 'Fri');
	assert.equal(messengerRowTime('6:42 pm'), '6:42 pm');
});
