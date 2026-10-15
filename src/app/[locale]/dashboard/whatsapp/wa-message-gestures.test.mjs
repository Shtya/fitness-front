import test from 'node:test';
import assert from 'node:assert/strict';
import {
	dragRowOffset,
	ROW_ACTION_WIDTH,
	settleRowSwipe,
	SWIPE_REPLY_TRIGGER_PX,
	swipeReplyState,
} from './wa-message-gestures.js';
import { pullDistance, PULL_TRIGGER_PX } from './use-pull-to-refresh.js';
import { badgeTitle } from '../../../../lib/app-badge.js';

test('swipe-to-reply waits for an axis and gives vertical scroll priority', () => {
	assert.equal(swipeReplyState({ dx: 4, dy: 3 }).axis, 'none');
	assert.equal(swipeReplyState({ dx: 12, dy: 30 }).axis, 'y');
	assert.equal(swipeReplyState({ dx: 40, dy: 5 }).axis, 'x');
});

test('swipe-to-reply pulls away from the start edge in LTR and RTL', () => {
	const ltr = swipeReplyState({ dx: SWIPE_REPLY_TRIGGER_PX + 4, dy: 0 });
	assert.equal(ltr.armed, true);
	assert.ok(ltr.offset > 0);
	// Leftward drag in LTR is not a reply.
	assert.equal(swipeReplyState({ dx: -80, dy: 0 }).axis, 'y');
	const rtl = swipeReplyState({ dx: -(SWIPE_REPLY_TRIGGER_PX + 4), dy: 0, rtl: true });
	assert.equal(rtl.armed, true);
	assert.ok(rtl.offset < 0);
	assert.equal(swipeReplyState({ dx: 80, dy: 0, rtl: true }).axis, 'y');
});

test('swipe-to-reply rubber-bands instead of following the finger forever', () => {
	const far = swipeReplyState({ dx: 400, dy: 0 });
	assert.ok(far.offset < 96);
	assert.ok(far.offset > SWIPE_REPLY_TRIGGER_PX);
});

test('inbox row swipe snaps open only past 40% of the action width', () => {
	const width = 2 * ROW_ACTION_WIDTH;
	assert.deepEqual(settleRowSwipe({ dx: width * 0.3 }), { offset: 0, side: null });
	assert.deepEqual(settleRowSwipe({ dx: width * 0.6 }), { offset: width, side: 'start' });
	assert.deepEqual(settleRowSwipe({ dx: -width * 0.6 }), { offset: -width, side: 'end' });
	// RTL mirrors which edge is "start".
	assert.deepEqual(settleRowSwipe({ dx: -width * 0.6, rtl: true }), { offset: -width, side: 'start' });
});

test('inbox row drag eases past the open width', () => {
	const width = 2 * ROW_ACTION_WIDTH;
	assert.equal(dragRowOffset({ dx: 50 }), 50);
	assert.ok(dragRowOffset({ dx: width + 100 }) < width + 100);
	assert.ok(dragRowOffset({ dx: -(width + 100) }) > -(width + 100));
});

test('pull-to-refresh is damped and needs a deliberate pull', () => {
	assert.equal(pullDistance(-20), 0);
	assert.ok(pullDistance(PULL_TRIGGER_PX) < PULL_TRIGGER_PX);
	assert.ok(pullDistance(PULL_TRIGGER_PX * 2) >= PULL_TRIGGER_PX);
	assert.equal(pullDistance(10_000), 96);
});

test('badge title fallback prefixes the unread count once', () => {
	assert.equal(badgeTitle('So7ba', 3), '(3) So7ba');
	assert.equal(badgeTitle('(3) So7ba', 5), '(5) So7ba');
	assert.equal(badgeTitle('(5) So7ba', 0), 'So7ba');
	assert.equal(badgeTitle('So7ba', 250), '(99+) So7ba');
	assert.equal(badgeTitle('(99+) So7ba', 1), '(1) So7ba');
});
