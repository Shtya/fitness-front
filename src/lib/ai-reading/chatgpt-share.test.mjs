import assert from 'node:assert/strict';
import test from 'node:test';
import { extractChatGptShare, isChatGptShareUrl } from './chatgpt-share.js';

/** A share page shaped like chatgpt.com's: the loader payload streamed through enqueue("..."). */
function sharePage(messages) {
	const heap = [
		{ _1: 2 },
		'loaderData',
		{ _3: 4 },
		'routes/share.$shareId.($action)',
		{ serverResponse: { data: { title: 'Test share', linear_conversation: messages.map((m, i) => ({ id: `n${i}`, message: { id: `m${i}`, author: { role: m.role }, content: { parts: [m.text] } } })) } } },
	];
	// The real payload stores plain objects inline; decodeRemixHeap keeps non-index values as they are.
	const arg = JSON.stringify(JSON.stringify(heap));
	return `<html><body><script>window.__reactRouterContext.streamController.enqueue(${arg});</script>`
		+ `<script>window.__reactRouterContext.streamController.enqueue("P1:[{}]\\n");</script></body></html>`;
}

test('reads every message even when the text contains ");"', () => {
	const share = extractChatGptShare(
		sharePage([
			{ role: 'user', text: 'Explain console.log("hi"); please' },
			{ role: 'assistant', text: 'Call it like this: run(); then check the output.' },
		]),
	);
	assert.ok(share, 'share should be parsed');
	assert.equal(share.title, 'Test share');
	assert.deepEqual(share.messages.map(m => m.role), ['user', 'assistant']);
	assert.match(share.messages[1].text, /run\(\); then/);
});

test('a page without a conversation gives null, not a crash', () => {
	assert.equal(extractChatGptShare('<html><body>nothing here</body></html>'), null);
});

test('recognises ChatGPT share links only', () => {
	assert.equal(isChatGptShareUrl('https://chatgpt.com/share/6adcb999-7f70-83e9-873d-d279224bf43a'), true);
	assert.equal(isChatGptShareUrl('https://chat.openai.com/share/abc'), true);
	assert.equal(isChatGptShareUrl('https://example.com/share/abc'), false);
});
