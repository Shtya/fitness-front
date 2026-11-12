import { Fragment } from '@tiptap/pm/model';

/**
 * Row edits for the Preview's tables, as ProseMirror transactions on the table node.
 * Rows that hold header cells stay on top: body rows never move above them.
 */

/** Table node, its position and the row index around a document position, or null. */
export function tableAt(state, pos) {
	const $pos = state.doc.resolve(Math.max(0, Math.min(pos, state.doc.content.size)));
	for (let depth = $pos.depth; depth > 0; depth -= 1) {
		const node = $pos.node(depth);
		if (node.type.name === 'tableRow') {
			const table = $pos.node(depth - 1);
			return {
				table,
				tablePos: $pos.before(depth - 1),
				rowIndex: $pos.index(depth - 1),
			};
		}
	}
	return null;
}

export function isHeaderRow(row) {
	let header = row.childCount > 0;
	row.forEach(cell => {
		if (cell.type.name !== 'tableHeader') header = false;
	});
	return header;
}

/** Index of the first row that is not a header row (rows above it cannot be moved). */
export function firstBodyRow(table) {
	let index = 0;
	while (index < table.childCount && isHeaderRow(table.child(index))) index += 1;
	return index;
}

function emptyRowLike(row) {
	const cells = [];
	row.forEach(cell => {
		const type = cell.type.name === 'tableHeader' ? cell.type.schema.nodes.tableCell || cell.type : cell.type;
		cells.push(type.createAndFill({ ...cell.attrs, colspan: 1, rowspan: 1 }));
	});
	return row.type.create(row.attrs, cells);
}

/**
 * The transaction for `action` on the row at `rowIndex`, or null when it does not apply.
 * Actions: up, down, insertAbove, insertBelow, duplicate, delete.
 */
export function rowActionTransaction(state, { tablePos, rowIndex, action }) {
	const table = state.doc.nodeAt(tablePos);
	if (!table || table.type.name !== 'table') return null;
	const rows = [];
	table.forEach(row => rows.push(row));
	const row = rows[rowIndex];
	if (!row) return null;
	const top = firstBodyRow(table);
	if (rowIndex < top) return null;
	const next = rows.slice();
	if (action === 'up') {
		if (rowIndex <= top) return null;
		[next[rowIndex - 1], next[rowIndex]] = [next[rowIndex], next[rowIndex - 1]];
	} else if (action === 'down') {
		if (rowIndex >= rows.length - 1) return null;
		[next[rowIndex + 1], next[rowIndex]] = [next[rowIndex], next[rowIndex + 1]];
	} else if (action === 'insertAbove') {
		next.splice(rowIndex, 0, emptyRowLike(row));
	} else if (action === 'insertBelow') {
		next.splice(rowIndex + 1, 0, emptyRowLike(row));
	} else if (action === 'duplicate') {
		next.splice(rowIndex + 1, 0, row.copy(row.content));
	} else if (action === 'delete') {
		// The last body row goes with the table only if the user deletes the table; keep one.
		if (rows.length - top <= 1) return null;
		next.splice(rowIndex, 1);
	} else {
		return null;
	}
	return state.tr.replaceWith(tablePos, tablePos + table.nodeSize, table.copy(Fragment.from(next)));
}

/** Where the moved/new row ends up, for keeping the actions on it. */
export function rowIndexAfter(action, rowIndex) {
	if (action === 'up') return rowIndex - 1;
	if (action === 'down' || action === 'insertBelow' || action === 'duplicate') return rowIndex + 1;
	return rowIndex;
}

/**
 * Transaction giving every cell of the table at `tablePos` the column widths `widths`
 * (px per column). Null when the table has merged cells or a different column count.
 */
export function columnWidthsTransaction(state, tablePos, widths) {
	const table = state.doc.nodeAt(tablePos);
	if (!table || table.type.name !== 'table') return null;
	let fits = true;
	table.forEach(row => {
		if (row.childCount !== widths.length) fits = false;
		row.forEach(cell => {
			if ((cell.attrs.colspan || 1) !== 1) fits = false;
		});
	});
	if (!fits) return null;
	const tr = state.tr;
	table.forEach((row, rowOffset) => {
		row.forEach((cell, cellOffset, index) => {
			const pos = tablePos + 1 + rowOffset + 1 + cellOffset;
			const width = Math.round(widths[index]);
			if (cell.attrs.colwidth?.[0] === width) return;
			tr.setNodeMarkup(pos, undefined, { ...cell.attrs, colwidth: [width] });
		});
	});
	return tr;
}
