'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Copy, ListPlus, Trash2 } from 'lucide-react';
import {
	columnWidthsTransaction,
	firstBodyRow,
	rowActionTransaction,
	rowIndexAfter,
	tableAt,
} from './table-rows';

const MIN_COLUMN = 48;
const EDGE = 6;

function readWidths(key) {
	if (!key) return {};
	try {
		return JSON.parse(localStorage.getItem(key) || '{}') || {};
	} catch {
		return {};
	}
}

function writeWidths(key, value) {
	if (!key) return;
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		/* widths apply to this visit */
	}
}

function scrollParent(node) {
	let current = node?.parentElement;
	while (current && current !== document.body) {
		const style = getComputedStyle(current);
		if (/(auto|scroll)/.test(style.overflowY) && current.scrollHeight > current.clientHeight) return current;
		current = current.parentElement;
	}
	return null;
}

function isRtl(element) {
	return getComputedStyle(element).direction === 'rtl';
}

/** First row of the table's body when it is the header row (all <th>). */
function headerRowOf(table) {
	const row = table.querySelector(':scope > tbody > tr');
	if (!row || !row.children.length) return null;
	return [...row.children].every(cell => cell.tagName === 'TH') ? row : null;
}

/**
 * Table tools for the Preview: drag a column edge to resize (both directions, saved per
 * document), the header row follows while the table scrolls by, and a hovered row shows
 * actions beside it. Render the returned overlay inside a position:relative host that
 * wraps the editor.
 */
export function useTableTools(editor, { hostRef, layoutKey, labels = {} }) {
	const [handle, setHandle] = useState(null); // { left, top, height, table, column }
	const [row, setRow] = useState(null); // { top, left, side, tablePos, rowIndex, canUp, canDown, canDelete }
	const dragRef = useRef(null);
	const hideTimer = useRef(null);

	const tableIndexOf = useCallback(
		tableEl => (editor ? [...editor.view.dom.querySelectorAll('table')].indexOf(tableEl) : -1),
		[editor],
	);

	/* Saved widths go back on the tables once the document is parsed. */
	useEffect(() => {
		if (!editor || editor.isDestroyed || !layoutKey) return;
		const saved = readWidths(layoutKey);
		if (!Object.keys(saved).length) return;
		let index = -1;
		let tr = editor.state.tr;
		let changed = false;
		editor.state.doc.descendants((node, pos) => {
			if (node.type.name !== 'table') return true;
			index += 1;
			const widths = saved[index];
			if (Array.isArray(widths) && widths.length) {
				const next = columnWidthsTransaction(editor.state, pos, widths);
				if (next?.steps.length) {
					next.steps.forEach(step => tr.step(step));
					changed = true;
				}
			}
			return false;
		});
		if (changed) editor.view.dispatch(tr.setMeta('addToHistory', false));
	}, [editor, layoutKey]);

	/* The header row follows the scroll until its table has gone by. */
	useEffect(() => {
		if (!editor || editor.isDestroyed) return undefined;
		const root = editor.view.dom;
		const scroller = scrollParent(root) || root.closest('.sd-canvas') || window;
		let frame = 0;
		const update = () => {
			frame = 0;
			const top = scroller === window ? 0 : scroller.getBoundingClientRect().top;
			root.querySelectorAll('.tableWrapper > table').forEach(table => {
				const header = headerRowOf(table);
				if (!header) return;
				const rect = table.getBoundingClientRect();
				const room = rect.height - header.offsetHeight - 8;
				const shift = Math.min(room, top - rect.top);
				if (shift > 0) {
					table.style.setProperty('--sd-head-shift', `${shift}px`);
					table.classList.add('is-stuck');
				} else if (table.classList.contains('is-stuck')) {
					table.style.removeProperty('--sd-head-shift');
					table.classList.remove('is-stuck');
				}
			});
		};
		const schedule = () => {
			if (!frame) frame = requestAnimationFrame(update);
		};
		scroller.addEventListener('scroll', schedule, { passive: true });
		window.addEventListener('resize', schedule);
		editor.on('update', schedule);
		schedule();
		return () => {
			if (frame) cancelAnimationFrame(frame);
			scroller.removeEventListener('scroll', schedule);
			window.removeEventListener('resize', schedule);
			editor.off('update', schedule);
		};
	}, [editor]);

	/* Hover: a resize handle on a column edge, and actions beside the hovered body row. */
	useEffect(() => {
		const host = hostRef.current;
		if (!editor || editor.isDestroyed || !host) return undefined;
		const root = editor.view.dom;
		const onMove = event => {
			if (dragRef.current) return;
			const target = event.target instanceof Element ? event.target : null;
			if (target?.closest('[data-sd-table-tool]')) {
				clearTimeout(hideTimer.current);
				return;
			}
			const cell = target?.closest('th, td');
			const table = cell?.closest('.tableWrapper > table');
			if (!cell || !table || !root.contains(table)) {
				setHandle(null);
				clearTimeout(hideTimer.current);
				hideTimer.current = setTimeout(() => setRow(null), 220);
				return;
			}
			clearTimeout(hideTimer.current);
			const hostRect = host.getBoundingClientRect();
			const tableRect = table.getBoundingClientRect();
			const wrapperRect = table.parentElement.getBoundingClientRect();
			const rtl = isRtl(table);

			// Column edge under the pointer: each cell's end edge, or its start edge (= the
			// end edge of the cell before it).
			const rect = cell.getBoundingClientRect();
			const endX = rtl ? rect.left : rect.right;
			const startX = rtl ? rect.right : rect.left;
			const rowCells = [...cell.parentElement.children];
			let column = -1;
			let edgeX = 0;
			if (Math.abs(event.clientX - endX) <= EDGE) {
				column = rowCells.indexOf(cell);
				edgeX = endX;
			} else if (Math.abs(event.clientX - startX) <= EDGE && rowCells.indexOf(cell) > 0) {
				column = rowCells.indexOf(cell) - 1;
				edgeX = startX;
			}
			if (column >= 0 && edgeX >= wrapperRect.left - 1 && edgeX <= wrapperRect.right + 1) {
				setHandle({
					left: edgeX - hostRect.left,
					top: tableRect.top - hostRect.top,
					height: Math.min(tableRect.height, wrapperRect.height),
					table,
					column,
					rtl,
				});
			} else {
				setHandle(null);
			}

			// Row actions: body rows only.
			const rowEl = cell.parentElement;
			const pos = editor.view.posAtDOM(cell, 0);
			const info = tableAt(editor.state, pos);
			if (!info) return;
			const top = firstBodyRow(info.table);
			if (info.rowIndex < top) {
				setRow(null);
				return;
			}
			const rowRect = rowEl.getBoundingClientRect();
			// Beside the table on its end side when there is room, else just inside its edge.
			const space = rtl ? wrapperRect.left - hostRect.left : hostRect.right - wrapperRect.right;
			setRow({
				top: rowRect.top - hostRect.top,
				x: rtl ? wrapperRect.left - hostRect.left : wrapperRect.right - hostRect.left,
				inside: space < 46,
				rtl,
				tablePos: info.tablePos,
				rowIndex: info.rowIndex,
				canUp: info.rowIndex > top,
				canDown: info.rowIndex < info.table.childCount - 1,
				canDelete: info.table.childCount - top > 1,
			});
		};
		const onLeave = () => {
			if (dragRef.current) return;
			setHandle(null);
			clearTimeout(hideTimer.current);
			hideTimer.current = setTimeout(() => setRow(null), 220);
		};
		host.addEventListener('mousemove', onMove);
		host.addEventListener('mouseleave', onLeave);
		return () => {
			host.removeEventListener('mousemove', onMove);
			host.removeEventListener('mouseleave', onLeave);
			clearTimeout(hideTimer.current);
		};
	}, [editor, hostRef]);

	const startResize = event => {
		if (!handle || !editor) return;
		event.preventDefault();
		const { table, column, rtl } = handle;
		const header = table.querySelector(':scope > tbody > tr');
		if (!header) return;
		// Freeze every column at its current width, so only the dragged one changes.
		const widths = [...header.children].map(cell => cell.getBoundingClientRect().width);
		const cols = [...table.querySelectorAll(':scope > colgroup > col')];
		const apply = list => {
			list.forEach((width, index) => {
				if (cols[index]) {
					cols[index].style.width = `${width}px`;
					cols[index].style.minWidth = '';
				}
			});
			table.style.width = `${list.reduce((sum, width) => sum + width, 0)}px`;
			table.style.minWidth = '';
		};
		apply(widths);
		const start = { x: event.clientX, width: widths[column] };
		dragRef.current = { widths };
		document.body.classList.add('sd-col-resizing');
		const onMove = moveEvent => {
			const delta = (moveEvent.clientX - start.x) * (rtl ? -1 : 1);
			const next = widths.slice();
			next[column] = Math.max(MIN_COLUMN, start.width + delta);
			dragRef.current.widths = next;
			apply(next);
			const hostRect = hostRef.current.getBoundingClientRect();
			const cell = header.children[column].getBoundingClientRect();
			setHandle(current => (current ? { ...current, left: (rtl ? cell.left : cell.right) - hostRect.left } : current));
		};
		const onUp = () => {
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
			document.body.classList.remove('sd-col-resizing');
			const final = dragRef.current?.widths || widths;
			dragRef.current = null;
			const pos = editor.view.posAtDOM(header.children[0], 0);
			const info = tableAt(editor.state, pos);
			if (!info) return;
			const tr = columnWidthsTransaction(editor.state, info.tablePos, final);
			if (tr?.steps.length) editor.view.dispatch(tr);
			const index = tableIndexOf(table);
			if (index >= 0 && layoutKey) {
				const saved = readWidths(layoutKey);
				saved[index] = final.map(width => Math.round(width));
				writeWidths(layoutKey, saved);
			}
		};
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
	};

	const runRowAction = action => {
		if (!editor || !row) return;
		const tr = rowActionTransaction(editor.state, { tablePos: row.tablePos, rowIndex: row.rowIndex, action });
		if (!tr) return;
		editor.view.dispatch(tr.scrollIntoView());
		if (action === 'delete') {
			setRow(null);
			return;
		}
		const nextIndex = rowIndexAfter(action, row.rowIndex);
		const table = editor.state.doc.nodeAt(row.tablePos);
		const top = table ? firstBodyRow(table) : 0;
		// Keep the actions on the row that moved, so it can be moved again right away.
		requestAnimationFrame(() => {
			const tableEl = editor.view.nodeDOM(row.tablePos)?.querySelector?.('table');
			const rowEl = tableEl?.querySelectorAll(':scope > tbody > tr')[nextIndex];
			const host = hostRef.current;
			if (!rowEl || !host || !table) return;
			const hostRect = host.getBoundingClientRect();
			const rowRect = rowEl.getBoundingClientRect();
			setRow(current =>
				current
					? {
							...current,
							top: rowRect.top - hostRect.top,
							rowIndex: nextIndex,
							canUp: nextIndex > top,
							canDown: nextIndex < table.childCount - 1,
							canDelete: table.childCount - top > 1,
						}
					: current,
			);
		});
	};

	const keep = event => event.preventDefault(); // keep the editor's selection and focus

	const overlay = (
		<>
			{handle ? (
				<div
					data-sd-table-tool
					className="sd-col-handle"
					style={{ left: handle.left, top: handle.top, height: handle.height }}
					onPointerDown={startResize}
					role="separator"
					aria-orientation="vertical"
					aria-label={labels.resizeColumn || 'Resize column'}
				/>
			) : null}
			{row ? (
				<div
					data-sd-table-tool
					className={`sd-row-tools${row.rtl ? ' is-rtl' : ''}${row.inside ? ' is-inside' : ''}`}
					style={{ top: row.top, left: row.x }}
					onMouseDown={keep}
					role="toolbar"
					aria-label={labels.rowActions || 'Row actions'}
				>
					<button type="button" disabled={!row.canUp} onClick={() => runRowAction('up')} title={labels.rowUp || 'Move up'} aria-label={labels.rowUp || 'Move up'}>
						<ArrowUp size={14} />
					</button>
					<button type="button" disabled={!row.canDown} onClick={() => runRowAction('down')} title={labels.rowDown || 'Move down'} aria-label={labels.rowDown || 'Move down'}>
						<ArrowDown size={14} />
					</button>
					<button type="button" onClick={() => runRowAction('insertBelow')} title={labels.rowInsertBelow || 'Add a row below'} aria-label={labels.rowInsertBelow || 'Add a row below'}>
						<ListPlus size={14} />
					</button>
					<button type="button" onClick={() => runRowAction('duplicate')} title={labels.rowDuplicate || 'Duplicate row'} aria-label={labels.rowDuplicate || 'Duplicate row'}>
						<Copy size={14} />
					</button>
					<button type="button" className="is-danger" disabled={!row.canDelete} onClick={() => runRowAction('delete')} title={labels.rowDelete || 'Delete row'} aria-label={labels.rowDelete || 'Delete row'}>
						<Trash2 size={14} />
					</button>
				</div>
			) : null}
		</>
	);

	return overlay;
}
