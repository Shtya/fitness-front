import test from 'node:test';
import assert from 'node:assert/strict';
import { getSchema, resolveExtensions } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import { MarkdownManager } from '@tiptap/markdown';
import { EditorState } from '@tiptap/pm/state';
import { Node } from '@tiptap/pm/model';
import {
	columnWidthsTransaction,
	firstBodyRow,
	rowActionTransaction,
	rowIndexAfter,
	tableAt,
} from './table-rows.js';

const extensions = resolveExtensions([StarterKit, TableKit]);
const schema = getSchema(extensions);
const manager = new MarkdownManager({ extensions });

const md = ['| # | Module |', '| --- | --- |', '| 1 | Dashboard |', '| 2 | Security |', '| 3 | Clients |'].join('\n');

function stateFrom(markdown) {
	return EditorState.create({ schema, doc: Node.fromJSON(schema, manager.parse(markdown)) });
}

function tableInfo(state) {
	let tablePos = -1;
	state.doc.descendants((node, pos) => {
		if (tablePos < 0 && node.type.name === 'table') tablePos = pos;
		return tablePos < 0;
	});
	return { tablePos, table: state.doc.nodeAt(tablePos) };
}

const modules = state => {
	const { table } = tableInfo(state);
	const out = [];
	table.forEach(row => out.push(row.child(1).textContent));
	return out;
};

test('finds the table and row around a position, header row first', () => {
	const state = stateFrom(md);
	const { tablePos, table } = tableInfo(state);
	assert.equal(firstBodyRow(table), 1);
	// a position inside the third row's first cell
	let inside = -1;
	table.forEach((row, offset, index) => {
		if (index === 2) inside = tablePos + 1 + offset + 3;
	});
	const info = tableAt(state, inside);
	assert.equal(info.rowIndex, 2);
	assert.equal(info.tablePos, tablePos);
});

test('moves a body row up and down but never above the header', () => {
	let state = stateFrom(md);
	const { tablePos } = tableInfo(state);
	state = state.apply(rowActionTransaction(state, { tablePos, rowIndex: 3, action: 'up' }));
	assert.deepEqual(modules(state), ['Module', 'Dashboard', 'Clients', 'Security']);
	state = state.apply(rowActionTransaction(state, { tablePos, rowIndex: 1, action: 'down' }));
	assert.deepEqual(modules(state), ['Module', 'Clients', 'Dashboard', 'Security']);
	assert.equal(rowActionTransaction(state, { tablePos, rowIndex: 1, action: 'up' }), null);
	assert.equal(rowActionTransaction(state, { tablePos, rowIndex: 0, action: 'down' }), null);
	assert.equal(rowActionTransaction(state, { tablePos, rowIndex: 3, action: 'down' }), null);
	assert.equal(rowIndexAfter('up', 3), 2);
});

test('inserts, duplicates and deletes rows, and the Markdown follows', () => {
	let state = stateFrom(md);
	const { tablePos } = tableInfo(state);
	state = state.apply(rowActionTransaction(state, { tablePos, rowIndex: 1, action: 'duplicate' }));
	assert.deepEqual(modules(state), ['Module', 'Dashboard', 'Dashboard', 'Security', 'Clients']);
	state = state.apply(rowActionTransaction(state, { tablePos, rowIndex: 2, action: 'delete' }));
	state = state.apply(rowActionTransaction(state, { tablePos, rowIndex: 3, action: 'insertBelow' }));
	assert.deepEqual(modules(state), ['Module', 'Dashboard', 'Security', 'Clients', '']);
	const { table } = tableInfo(state);
	assert.equal(table.child(4).child(0).type.name, 'tableCell');
	const out = manager.serialize(state.doc.toJSON());
	assert.match(out, /\|\s*3\s*\|\s*Clients\s*\|/);
	assert.ok(out.indexOf('Security') < out.indexOf('Clients'));
});

test('keeps at least one body row', () => {
	let state = stateFrom(['| A |', '| --- |', '| only |'].join('\n'));
	const { tablePos } = tableInfo(state);
	assert.equal(rowActionTransaction(state, { tablePos, rowIndex: 1, action: 'delete' }), null);
});

test('column widths go on every cell and do not change the Markdown', () => {
	let state = stateFrom(md);
	const { tablePos } = tableInfo(state);
	const before = manager.serialize(state.doc.toJSON());
	state = state.apply(columnWidthsTransaction(state, tablePos, [60, 320.4]));
	const { table } = tableInfo(state);
	table.forEach(row => {
		assert.deepEqual(row.child(0).attrs.colwidth, [60]);
		assert.deepEqual(row.child(1).attrs.colwidth, [320]);
	});
	assert.equal(manager.serialize(state.doc.toJSON()), before);
	assert.equal(columnWidthsTransaction(state, tablePos, [60]), null);
});
