import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clock, isWordSelection, lineKey, markWords, markdownText, normalizeDay, parseInline, parseMarkdown, sentenceAround, youtubeId, youtubeStart } from './english-model.js';

test('youtube links', () => {
	assert.equal(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30'), 'dQw4w9WgXcQ');
	assert.equal(youtubeId('youtu.be/dQw4w9WgXcQ?si=x'), 'dQw4w9WgXcQ');
	assert.equal(youtubeId('https://m.youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
	assert.equal(youtubeId('https://www.youtube.com/@EnglishWithLucy'), null);
	assert.equal(youtubeId('not a link'), null);
	assert.equal(youtubeStart('https://youtu.be/dQw4w9WgXcQ?t=1m30s'), 90);
	assert.equal(youtubeStart('https://youtu.be/dQw4w9WgXcQ?t=45'), 45);
});

test('marks words with their usual endings, longest phrase first', () => {
	const words = [
		{ id: 'a', text: 'introduce' },
		{ id: 'b', text: 'pick up' },
		{ id: 'c', text: 'pick' },
		{ id: 'd', text: 'study' },
	];
	const parts = markWords('Let me introduce myself. I introduced Sam, picking up English; she studies and picks.', words);
	const hits = parts.filter(p => p.word).map(p => `${p.text}=${p.word.id}`);
	assert.deepEqual(hits, ['introduce=a', 'introduced=a', 'picking up=b', 'studies=d', 'picks=c']);
	assert.deepEqual(
		markWords('I pick up words', words)
			.filter(p => p.word)
			.map(p => p.word.id),
		['b'],
	);
	// a phrase's first word takes its usual endings too
	assert.deepEqual(
		markWords("I'm looking forward to it; she looks forward to it", [{ id: 'f', text: 'look forward to' }])
			.filter(p => p.word)
			.map(p => p.text),
		['looking forward to', 'looks forward to'],
	);
	// no partial-word matches
	assert.equal(markWords('reintroduce', words).filter(p => p.word).length, 0);
	assert.equal(markWords('hello', []).length, 1);
	assert.equal(parts.map(p => p.text).join(''), 'Let me introduce myself. I introduced Sam, picking up English; she studies and picks.');
});

test('markdown transcript: blocks', () => {
	const md = `# Ordering Fast Food (B1)

## Introduction

**Jessica:** Hello, everyone! I'm Jessica,
and today we practise.
**Tom:** Hi Jessica!

- Can I get a burger?
- No pickles, please.

1. Order
2. Pay

> Tip: speak slowly.

---`;
	const b = parseMarkdown(md);
	assert.deepEqual(
		b.map(x => x.type),
		['h1', 'h2', 'p', 'p', 'ul', 'ol', 'quote', 'hr'],
	);
	assert.equal(b[2].text, "**Jessica:** Hello, everyone! I'm Jessica, and today we practise.");
	assert.deepEqual(b[4].items, ['Can I get a burger?', 'No pickles, please.']);
	assert.equal(markdownText('## Hi\n**Bob:** a *b*').split('\n').join('|'), 'Hi|Bob: a b');
});

test('markdown transcript: inline', () => {
	assert.deepEqual(parseInline('**Jessica:** Hello _there_ `x` [link](http://a.b)'), [
		{ text: 'Jessica:', b: true },
		{ text: ' Hello ' },
		{ text: 'there', i: true },
		{ text: ' ' },
		{ text: 'x', code: true },
		{ text: ' ' },
		// a link keeps where it goes (Contents → "#s2", or a web address)
		{ text: 'link', href: 'http://a.b' },
	]);
	assert.deepEqual(parseInline('1. [Miqyas in one **minute**](#s1)'), [
		{ text: '1. ' },
		{ text: 'Miqyas in one ', href: '#s1' },
		{ text: 'minute', b: true, href: '#s1' },
	]);
	// unclosed markers and snake_case stay text
	assert.deepEqual(parseInline('5 * 3 and drive_thru and **open'), [{ text: '5 * 3 and drive_thru and **open' }]);
	assert.deepEqual(parseInline('\\*not italic\\*'), [{ text: '*not italic*' }]);
});

test('sentence around a word, selections, misc', () => {
	const text = 'Hi there. My name is Ahmed and I work as an engineer. What about you?';
	assert.equal(sentenceAround(text, 'engineer'), 'My name is Ahmed and I work as an engineer.');
	assert.equal(sentenceAround(text, 'missing'), '');
	assert.ok(isWordSelection('look forward to'));
	assert.ok(!isWordSelection('a'));
	assert.ok(!isWordSelection('one two three four five six seven'));
	assert.ok(!isWordSelection('123'));
	assert.equal(clock(305), '5:05');
	assert.deepEqual(normalizeDay(null), { videoUrl: '', transcript: '', words: [], questions: [], speaking: [], learned: [], mine: {}, marks: [] });
	// line marks keep their id + key; broken ones are dropped
	assert.deepEqual(normalizeDay({ marks: [{ id: 'm1', key: 'p:x:3', text: 'abc' }, { id: 'm2' }, null] }).marks, [{ id: 'm1', key: 'p:x:3', text: 'abc' }]);
	// a line's fingerprint ignores spacing and case, and changes when the text does
	assert.equal(lineKey('p', ' Every  number '), lineKey('p', 'every number'));
	assert.notEqual(lineKey('p', 'Every number'), lineKey('p', 'Every numbers'));
	assert.notEqual(lineKey('p', 'Every number'), lineKey('li', 'Every number'));
});

test('markdown transcript: <a id> lines are jump targets, not text', () => {
	const blocks = parseMarkdown('## Contents\n1. [Who it is for](#s2)\n\n<a id="s2"></a>\n## 2) Who it is for\nText');
	assert.deepEqual(blocks.map(b => b.type), ['h2', 'ol', 'anchor', 'h2', 'p']);
	assert.equal(blocks[2].id, 's2');
	assert.equal(markdownText('<a id="s2"></a>\nHello'), 'Hello');
});
