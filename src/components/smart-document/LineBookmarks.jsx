'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Bookmark, BookmarkCheck, X } from 'lucide-react';
import { documentLines, flashElement, locateBookmarks, readBookmarks, toggleBookmark, writeBookmarks } from './line-bookmarks';

export const lineBookmarksKey = new PluginKey('sdLineBookmarks');

function bookmarkDecorations(doc, bookmarks) {
	if (!bookmarks?.length) return DecorationSet.empty;
	const found = locateBookmarks(documentLines(doc), bookmarks);
	const decorations = [...found.values()].map((line) =>
		Decoration.node(line.pos, line.pos + line.size, { class: 'sd-bookmarked' }),
	);
	return DecorationSet.create(doc, decorations);
}

/**
 * Marks bookmarked lines (a class on the line, nothing written into the document).
 * `getBookmarks` returns the current list; dispatch a transaction with meta
 * `lineBookmarksKey` after changing it.
 */
export const LineBookmarks = Extension.create({
	name: 'sdLineBookmarks',
	addOptions() {
		return { getBookmarks: () => [] };
	},
	addProseMirrorPlugins() {
		const getBookmarks = this.options.getBookmarks;
		return [
			new Plugin({
				key: lineBookmarksKey,
				state: {
					init: (_, state) => bookmarkDecorations(state.doc, getBookmarks()),
					apply: (tr, old, _oldState, newState) =>
						tr.docChanged || tr.getMeta(lineBookmarksKey) ? bookmarkDecorations(newState.doc, getBookmarks()) : old,
				},
				props: {
					decorations: (state) => lineBookmarksKey.getState(state),
				},
			}),
		];
	},
});

const LINE_SELECTOR = 'p, h1, h2, h3, h4, h5, h6';

/**
 * Hover a line in the preview → a bookmark button beside it; a "Bookmarks" chip lists the marked
 * lines and jumps to them. Saved per document under `storageKey`.
 */
export function useLineBookmarks(editor, { hostRef, bookmarksRef, storageKey, labels = {} }) {
	const [bookmarks, setBookmarks] = useState(() => readBookmarks(storageKey));
	const [hover, setHover] = useState(null); // { top, left, side, line, marked }
	const [panelOpen, setPanelOpen] = useState(false);
	const hideTimer = useRef(null);
	const linesCache = useRef({ doc: null, lines: [] });

	bookmarksRef.current = bookmarks;

	useEffect(() => {
		setBookmarks(readBookmarks(storageKey));
		setPanelOpen(false);
	}, [storageKey]);

	// Re-mark the lines whenever the list changes.
	useEffect(() => {
		if (!editor || editor.isDestroyed) return;
		editor.view.dispatch(editor.state.tr.setMeta(lineBookmarksKey, true).setMeta('addToHistory', false));
	}, [editor, bookmarks]);

	const lines = useCallback(() => {
		const doc = editor?.state.doc;
		if (!doc) return [];
		if (linesCache.current.doc !== doc) linesCache.current = { doc, lines: documentLines(doc) };
		return linesCache.current.lines;
	}, [editor]);

	const update = useCallback(
		(next) => {
			setBookmarks(next);
			writeBookmarks(storageKey, next);
		},
		[storageKey],
	);

	/* The button follows the line under the pointer. */
	useEffect(() => {
		const host = hostRef.current;
		if (!editor || editor.isDestroyed || !host) return undefined;
		const root = editor.view.dom;
		const onMove = (event) => {
			if (event.target.closest?.('.sd-bm-btn, .sd-bm-dock')) {
				if (hideTimer.current) window.clearTimeout(hideTimer.current);
				return;
			}
			const el = event.target.closest?.(LINE_SELECTOR);
			if (!el || !root.contains(el) || !el.textContent.trim()) {
				if (hideTimer.current) window.clearTimeout(hideTimer.current);
				hideTimer.current = window.setTimeout(() => setHover(null), 220);
				return;
			}
			if (hideTimer.current) window.clearTimeout(hideTimer.current);
			let pos;
			try {
				pos = editor.view.posAtDOM(el, 0);
			} catch {
				return;
			}
			const $pos = editor.state.doc.resolve(pos);
			if (!$pos.parent.isTextblock) return;
			const blockPos = $pos.before();
			const line = lines().find((item) => item.pos === blockPos);
			if (!line) return;
			// Beside the line, on the side the text starts from; past the bullet of a list item
			// (the bullet is drawn outside the item's box).
			const item = el.closest('li');
			const box = (item || el).getBoundingClientRect();
			const textRect = el.getBoundingClientRect();
			const hostRect = host.getBoundingClientRect();
			const rtl = getComputedStyle(el).direction === 'rtl';
			const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 24;
			const clear = item ? 26 : 6;
			setHover({
				top: textRect.top - hostRect.top + Math.max(0, (Math.min(lineHeight, textRect.height) - 26) / 2),
				left: rtl ? box.right - hostRect.left + clear : box.left - hostRect.left - 26 - clear,
				line,
				marked: bookmarksRef.current.some((item) => item.text === line.text && (item.nth || 0) === line.nth),
			});
		};
		const onLeave = () => {
			if (hideTimer.current) window.clearTimeout(hideTimer.current);
			hideTimer.current = window.setTimeout(() => setHover(null), 220);
		};
		host.addEventListener('mousemove', onMove);
		host.addEventListener('mouseleave', onLeave);
		return () => {
			host.removeEventListener('mousemove', onMove);
			host.removeEventListener('mouseleave', onLeave);
			if (hideTimer.current) window.clearTimeout(hideTimer.current);
		};
	}, [editor, hostRef, lines, bookmarksRef]);

	const toggle = () => {
		if (!hover?.line) return;
		const next = toggleBookmark(bookmarks, hover.line);
		update(next);
		setHover((current) => (current ? { ...current, marked: !current.marked } : current));
	};

	const located = useMemo(() => (editor ? locateBookmarks(lines(), bookmarks) : new Map()), [editor, lines, bookmarks]);

	const jump = (bookmark) => {
		const line = located.get(bookmark.id);
		if (!line || !editor) return;
		const dom = editor.view.nodeDOM(line.pos);
		if (!(dom instanceof HTMLElement)) return;
		dom.scrollIntoView({ behavior: 'smooth', block: 'center' });
		// After the smooth scroll has placed it.
		window.setTimeout(() => flashElement(dom, hostRef.current), 450);
		setPanelOpen(false);
	};

	const ordered = useMemo(
		() =>
			[...bookmarks].sort((a, b) => {
				const pa = located.get(a.id)?.pos ?? Number.MAX_SAFE_INTEGER;
				const pb = located.get(b.id)?.pos ?? Number.MAX_SAFE_INTEGER;
				return pa - pb;
			}),
		[bookmarks, located],
	);

	return (
		<>
			{bookmarks.length ? (
				<div className="sd-bm-dock">
					<button
						type="button"
						className={`sd-bm-chip ${panelOpen ? 'is-open' : ''}`}
						aria-expanded={panelOpen}
						onClick={() => setPanelOpen((open) => !open)}
					>
						<BookmarkCheck size={14} aria-hidden />
						<span>{labels.bookmarks || 'Bookmarks'}</span>
						<span className="sd-bm-count">{bookmarks.length}</span>
					</button>
					{panelOpen ? (
						<div className="sd-bm-panel" role="menu">
							{ordered.map((bookmark) => {
								const found = located.has(bookmark.id);
								return (
									<div key={bookmark.id} className={`sd-bm-item ${found ? '' : 'is-missing'}`}>
										<button
											type="button"
											role="menuitem"
											className="sd-bm-go"
											disabled={!found}
											onClick={() => jump(bookmark)}
											title={found ? bookmark.text : labels.bookmarkMissing || 'This line was changed'}
										>
											<span dir="auto">{bookmark.text}</span>
											{!found ? <em>{labels.bookmarkMissing || 'This line was changed'}</em> : null}
										</button>
										<button
											type="button"
											className="sd-bm-remove"
											aria-label={labels.removeBookmark || 'Remove bookmark'}
											title={labels.removeBookmark || 'Remove bookmark'}
											onClick={() => update(bookmarks.filter((item) => item.id !== bookmark.id))}
										>
											<X size={13} />
										</button>
									</div>
								);
							})}
						</div>
					) : null}
				</div>
			) : null}
			{hover ? (
				<button
					type="button"
					className={`sd-bm-btn ${hover.marked ? 'is-on' : ''}`}
					style={{ top: hover.top, left: hover.left }}
					onMouseDown={(event) => event.preventDefault()}
					onClick={toggle}
					aria-pressed={hover.marked}
					aria-label={hover.marked ? labels.removeBookmark || 'Remove bookmark' : labels.addBookmark || 'Bookmark this line'}
					title={hover.marked ? labels.removeBookmark || 'Remove bookmark' : labels.addBookmark || 'Bookmark this line'}
				>
					{hover.marked ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
				</button>
			) : null}
		</>
	);
}
