'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Copy, ExternalLink, Globe2, Mail, Clock3, Zap } from 'lucide-react';
import { formatEmailMemoDate, parseEmailMemoPayload } from './email-memo-message';

const PREVIEW_CHARS = 720;
const PREVIEW_LINES = 7;

function slicePreview(text, charLimit, lineLimit) {
	const full = String(text || '');
	if (!full) return { visible: '', remaining: 0 };
	let byChars = full;
	if (full.length > charLimit) {
		const raw = full.slice(0, charLimit);
		const breakAt = Math.max(raw.lastIndexOf('\n'), raw.lastIndexOf(' '), raw.lastIndexOf('\t'));
		byChars = breakAt > charLimit * 0.65 ? raw.slice(0, breakAt) : raw;
	}
	const lines = byChars.split('\n');
	const visible = lines.length > lineLimit ? lines.slice(0, lineLimit).join('\n') : byChars;
	return { visible, remaining: Math.max(0, full.length - visible.length) };
}

function initialsFromName(name) {
	const parts = String(name || '')
		.trim()
		.split(/\s+/)
		.filter(Boolean);
	if (!parts.length) return '📧';
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

export default function EmailMemoMessageCard({
	text,
	timestamp,
	labels = {},
	locale = 'en',
}) {
	const ar = locale === 'ar';
	const parsed = useMemo(() => parseEmailMemoPayload(text), [text]);
	const [expanded, setExpanded] = useState(false);

	if (!parsed) return null;

	const receivedAt = formatEmailMemoDate(timestamp) || parsed.receivedLabel || '';
	const previewSource = parsed.memo || parsed.arabicSummary || '';
	const { visible, remaining } = expanded
		? { visible: previewSource, remaining: 0 }
		: slicePreview(previewSource, PREVIEW_CHARS, PREVIEW_LINES);

	const copyLink = async event => {
		event.preventDefault();
		event.stopPropagation();
		if (!parsed.gmailUrl) return;
		try {
			await navigator.clipboard.writeText(parsed.gmailUrl);
			toast.success(labels.linkCopied || 'Link copied');
		} catch {
			toast.error(labels.copyLinkFailed || 'Could not copy link');
		}
	};

	return (
		<article className="wa-email-card" dir="ltr">
			<header className="wa-email-card__header">
				<div className="wa-email-card__avatar" aria-hidden>
					{parsed.senderName ? initialsFromName(parsed.senderName) : <Mail size={14} />}
				</div>
				<div className="wa-email-card__identity min-w-0 flex-1">
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0">
							<p className="wa-email-card__sender truncate">
								{parsed.senderName || parsed.fromLabel || (ar ? 'مرسل غير معروف' : 'Unknown sender')}
							</p>
							{parsed.senderEmail ? (
								<p className="wa-email-card__email truncate" dir="ltr">
									{parsed.senderEmail}
								</p>
							) : parsed.inbox ? (
								<p className="wa-email-card__email truncate" dir="ltr">
									{parsed.inbox}
								</p>
							) : null}
						</div>
						{receivedAt ? (
							<time className="wa-email-card__time shrink-0" dateTime={timestamp || undefined}>
								{receivedAt}
							</time>
						) : null}
					</div>
				</div>
			</header>

			{parsed.subject ? (
				<h3 className="wa-email-card__subject">
					<span className="wa-email-card__subject-label">Subject:</span> {parsed.subject}
				</h3>
			) : null}

			{(parsed.inbox || parsed.fromLabel) && (
				<dl className="wa-email-card__meta">
					{parsed.fromLabel ? (
						<div className="wa-email-card__meta-row">
							<dt>From</dt>
							<dd className="truncate">{parsed.fromLabel}</dd>
						</div>
					) : null}
					{parsed.inbox ? (
						<div className="wa-email-card__meta-row">
							<dt>To</dt>
							<dd className="truncate" dir="ltr">
								{parsed.inbox}
							</dd>
						</div>
					) : null}
					{receivedAt ? (
						<div className="wa-email-card__meta-row">
							<dt>Received</dt>
							<dd>{receivedAt}</dd>
						</div>
					) : null}
				</dl>
			)}

			{visible ? (
				<div className="wa-email-card__body">
					<p className="wa-email-card__preview whitespace-pre-wrap">{visible}</p>
					{remaining > 0 ? (
						<button
							type="button"
							className="wa-email-card__read-more"
							onClick={event => {
								event.preventDefault();
								event.stopPropagation();
								setExpanded(true);
							}}
							onPointerDown={event => event.stopPropagation()}
						>
							{labels.readFullEmail || labels.readMore || 'Read more'} →
						</button>
					) : null}
				</div>
			) : null}

			{(parsed.action || parsed.deadline) && (
				<div className="wa-email-card__chips">
					{parsed.action ? (
						<span className="wa-email-card__chip wa-email-card__chip--action">
							<Zap size={11} />
							<span className="truncate">{parsed.action}</span>
						</span>
					) : null}
					{parsed.deadline ? (
						<span className="wa-email-card__chip">
							<Clock3 size={11} />
							<span className="truncate">{parsed.deadline}</span>
						</span>
					) : null}
				</div>
			)}

			{parsed.arabicSummary && parsed.memo ? (
				<p className="wa-email-card__arabic" dir="rtl" lang="ar">
					{parsed.arabicSummary}
				</p>
			) : null}

			{parsed.gmailUrl ? (
				<div className="wa-email-card__source">
					<div className="wa-email-card__source-main min-w-0">
						<span className="wa-email-card__source-label">
							{ar ? 'مصدر الإيميل' : 'Email source'}
						</span>
						<a
							href={parsed.gmailUrl}
							target="_blank"
							rel="noreferrer"
							onClick={event => event.stopPropagation()}
							className="wa-email-card__source-link truncate"
							dir="ltr"
						>
							<Globe2 size={13} className="shrink-0" />
							{parsed.sourceHost || 'mail.google.com'}
						</a>
					</div>
					<div className="wa-email-card__source-actions">
						<a
							href={parsed.gmailUrl}
							target="_blank"
							rel="noreferrer"
							onClick={event => event.stopPropagation()}
							title={labels.openLink || 'Open email'}
							aria-label={labels.openLink || 'Open email'}
							className="wa-email-card__icon-btn"
						>
							<ExternalLink size={14} />
						</a>
						<button
							type="button"
							onPointerDown={event => event.stopPropagation()}
							onClick={copyLink}
							title={labels.copyLink || 'Copy link'}
							aria-label={labels.copyLink || 'Copy link'}
							className="wa-email-card__icon-btn"
						>
							<Copy size={14} />
						</button>
					</div>
				</div>
			) : null}
		</article>
	);
}
