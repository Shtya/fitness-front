import assert from 'node:assert/strict';
import test from 'node:test';
import {
	formatPageLockCountdown,
	isPageLockAwayExpired,
	isPageLockIdleExpired,
	isPageLockPin,
	normalizePageLockStatus,
	pageLockErrorDetails,
	pageLockPasscodeError,
	pageLockPinError,
	shouldStartPageLocked,
} from './whatsapp-page-lock.js';

const copy = { tooShort: 'short', tooLong: 'long', onlySpaces: 'spaces' };

test('page lock status defaults to off with a 5 minute timer', () => {
	const status = normalizePageLockStatus(null);
	assert.equal(status.enabled, false);
	assert.equal(status.autoLockMinutes, 5);
	assert.equal(normalizePageLockStatus({ autoLockMinutes: 7 }).autoLockMinutes, 5);
	assert.equal(normalizePageLockStatus({ autoLockMinutes: 0 }).autoLockMinutes, 0);
});

test('page starts locked unless this tab was unlocked recently', () => {
	const now = 1_000_000_000;
	const on = { enabled: true, autoLockMinutes: 5, lockOnOpen: false };
	assert.equal(shouldStartPageLocked({ enabled: false }, null, now), false);
	assert.equal(shouldStartPageLocked(on, null, now), true);
	assert.equal(shouldStartPageLocked(on, { unlockedAt: now - 1000, lastActivity: now - 60_000 }, now), false);
	assert.equal(shouldStartPageLocked(on, { unlockedAt: now - 1000, lastActivity: now - 6 * 60_000 }, now), true);
	assert.equal(shouldStartPageLocked({ ...on, lockOnOpen: true }, { unlockedAt: now, lastActivity: now }, now), true);
	assert.equal(shouldStartPageLocked({ ...on, autoLockMinutes: 0 }, { unlockedAt: 1, lastActivity: 1 }, now), false);
});

test('idle timer never fires when set to 0', () => {
	assert.equal(isPageLockIdleExpired({ autoLockMinutes: 0 }, 0, 10 ** 12), false);
	assert.equal(isPageLockIdleExpired({ autoLockMinutes: 1 }, 0, 60_000), true);
	assert.equal(isPageLockIdleExpired({ autoLockMinutes: 1 }, 0, 59_999), false);
});

test('password rules and error parsing', () => {
	assert.equal(pageLockPasscodeError('123', copy), 'short');
	assert.equal(pageLockPasscodeError('    ', copy), 'spaces');
	assert.equal(pageLockPasscodeError('1234', copy), '');
	const details = pageLockErrorDetails(
		{ response: { status: 400, data: { message: ['Wrong password'], attemptsLeft: 2 } } },
		'fallback',
	);
	assert.equal(details.message, 'Wrong password');
	assert.equal(details.attemptsLeft, 2);
	assert.equal(pageLockErrorDetails(new Error('x'), 'fallback').message, 'fallback');
	assert.equal(formatPageLockCountdown(125_000), '2:05');
});

test('ask-on-open only counts on a fresh page load', () => {
	const now = 1_000_000_000;
	const status = { enabled: true, autoLockMinutes: 5, lockOnOpen: true };
	const session = { unlockedAt: now - 1000, lastActivity: now - 1000 };
	assert.equal(shouldStartPageLocked(status, session, now, { freshLoad: true }), true);
	assert.equal(shouldStartPageLocked(status, session, now, { freshLoad: false }), false);
	assert.equal(shouldStartPageLocked(status, { unlockedAt: 1, lastActivity: 1 }, now, { freshLoad: false }), true);
});

test('switching tabs only locks after being away long enough', () => {
	const now = 1_000_000_000;
	const on = { lockOnHide: true, autoLockMinutes: 5 };
	assert.equal(isPageLockAwayExpired(on, now - 30_000, now), false);
	assert.equal(isPageLockAwayExpired(on, now - 5 * 60_000, now), true);
	assert.equal(isPageLockAwayExpired({ ...on, autoLockMinutes: 0 }, now - 4 * 60_000, now), false);
	assert.equal(isPageLockAwayExpired({ ...on, autoLockMinutes: 0 }, now - 5 * 60_000, now), true);
	assert.equal(isPageLockAwayExpired({ ...on, lockOnHide: false }, now - 60 * 60_000, now), false);
	assert.equal(isPageLockAwayExpired(on, null, now), false);
});

test('a new PIN is exactly 4 digits typed twice', () => {
	const pinCopy = { pinDigits: 'digits', pinMismatch: 'mismatch' };
	assert.equal(isPageLockPin('1234'), true);
	assert.equal(isPageLockPin('123'), false);
	assert.equal(isPageLockPin('12a4'), false);
	assert.equal(pageLockPinError('12345', '12345', pinCopy), 'digits');
	assert.equal(pageLockPinError('1234', '1243', pinCopy), 'mismatch');
	assert.equal(pageLockPinError('1234', '1234', pinCopy), '');
});
