import assert from 'node:assert/strict';
import test from 'node:test';
import {
	applyStoryInteractionUpdate,
	formatStoryViewTime,
	storyMessageKey,
	storyViewCountLabel,
	storyViewerName,
} from './wa-story-interactions.js';

test('storyMessageKey reads the bare id from serialized story ids', () => {
	assert.equal(storyMessageKey('true_status@broadcast_3EB0AB_2010@c.us'), '3EB0AB');
	assert.equal(storyMessageKey('false_status@broadcast_3A11_1234@lid'), '3A11');
	assert.equal(storyMessageKey('3EB0AB'), '3EB0AB');
	assert.equal(storyMessageKey(null), '');
});

test('applyStoryInteractionUpdate patches only the matching story', () => {
	const items = [
		{ id: 'a', providerStatusId: 'true_status@broadcast_OWN1_2010@c.us', isOwn: true, viewerCount: 1 },
		{ id: 'b', providerStatusId: 'false_status@broadcast_OTHER_2015@c.us', isOwn: false },
	];
	const views = applyStoryInteractionUpdate(items, {
		statusMessageId: 'OWN1',
		viewerCount: 3,
		reactionCount: 1,
	});
	assert.notEqual(views, items);
	assert.deepEqual(views[0], { ...items[0], viewerCount: 3, reactionCount: 1 });
	assert.equal(views[1], items[1]);

	const reacted = applyStoryInteractionUpdate(items, { statusMessageId: 'OTHER', myReaction: '🔥' });
	assert.equal(reacted[1].myReaction, '🔥');
	assert.equal(reacted[0], items[0]);

	const liked = applyStoryInteractionUpdate(items, { statusMessageId: 'OTHER', myLiked: true });
	assert.equal(liked[1].myLiked, true);
	assert.equal(applyStoryInteractionUpdate(liked, { statusMessageId: 'OTHER', myLiked: true }), liked);
});

test('applyStoryInteractionUpdate keeps the same array when nothing changes', () => {
	const items = [
		{ providerStatusId: 'true_status@broadcast_OWN1_2010@c.us', isOwn: true, viewerCount: 3, reactionCount: 1 },
	];
	assert.equal(
		applyStoryInteractionUpdate(items, { statusMessageId: 'OWN1', viewerCount: 3, reactionCount: 1 }),
		items,
	);
	assert.equal(applyStoryInteractionUpdate(items, { statusMessageId: 'NOPE', viewerCount: 9 }), items);
	assert.equal(applyStoryInteractionUpdate(items, null), items);
	assert.equal(applyStoryInteractionUpdate([], { statusMessageId: 'OWN1' }).length, 0);
});

test('own-story counts never leak onto other people’s stories', () => {
	const items = [{ providerStatusId: 'false_status@broadcast_X_2015@c.us', isOwn: false }];
	const next = applyStoryInteractionUpdate(items, { statusMessageId: 'X', viewerCount: 4 });
	assert.equal(next, items);
	assert.equal(next[0].viewerCount, undefined);
});

test('storyViewCountLabel speaks English and Arabic plurals', () => {
	assert.equal(storyViewCountLabel(0), 'No views yet');
	assert.equal(storyViewCountLabel(1), '1 view');
	assert.equal(storyViewCountLabel(5), '5 views');
	assert.equal(storyViewCountLabel(0, 'ar'), 'لا توجد مشاهدات بعد');
	assert.equal(storyViewCountLabel(1, 'ar'), 'مشاهدة واحدة');
	assert.equal(storyViewCountLabel(2, 'ar'), 'مشاهدتان');
	assert.equal(storyViewCountLabel(7, 'ar'), '7 مشاهدات');
	assert.equal(storyViewCountLabel(25, 'ar'), '25 مشاهدة');
});

test('storyViewerName falls back from name to phone to a generic label', () => {
	assert.equal(storyViewerName({ name: 'Mona', phone: '2010' }), 'Mona');
	assert.equal(storyViewerName({ name: '', phone: '201111111111' }), '+201111111111');
	assert.equal(storyViewerName({}, 'ar'), 'جهة اتصال');
});

test('formatStoryViewTime groups by today / yesterday / date', () => {
	const now = new Date(2026, 9, 13, 18, 0);
	assert.match(formatStoryViewTime(new Date(2026, 9, 13, 10, 5), 'en', now), /^Today, 10:05$/);
	assert.match(formatStoryViewTime(new Date(2026, 9, 12, 22, 10), 'en', now), /^Yesterday, 22:10$/);
	assert.match(formatStoryViewTime(new Date(2026, 9, 10, 9, 0), 'en', now), /^10 Oct, 09:00$/);
	assert.match(formatStoryViewTime(new Date(2026, 9, 13, 10, 5), 'ar', now), /^اليوم، /);
	assert.equal(formatStoryViewTime(null), '');
	assert.equal(formatStoryViewTime('not a date'), '');
});
