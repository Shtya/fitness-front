import assert from 'node:assert/strict';
import test from 'node:test';
import { agentRowBadge } from './agent-events.js';
import { AGENT_COPY, agentCopy, reasonLabel, splitList } from './agent-copy.js';

test('chat-list badge only marks chats that need attention', () => {
	assert.equal(agentRowBadge(null), null);
	assert.equal(agentRowBadge({ mode: 'inherit', effectiveMode: 'auto', status: 'idle' }), null);
	assert.equal(agentRowBadge({ mode: 'auto', effectiveMode: 'auto', status: 'idle' }), 'auto');
	assert.equal(agentRowBadge({ mode: 'suggest', effectiveMode: 'suggest', status: 'idle' }), 'suggest');
	assert.equal(agentRowBadge({ mode: 'off', effectiveMode: 'off', status: 'idle' }), null);
	assert.equal(
		agentRowBadge({ mode: 'inherit', effectiveMode: 'suggest', pendingSuggestion: { text: 'x' } }),
		'draft',
	);
	assert.equal(agentRowBadge({ mode: 'inherit', effectiveMode: 'auto', status: 'handoff' }), 'handoff');
});

test('topic lists accept Arabic and Latin commas and new lines', () => {
	assert.deepEqual(splitList('أسعار، مواعيد , refunds\nshipping'), ['أسعار', 'مواعيد', 'refunds', 'shipping']);
	assert.deepEqual(splitList(''), []);
});

test('agent copy has the same keys in Arabic and English', () => {
	const keys = value =>
		Object.entries(value)
			.flatMap(([key, item]) => (item && typeof item === 'object' ? keys(item).map(child => `${key}.${child}`) : [key]))
			.sort();
	assert.deepEqual(keys(AGENT_COPY.ar), keys(AGENT_COPY.en));
	assert.equal(agentCopy('ar-EG'), AGENT_COPY.ar);
	assert.equal(reasonLabel(AGENT_COPY.en, 'unknown_reason'), 'unknown_reason');
});
