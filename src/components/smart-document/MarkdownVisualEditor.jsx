'use client';

import { useEffect, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import { Markdown } from '@tiptap/markdown';
import 'prosemirror-view/style/prosemirror.css';
import { BidiDirection, bidiKey } from './bidi-extension';
import { normalizeDirection } from './bidi';
import { formatHtmlSource, htmlForEditor, isHtmlSource } from './source-format';

/**
 * Formatted preview of the Edit-pane source.
 * HTML source is parsed as HTML; everything else is Markdown.
 * Parses on mount only; remount (via `key`) to load a different document.
 * `onChange` fires on user edits only, so an untouched document keeps its exact source.
 * `direction` ('auto' | 'rtl' | 'ltr') lays the document out without changing its content.
 */
export default function MarkdownVisualEditor({ markdown, onChange, onBlur, placeholder, dir, direction = 'auto', autoFocus = false }) {
	const html = isHtmlSource(markdown);
	const onChangeRef = useRef(onChange);
	const onBlurRef = useRef(onBlur);
	onChangeRef.current = onChange;
	onBlurRef.current = onBlur;
	const mode = normalizeDirection(direction);
	const modeRef = useRef(mode);
	const rootDirRef = useRef(dir || 'ltr');
	modeRef.current = mode;
	rootDirRef.current = dir || 'ltr';

	const editor = useEditor({
		immediatelyRender: false,
		extensions: [
			StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
			TaskList,
			TaskItem.configure({ nested: true }),
			TableKit.configure({ table: { resizable: false } }),
			Placeholder.configure({ placeholder }),
			Markdown,
			BidiDirection.configure({ getDirection: () => modeRef.current, getRootDir: () => rootDirRef.current }),
		],
		content: html ? htmlForEditor(markdown) : markdown || '',
		contentType: html ? 'html' : 'markdown',
		editorProps: {
			attributes: {
				class: 'sd-md sd-visual',
				spellcheck: 'true',
				style: 'caret-color: var(--sd-ink); -webkit-text-fill-color: currentColor;',
			},
			handleDOMEvents: {
				mousedown: (view) => {
					if (!view.hasFocus()) view.focus();
					return false;
				},
			},
		},
		onUpdate: ({ editor: ed }) => {
			if (html) onChangeRef.current?.(formatHtmlSource(ed.getHTML()));
			else onChangeRef.current?.(ed.getMarkdown());
		},
		onBlur: () => onBlurRef.current?.(),
	});

	useEffect(() => {
		if (editor && autoFocus) editor.commands.focus('end');
	}, [editor, autoFocus]);

	// A new direction only re-lays the document out (decorations); the content is untouched.
	useEffect(() => {
		if (!editor || editor.isDestroyed) return;
		editor.view.dispatch(editor.state.tr.setMeta(bidiKey, true).setMeta('addToHistory', false));
	}, [editor, mode, dir]);

	return <EditorContent editor={editor} className="sd-markdown-preview" dir={mode === 'auto' ? dir : mode} data-direction={mode} />;
}
