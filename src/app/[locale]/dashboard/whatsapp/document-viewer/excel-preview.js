import * as XLSX from 'xlsx';

const MAX_ROWS = 500;
const MAX_COLS = 52;

export function columnLabel(index) {
	let label = '';
	let i = index;
	while (i >= 0) {
		label = String.fromCharCode((i % 26) + 65) + label;
		i = Math.floor(i / 26) - 1;
	}
	return label;
}

function formatCellValue(cell) {
	if (!cell) return '';
	if (cell.w != null && cell.w !== '') return cell.w;
	if (cell.v == null) return '';
	if (cell.t === 'b') return cell.v ? 'TRUE' : 'FALSE';
	return String(cell.v);
}

function buildMergeMap(merges = []) {
	const skip = new Set();
	const span = new Map();

	for (const merge of merges) {
		const key = `${merge.s.r},${merge.s.c}`;
		const rowSpan = merge.e.r - merge.s.r + 1;
		const colSpan = merge.e.c - merge.s.c + 1;
		span.set(key, { rowSpan, colSpan });

		for (let row = merge.s.r; row <= merge.e.r; row += 1) {
			for (let col = merge.s.c; col <= merge.e.c; col += 1) {
				if (row !== merge.s.r || col !== merge.s.c) skip.add(`${row},${col}`);
			}
		}
	}

	return { skip, span };
}

function getColumnWidth(sheet, colIndex) {
	const col = sheet['!cols']?.[colIndex];
	if (!col) return undefined;
	if (col.wpx) return col.wpx;
	if (col.wch) return Math.round(col.wch * 7.5);
	if (col.width) return Math.round(col.width * 7.5);
	return undefined;
}

export function parseSheetForGrid(sheet) {
	const range = sheet['!ref']
		? XLSX.utils.decode_range(sheet['!ref'])
		: { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
	const rowStart = range.s.r;
	const colStart = range.s.c;
	const rowEnd = Math.min(range.e.r, rowStart + MAX_ROWS - 1);
	const colEnd = Math.min(range.e.c, colStart + MAX_COLS - 1);
	const { skip, span } = buildMergeMap(sheet['!merges'] || []);

	const columns = [];
	for (let col = colStart; col <= colEnd; col += 1) {
		columns.push({
			index: col,
			label: columnLabel(col),
			width: getColumnWidth(sheet, col),
		});
	}

	const rows = [];
	for (let row = rowStart; row <= rowEnd; row += 1) {
		const cells = [];
		for (let col = colStart; col <= colEnd; col += 1) {
			const key = `${row},${col}`;
			if (skip.has(key)) continue;

			const address = XLSX.utils.encode_cell({ r: row, c: col });
			const cell = sheet[address];
			const merge = span.get(key);
			const value = formatCellValue(cell);
			const isNumber = cell?.t === 'n';
			const isHeader = row === rowStart;

			cells.push({
				key,
				col,
				value,
				rowSpan: merge?.rowSpan || 1,
				colSpan: merge?.colSpan || 1,
				isNumber,
				isHeader,
				bold: isHeader || cell?.s?.font?.bold,
			});
		}
		rows.push({ index: row, number: row + 1, cells });
	}

	return {
		columns,
		rows,
		truncatedRows: range.e.r > rowEnd,
		truncatedCols: range.e.c > colEnd,
		totalRows: range.e.r - rowStart + 1,
		totalCols: range.e.c - colStart + 1,
	};
}

export function parseWorkbookSheets(buffer) {
	const workbook = XLSX.read(buffer, {
		type: 'array',
		cellDates: true,
		cellNF: true,
		cellText: true,
	});
	return workbook.SheetNames.map(name => ({
		name,
		grid: parseSheetForGrid(workbook.Sheets[name]),
	}));
}
