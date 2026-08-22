'use client';

import { useEffect, useState } from 'react';

const PREVIEW_CHARS = 480;
const PREVIEW_LINES = 8;
const READ_MORE_STEP = 480;
const READ_MORE_LINES = 8;

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

export default function ExpandableMessageText({
	text,
	dir,
	lang,
	style,
	className = '',
	readMoreLabel = 'Read more',
	renderText,
}) {
	const full = String(text || '');
	const [step, setStep] = useState(1);

	useEffect(() => {
		setStep(1);
	}, [full]);

	if (!full) return null;

	const charLimit = PREVIEW_CHARS + (step - 1) * READ_MORE_STEP;
	const lineLimit = PREVIEW_LINES + (step - 1) * READ_MORE_LINES;
	const needsCollapse =
		full.length > PREVIEW_CHARS || full.split('\n').length > PREVIEW_LINES;
	const visible = needsCollapse ? sliceWindow(full, charLimit, lineLimit) : full;
	const remaining = full.length - visible.length;

	return (
		<span dir={dir} lang={lang} style={style} className={className}>
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
		</span>
	);
}
