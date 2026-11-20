import test from 'node:test';
import assert from 'node:assert/strict';
import {
	applyDirectoryResponse,
	directoryRowConversation,
	indexChatDirectory,
	searchChatDirectory,
} from './workspace/wa-chat-directory.js';

const chat = (id, name, phone, at, extra = {}) => ({
	id,
	providerChatId: `${phone}@c.us`,
	type: 'individual',
	lastMessageAt: at,
	contact: { name, phoneNumber: `+${phone}` },
	group: null,
	...extra,
});

test('a full answer replaces the stored list; a delta merges and removes deleted chats', () => {
	const first = applyDirectoryResponse(null, {
		full: true,
		serverTime: 't1',
		items: [chat('a', 'Ahmed', '201000000001', '2026-11-01'), chat('b', 'Mona', '201000000002', '2026-11-02')],
	});
	assert.equal(first.items.length, 2);
	const delta = applyDirectoryResponse(first, {
		full: false,
		serverTime: 't2',
		items: [{ id: 'a', deleted: true }, chat('c', 'مريهان', '201009437066', '2026-11-03'), chat('b', 'Mona S', '201000000002', '2026-11-04')],
	});
	assert.deepEqual(delta.items.map(item => item.id).sort(), ['b', 'c']);
	assert.equal(delta.items.find(item => item.id === 'b').contact.name, 'Mona S');
	assert.equal(delta.serverTime, 't2');
	const reset = applyDirectoryResponse(delta, { full: true, serverTime: 't3', items: [chat('z', 'Zed', '201000000009', '2026-11-05')] });
	assert.deepEqual(reset.items.map(item => item.id), ['z']);
});

test('search finds any chat by name (Arabic folded) or number, best match first', () => {
	const index = indexChatDirectory([
		chat('1', 'محمد البهنسي', '201028311164', '2026-10-12'),
		chat('2', 'Ahmed Mohamed', '201000000001', '2026-11-10'),
		chat('3', 'مريهان', '201009437066', '2026-11-18'),
		chat('4', 'أحمد علي', '201000000004', '2026-11-01'),
	]);
	assert.deepEqual(searchChatDirectory(index, 'البهنسي').map(item => item.id), ['1']);
	// "احمد" also finds "أحمد" (alef forms folded).
	assert.deepEqual(searchChatDirectory(index, 'احمد').map(item => item.id), ['4']);
	assert.deepEqual(searchChatDirectory(index, '9437066').map(item => item.id), ['3']);
	// Word start ranks above a match inside the name.
	assert.deepEqual(searchChatDirectory(index, 'mohamed').map(item => item.id), ['2']);
	assert.deepEqual(searchChatDirectory(index, 'ahm').map(item => item.id), ['2']);
	assert.deepEqual(searchChatDirectory(index, '12'), []);
});

test('chats already shown from the list are not repeated', () => {
	const index = indexChatDirectory([chat('1', 'Sara', '201000000011', '2026-11-01'), chat('2', 'Sara K', '201000000012', '2026-11-02')]);
	assert.deepEqual(searchChatDirectory(index, 'sara', { excludeIds: new Set(['2']) }).map(item => item.id), ['1']);
});

test('a directory hit becomes a list row without a last message', () => {
	const row = directoryRowConversation(chat('1', 'Sara', '201000000011', '2026-11-01'));
	assert.equal(row.lastMessage, null);
	assert.equal(row.unreadCount, 0);
	assert.equal(row.fromDirectory, true);
	assert.equal(row.id, '1');
});
