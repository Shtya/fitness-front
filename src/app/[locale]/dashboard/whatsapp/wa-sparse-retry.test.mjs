import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldProviderBackfill, SPARSE_RETRY_MS } from './whatsapp-message-sync.js';

const now = Date.now();

test('an empty chat pulled moments ago is not pulled again', () => {
	const result = shouldProviderBackfill({ canSync: true, itemCount: 0, lastProviderSyncAt: now - 60_000, now });
	assert.deepEqual(result, { needed: false, reason: 'hydrated_empty' });
});

test('an empty chat is asked again after the retry window', () => {
	const result = shouldProviderBackfill({ canSync: true, itemCount: 0, lastProviderSyncAt: now - SPARSE_RETRY_MS - 1, now });
	assert.deepEqual(result, { needed: true, reason: 'empty_retry' });
});

test('a sparse chat is retried only after the window', () => {
	assert.equal(shouldProviderBackfill({ canSync: true, itemCount: 2, lastProviderSyncAt: now - 1000, now }).needed, false);
	assert.deepEqual(
		shouldProviderBackfill({ canSync: true, itemCount: 2, lastProviderSyncAt: now - SPARSE_RETRY_MS - 1, now }),
		{ needed: true, reason: 'sparse_retry' },
	);
});

test('a full local thread never triggers a phone pull on open', () => {
	assert.equal(shouldProviderBackfill({ canSync: true, itemCount: 40, lastProviderSyncAt: 1, now }).needed, false);
});
