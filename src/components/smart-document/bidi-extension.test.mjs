import test from 'node:test';
import assert from 'node:assert/strict';
import { getSchema } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import { buildBidiDecorations } from './bidi-extension.js';

const schema = getSchema([StarterKit, TableKit]);
const p = text => ({ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] });
const doc = schema.nodeFromJSON({
	type: 'doc',
	content: [
		{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '11) تاريخ الـTopologies' }] },
		p('Router بيوصل الشبكات ببعض (زي LAN و WAN).'),
		p('The OSI model has seven layers.'),
		{ type: 'bulletList', content: [{ type: 'listItem', content: [p('الطبقة الأولى Physical')] }, { type: 'listItem', content: [p('Data Link layer')] }] },
		{
			type: 'table',
			content: [
				{ type: 'tableRow', content: [{ type: 'tableHeader', content: [p('المصطلح')] }, { type: 'tableHeader', content: [p('Meaning')] }] },
				{ type: 'tableRow', content: [{ type: 'tableCell', content: [p('Switch')] }, { type: 'tableCell', content: [p('بيوزع الداتا')] }] },
			],
		},
		{ type: 'codeBlock', content: [{ type: 'text', text: 'ping 8.8.8.8 # الاختبار' }] },
	],
});

const describe = (set) =>
	set.find().map(d => {
		const attrs = d.type.attrs || {};
		// node decorations carry only `dir`; inline runs also carry a class
		if (!attrs.class) return { kind: 'node', dir: attrs.dir, text: doc.nodeAt(d.from).type.name };
		return { kind: attrs.class, dir: attrs.dir, text: doc.textBetween(d.from, d.to) };
	});

test('auto: each top-level block takes the direction of its own first letter', () => {
	const out = describe(buildBidiDecorations(doc, 'auto', 'rtl'));
	const nodes = out.filter(d => d.kind === 'node');
	assert.deepEqual(
		nodes.map(d => `${d.text}:${d.dir}`),
		['heading:rtl', 'paragraph:ltr', 'paragraph:ltr', 'bulletList:rtl', 'table:rtl', 'codeBlock:ltr'],
	);
});

test('rtl: everything follows the document (containers say so explicitly); English runs are isolated', () => {
	const out = describe(buildBidiDecorations(doc, 'rtl', 'rtl'));
	assert.deepEqual(out.filter(d => d.kind === 'node').map(d => `${d.text}:${d.dir}`), ['bulletList:rtl', 'table:rtl', 'codeBlock:ltr']);
	const runs = out.filter(d => d.kind === 'sd-bidi-run').map(d => d.text);
	assert.ok(runs.includes('Topologies'));
	assert.ok(runs.includes('Router'));
	assert.ok(runs.includes('LAN') && runs.includes('WAN'));
	assert.ok(runs.includes('Physical'));
	assert.ok(runs.includes('Switch') && runs.includes('Meaning'));
	assert.ok(!runs.some(r => r.includes('ping')), 'code is never split into runs');
	assert.deepEqual(out.filter(d => d.kind === 'sd-bidi-num').map(d => d.text), ['11)']);
});

test('ltr: Arabic words inside English blocks are isolated instead', () => {
	const out = describe(buildBidiDecorations(doc, 'ltr', 'ltr'));
	const runs = out.filter(d => d.kind === 'sd-bidi-run').map(d => `${d.text}:${d.dir}`);
	assert.ok(runs.includes('بيوزع الداتا:rtl'));
	assert.equal(out.filter(d => d.kind === 'sd-bidi-num').length, 0, 'the number prefix is only isolated in RTL blocks');
});
