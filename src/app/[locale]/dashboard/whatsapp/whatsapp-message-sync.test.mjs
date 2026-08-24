import assert from 'node:assert/strict';
import test from 'node:test';
import {
	MESSAGE_PAGE_SIZE,
	PROVIDER_SYNC_FRESH_MS,
	shouldProviderBackfill,
	shouldSkipOpenChatNetwork,
} from './whatsapp-message-sync.js';

const now = 1_700_000_000_000;

test('short hydrated thread does not backfill on reopen', () => {
	const result = shouldProviderBackfill({
		canSync: true,
		itemCount: 15,
		providerHydratedAt: now - 60_000,
		now,
	});
	assert.equal(result.needed, false);
	assert.equal(result.reason, 'local_replica');
});

test('empty thread still requests first hydrate', () => {
	const result = shouldProviderBackfill({
		canSync: true,
		itemCount: 0,
		now,
	});
	assert.equal(result.needed, true);
	assert.equal(result.reason, 'empty_thread');
});

test('empty thread with inbox watermark does not look like first hydrate', () => {
	const result = shouldProviderBackfill({
		canSync: true,
		itemCount: 0,
		lastProviderSyncAt: new Date(now - 60_000).toISOString(),
		now,
	});
	assert.equal(result.needed, false);
	assert.equal(result.reason, 'hydrated_empty');
});

test('thread with local rows skips provider even without hydration watermark', () => {
	const result = shouldProviderBackfill({
		canSync: true,
		itemCount: 12,
		now,
	});
	assert.equal(result.needed, false);
	assert.equal(result.reason, 'local_replica');
});

test('stale watermark does not re-pull when local rows exist', () => {
	const result = shouldProviderBackfill({
		canSync: true,
		itemCount: 40,
		providerHydratedAt: now - PROVIDER_SYNC_FRESH_MS - 1,
		now,
	});
	assert.equal(result.needed, false);
	assert.equal(result.reason, 'local_replica');
});

test('force still requests provider backfill', () => {
	const result = shouldProviderBackfill({
		canSync: true,
		forceProvider: true,
		itemCount: 40,
		now,
	});
	assert.equal(result.needed, true);
	assert.equal(result.reason, 'forced');
});

test('page-full warm cache skips open-chat network', () => {
	assert.equal(
		shouldSkipOpenChatNetwork({
			cacheIsFresh: true,
			itemCount: MESSAGE_PAGE_SIZE,
			now,
		}),
		true,
	);
});

test('short warm hydrated cache skips open-chat network', () => {
	assert.equal(
		shouldSkipOpenChatNetwork({
			cacheIsFresh: true,
			itemCount: 8,
			providerHydratedAt: now - 10_000,
			now,
		}),
		true,
	);
});

test('short warm cache skips open-chat network even without watermark', () => {
	assert.equal(
		shouldSkipOpenChatNetwork({
			cacheIsFresh: true,
			itemCount: 8,
			now,
		}),
		true,
	);
});

test('force provider never skips network', () => {
	assert.equal(
		shouldSkipOpenChatNetwork({
			cacheIsFresh: true,
			forceProvider: true,
			itemCount: 100,
			providerHydratedAt: now,
			now,
		}),
		false,
	);
});
