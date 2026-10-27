import assert from 'node:assert/strict';
import test from 'node:test';
import { claudeShareId, claudeSnapshotUrl, extractClaudeSnapshot } from './claude-share.js';

const ID = '62bcafed-d307-44dc-8cfc-9d63badc2668';

test('claudeShareId accepts claude.ai share links only', () => {
	assert.equal(claudeShareId(`https://claude.ai/share/${ID}`), ID);
	assert.equal(claudeShareId(`https://claude.ai/share/${ID.toUpperCase()}/`), ID);
	assert.equal(claudeShareId(`https://claude.ai/chat/${ID}`), null);
	assert.equal(claudeShareId(`https://evil.com/share/${ID}`), null);
	assert.equal(claudeShareId('d'), null);
	assert.match(claudeSnapshotUrl(ID), new RegExp(`/api/chat_snapshots/${ID}\\?`));
});

test('extractClaudeSnapshot maps human/assistant text and skips tools', () => {
	const share = extractClaudeSnapshot({
		snapshot_name: 'Gym plan',
		chat_messages: [
			{ uuid: 'a', sender: 'human', content: [{ type: 'text', text: 'Make me a plan' }] },
			{
				uuid: 'b',
				sender: 'assistant',
				content: [
					{ type: 'thinking', thinking: 'hidden' },
					{ type: 'text', text: '# Plan' },
					{ type: 'tool_use', name: 'x' },
					{ type: 'text', text: 'Day 1' },
				],
			},
			{ uuid: 'c', sender: 'assistant', text: 'Legacy text field' },
			{ uuid: 'd', sender: 'assistant', content: [{ type: 'tool_result' }] },
		],
	});
	assert.equal(share.title, 'Gym plan');
	assert.deepEqual(share.messages.map(m => [m.id, m.role, m.text]), [
		['a', 'user', 'Make me a plan'],
		['b', 'assistant', '# Plan\n\nDay 1'],
		['c', 'assistant', 'Legacy text field'],
	]);
});

test('extractClaudeSnapshot returns null when there is nothing readable', () => {
	assert.equal(extractClaudeSnapshot(null), null);
	assert.equal(extractClaudeSnapshot({ chat_messages: [] }), null);
});
