'use client';

import { useEffect, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import { Markdown } from '@tiptap/markdown';
import { formatHtmlSource, htmlForEditor, isHtmlSource } from './source-format';

/**
 * Formatted preview of the Edit-pane source.
 * HTML source is parsed as HTML; everything else is Markdown.
 * Parses on mount only; remount (via `key`) to load a different document.
 * `onChange` fires on user edits only, so an untouched document keeps its exact source.
 */
export default function MarkdownVisualEditor({ markdown, onChange, onBlur, placeholder, dir, autoFocus = false }) {
	const html = isHtmlSource(markdown);
	const onChangeRef = useRef(onChange);
	const onBlurRef = useRef(onBlur);
	onChangeRef.current = onChange;
	onBlurRef.current = onBlur;

	const editor = useEditor({
		immediatelyRender: false,
		extensions: [
			StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
			TaskList,
			TaskItem.configure({ nested: true }),
			TableKit.configure({ table: { resizable: false } }),
			Placeholder.configure({ placeholder }),
			Markdown,
		],
		content: html ? htmlForEditor(markdown) : markdown || '',
		contentType: html ? 'html' : 'markdown',
		editorProps: {
			attributes: { class: 'sd-md sd-visual', spellcheck: 'true' },
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

	return <EditorContent editor={editor} className="sd-markdown-preview" dir={dir} />;
}
