import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { firstStrongDir, normalizeDirection, numberedPrefix, oppositeRuns } from './bidi.js';

export const bidiKey = new PluginKey('sdBidi');

/* Blocks that set a direction for everything inside them (one direction per list / table / quote). */
const CONTAINERS = new Set(['bulletList', 'orderedList', 'taskList', 'table', 'blockquote']);

/**
 * Direction for every block, as decorations only (dir attributes and isolating spans on the
 * rendered DOM). Nothing is written into the document, so the saved Markdown / HTML is exactly
 * what the author typed.
 *
 * mode 'rtl' / 'ltr': the whole document reads that way — paragraphs, lists (markers on the
 *   start side), tables (first column on the start side), quotes — whatever the first word is.
 * mode 'auto': each top-level block (paragraph, heading, list, table, quote) takes the
 *   direction of its own first letter; items inside a list or table follow their container.
 * Always: English inside Arabic (and Arabic inside English) is isolated so brackets and
 *   punctuation stay put, a leading "11)" shows as typed, and code reads left to right.
 */
export function buildBidiDecorations(doc, mode, rootDir) {
	const decorations = [];

	const isolateInline = (node, pos, dir) => {
		let first = true;
		node.descendants((child, offset) => {
			if (!child.isText) return;
			const start = pos + 1 + offset;
			const inCode = child.marks.some(mark => mark.type.name === 'code');
			if (first && dir === 'rtl' && !inCode) {
				const prefix = numberedPrefix(child.text);
				if (prefix) decorations.push(Decoration.inline(start + prefix.from, start + prefix.to, { dir: 'ltr', class: 'sd-bidi-num' }));
			}
			first = false;
			if (inCode) return;
			for (const run of oppositeRuns(child.text, dir)) {
				decorations.push(Decoration.inline(start + run.from, start + run.to, { dir: run.dir, class: 'sd-bidi-run' }));
			}
		});
	};

	const visit = (node, pos, dir, nested) => {
		const name = node.type.name;
		if (name === 'codeBlock') {
			decorations.push(Decoration.node(pos, pos + node.nodeSize, { dir: 'ltr' }));
			return;
		}
		if (CONTAINERS.has(name)) {
			const own = mode === 'auto' && !nested ? firstStrongDir(node.textContent) || dir : dir;
			// Every list / table / quote carries its dir explicitly (any depth, any mode): the stylesheet
			// keys list indents, quote bars and cell rules on it, because the build turns logical
			// properties into :lang() rules that follow the page language, not the text.
			decorations.push(Decoration.node(pos, pos + node.nodeSize, { dir: own }));
			node.forEach((child, offset) => visit(child, pos + 1 + offset, own, true));
			return;
		}
		if (node.isTextblock) {
			let own = dir;
			if (mode === 'auto' && !nested) {
				own = firstStrongDir(node.textContent) || dir;
				decorations.push(Decoration.node(pos, pos + node.nodeSize, { dir: own }));
			}
			isolateInline(node, pos, own);
			return;
		}
		node.forEach((child, offset) => visit(child, pos + 1 + offset, dir, nested));
	};

	doc.forEach((child, offset) => visit(child, offset, rootDir, false));
	return DecorationSet.create(doc, decorations);
}

/**
 * `getDirection()` returns the chosen mode; `getRootDir()` the document's own direction (used
 * by 'auto' for blocks with no letters). After the mode changes, dispatch a transaction with
 * `tr.setMeta(bidiKey, true)` to recompute.
 */
export const BidiDirection = Extension.create({
	name: 'sdBidi',

	addOptions() {
		return {
			getDirection: () => 'auto',
			getRootDir: () => 'ltr',
		};
	},

	addProseMirrorPlugins() {
		const { getDirection, getRootDir } = this.options;
		const compute = doc => {
			const mode = normalizeDirection(getDirection());
			return buildBidiDecorations(doc, mode, mode === 'auto' ? getRootDir() : mode);
		};
		return [
			new Plugin({
				key: bidiKey,
				state: {
					init: (_, state) => compute(state.doc),
					apply: (tr, old) => (tr.docChanged || tr.getMeta(bidiKey) ? compute(tr.doc) : old),
				},
				props: {
					decorations: state => bidiKey.getState(state),
				},
			}),
		];
	},
});
