'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronDown, Clipboard, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const labels = {
	en: {
		title: 'Transcript',
		show: 'Show',
		hide: 'Hide',
		copy: 'Copy',
		copied: 'Transcript copied',
		copyFailed: 'Could not copy',
	},
	ar: {
		title: 'النص المكتوب',
		show: 'عرض',
		hide: 'إخفاء',
		copy: 'نسخ',
		copied: 'تم نسخ النص',
		copyFailed: 'تعذر النسخ',
	},
};

export default function MessageSavedTranscript({
	text,
	locale = 'en',
	mine = false,
	defaultOpen = false,
}) {
	const t = labels[locale?.startsWith?.('ar') ? 'ar' : 'en'] || labels.en;
	const body = String(text || '').trim();
	const [open, setOpen] = useState(Boolean(defaultOpen));
	const [copied, setCopied] = useState(false);
	const preview = useMemo(() => {
		if (!body) return '';
		const oneLine = body.replace(/\s+/g, ' ').trim();
		return oneLine.length > 96 ? `${oneLine.slice(0, 96)}…` : oneLine;
	}, [body]);

	if (!body) return null;

	const copy = async event => {
		event.preventDefault();
		event.stopPropagation();
		try {
			await navigator.clipboard.writeText(body);
			setCopied(true);
			toast.success(t.copied);
			window.setTimeout(() => setCopied(false), 1600);
		} catch {
			toast.error(t.copyFailed);
		}
	};

	return (
		<div
			className={`wa-message-transcript ${mine ? 'is-outgoing' : 'is-incoming'} ${open ? 'is-open' : ''}`}
			onClick={event => event.stopPropagation()}
			onMouseDown={event => event.stopPropagation()}
		>
			<button
				type="button"
				className="wa-message-transcript__toggle"
				aria-expanded={open}
				onClick={() => setOpen(value => !value)}
			>
				<span className="wa-message-transcript__icon" aria-hidden="true">
					<FileText size={13} strokeWidth={2.2} />
				</span>
				<span className="wa-message-transcript__title">{t.title}</span>
				{!open && preview ? (
					<span className="wa-message-transcript__preview" dir="auto">
						{preview}
					</span>
				) : null}
				<span className="wa-message-transcript__action">
					{open ? t.hide : t.show}
					<ChevronDown
						size={14}
						strokeWidth={2.3}
						className={`wa-message-transcript__chevron ${open ? 'is-open' : ''}`}
					/>
				</span>
			</button>
			{open ? (
				<div className="wa-message-transcript__body">
					<pre dir="auto" className="wa-message-transcript__text">
						{body}
					</pre>
					<button type="button" className="wa-message-transcript__copy" onClick={copy}>
						{copied ? <Check size={13} strokeWidth={2.4} /> : <Clipboard size={13} strokeWidth={2.2} />}
						<span>{t.copy}</span>
					</button>
				</div>
			) : null}
		</div>
	);
}
