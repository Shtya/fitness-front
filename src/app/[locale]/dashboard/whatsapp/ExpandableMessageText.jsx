'use client';

import { useEffect, useState } from 'react';

/** Show a long first chunk before "Read more" — WhatsApp Web keeps long texts open longer. */
const PREVIEW_CHARS = 2400;
const PREVIEW_LINES = 42;
const READ_MORE_STEP = 1800;
const READ_MORE_LINES = 32;

function sliceAtBoundary(text, limit) {
	if (text.length <= limit) return text;
	const raw = text.slice(0, limit);
	const breakAt = Math.max(raw.lastIndexOf('\n'), raw.lastIndexOf(' '), raw.lastIndexOf('\t'));
	if (breakAt > limit * 0.65) return raw.slice(0, breakAt);
	return raw;
}

function sliceWindow(text, charLimit, lineLimit) {
	const byChars = sliceAtBoundary(text, charLimit);
	const lines = byChars.split('\n');
	if (lines.length > lineLimit) return lines.slice(0, lineLimit).join('\n');
	return byChars;
}

/**
 * Renders message text as one flow so the bubble can grow with content.
 * Soft wrap only when max-width is hit; Enter newlines stay via pre-wrap.
 * Per-paragraph RTL/LTR comes from unicode-bidi: plaintext (set by presentation style).
 */
export default function ExpandableMessageText({
	text,
	dir,
	lang,
	style,
	className = '',
	readMoreLabel = 'Read more',
	previewChars = PREVIEW_CHARS,
	previewLines = PREVIEW_LINES,
	readMoreStep = READ_MORE_STEP,
	readMoreLines = READ_MORE_LINES,
	renderText,
}) {
	const full = String(text || '');
	const [step, setStep] = useState(1);

	useEffect(() => {
		setStep(1);
	}, [full]);

	if (!full) return null;

	const charLimit = previewChars + (step - 1) * readMoreStep;
	const lineLimit = previewLines + (step - 1) * readMoreLines;
	const needsCollapse =
		full.length > previewChars || full.split('\n').length > previewLines;
	const visible = needsCollapse ? sliceWindow(full, charLimit, lineLimit) : full;
	const remaining = full.length - visible.length;

	const isMarkdown = String(className || '').includes('wa-message-text--md');
	const mergedStyle = {
		display: isMarkdown ? 'block' : 'inline',
		whiteSpace: 'pre-wrap',
		overflowWrap: 'break-word',
		wordWrap: 'break-word',
		wordBreak: 'normal',
		hyphens: 'none',
		maxWidth: isMarkdown ? '100%' : undefined,
		unicodeBidi: style?.unicodeBidi || 'plaintext',
		...style,
		width: isMarkdown ? 'auto' : undefined,
		minWidth: isMarkdown ? 'auto' : undefined,
	};

	const Root = isMarkdown ? 'div' : 'span';

	return (
		<Root dir={dir} lang={lang} style={mergedStyle} className={className}>
			{renderText ? renderText(visible) : visible}
			{remaining > 0 ? (
				<>
					{'… '}
					<button
						type="button"
						className="wa-read-more"
						onClick={event => {
							event.preventDefault();
							event.stopPropagation();
							setStep(current => current + 1);
						}}
						onPointerDown={event => event.stopPropagation()}
					>
						{readMoreLabel}
					</button>
				</>
			) : null}
		</Root>
	);
}
