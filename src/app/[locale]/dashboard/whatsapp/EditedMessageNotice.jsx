'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, PencilLine } from 'lucide-react';
import {
	diffWhatsAppEditWords,
	normalizeWhatsAppEditHistory,
	whatsAppEditAuthorLabel,
} from './whatsapp-message-edits';
import './wa-edited-notice.css';

function formatEditTime(value) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	return date.toLocaleString([], {
		day: '2-digit',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit',
	});
}

function EditDiff({ entry, ar }) {
	const parts = useMemo(
		() => diffWhatsAppEditWords(entry.previousText, entry.text),
		[entry.previousText, entry.text],
	);
	return (
		<div className="wa-edit__entry">
			<div className="wa-edit__row">
				<span className="wa-edit__tag">{ar ? 'قبل' : 'Before'}</span>
				<p className="wa-edit__text is-before" dir="auto">{entry.previousText || '—'}</p>
			</div>
			<div className="wa-edit__row">
				<span className="wa-edit__tag">{ar ? 'بعد' : 'After'}</span>
				<p className="wa-edit__text" dir="auto">{entry.text}</p>
			</div>
			<div className="wa-edit__row">
				<span className="wa-edit__tag">{ar ? 'الفرق' : 'Diff'}</span>
				<p className="wa-edit__text wa-edit__diff" dir="auto">
					{parts.map((part, index) =>
						part.type === 'removed' ? (
							<del key={index}>{part.value}</del>
						) : part.type === 'added' ? (
							<ins key={index}>{part.value}</ins>
						) : (
							<span key={index}>{part.value}</span>
						),
					)}
				</p>
			</div>
		</div>
	);
}

/**
 * Banner above an edited message: who edited it, and the before / after / word diff.
 * Contact edits open by default so staff notice the change.
 */
export default function EditedMessageNotice({ message, locale = 'en' }) {
	const ar = locale === 'ar';
	const history = normalizeWhatsAppEditHistory(message?.editHistory);
	const latest = history[history.length - 1];
	const [open, setOpen] = useState(latest?.by === 'contact');
	if (!latest) return null;
	const older = history.slice(0, -1).reverse();
	const stop = event => event.stopPropagation();

	return (
		<div
			className={`wa-edit${latest.by === 'contact' ? ' is-contact' : ''}`}
			onPointerDown={stop}
			onClick={stop}
			onDoubleClick={stop}
		>
			<button
				type="button"
				className="wa-edit__head"
				aria-expanded={open}
				onClick={() => setOpen(value => !value)}
			>
				<span className="wa-edit__badge" aria-hidden="true">
					<PencilLine size={12} strokeWidth={2.4} />
				</span>
				<span className="wa-edit__title">
					{whatsAppEditAuthorLabel(latest.by, locale)}
					{history.length > 1 ? (
						<span className="wa-edit__count">
							{ar ? ` · ${history.length} تعديلات` : ` · ${history.length} edits`}
						</span>
					) : null}
				</span>
				<time className="wa-edit__time" dir="auto">{formatEditTime(latest.editedAt)}</time>
				<ChevronDown size={14} className={`wa-edit__chev${open ? ' is-open' : ''}`} aria-hidden="true" />
			</button>
			{open ? (
				<div className="wa-edit__body">
					<EditDiff entry={latest} ar={ar} />
					{older.length ? (
						<details className="wa-edit__older">
							<summary>{ar ? 'التعديلات الأقدم' : 'Earlier edits'}</summary>
							{older.map((entry, index) => (
								<div key={`${entry.editedAt}-${index}`} className="wa-edit__older-item">
									<p className="wa-edit__older-meta">
										{whatsAppEditAuthorLabel(entry.by, locale)} · {formatEditTime(entry.editedAt)}
									</p>
									<EditDiff entry={entry} ar={ar} />
								</div>
							))}
						</details>
					) : null}
				</div>
			) : null}
		</div>
	);
}
