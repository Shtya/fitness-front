'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CornerDownRight, Loader2, Pin, PinOff, Search, X } from 'lucide-react';
import './pinned-sidebar.css';

const copy = {
	en: {
		title: 'Pinned messages',
		close: 'Close',
		search: 'Search pinned messages',
		noMatch: 'No pinned message matches your search',
		jump: 'Go to message',
		unpin: 'Unpin',
		you: 'You',
	},
	ar: {
		title: 'الرسائل المثبّتة',
		close: 'إغلاق',
		search: 'ابحث في الرسائل المثبّتة',
		noMatch: 'لا توجد رسالة مثبّتة تطابق البحث',
		jump: 'الانتقال إلى الرسالة',
		unpin: 'إلغاء التثبيت',
		you: 'أنت',
	},
};

function dateOf(message) {
	const date = new Date(message?.providerTimestamp || message?.createdAt || message?.created_at || 0);
	return Number.isFinite(date.getTime()) && date.getTime() > 0 ? date : null;
}

/** A small preview image the message already carries (never a fresh media download). */
function thumbOf(message) {
	const attachments = Array.isArray(message?.attachments) ? message.attachments : [];
	for (const item of attachments) {
		const type = String(item?.type || '').toLowerCase();
		if (type !== 'image' && type !== 'sticker' && !type.includes('video')) continue;
		const src = String(item?.previewDataUrl || '').trim();
		if (src) return src;
	}
	return '';
}

/**
 * Every pin of the chat in a side panel (WhatsApp Web's starred-messages layout): who sent
 * it, when, and the message itself, with a filter, jump and unpin.
 */
export default function PinnedMessagesSidebar({ ar = false, open = false, messages = [], currentId = '', busyId = '', describe, senderName, onClose, onJump, onUnpin }) {
	const t = ar ? copy.ar : copy.en;
	const [query, setQuery] = useState('');
	const panel = useRef(null);
	const searchRef = useRef(null);

	useEffect(() => {
		if (!open) {
			setQuery('');
			return undefined;
		}
		const onKey = event => {
			if (event.key !== 'Escape') return;
			event.stopPropagation();
			onClose?.();
		};
		document.addEventListener('keydown', onKey, true);
		panel.current?.focus({ preventScroll: true });
		return () => document.removeEventListener('keydown', onKey, true);
	}, [open, onClose]);

	const items = useMemo(() => {
		const needle = query.trim().toLowerCase();
		return messages
			.map(message => {
				const info = describe(message);
				const mine = message?.direction === 'outbound';
				const name = String(senderName?.(message) || '').trim() || (mine ? t.you : '');
				return { message, info, mine, name, date: dateOf(message), thumb: thumbOf(message) };
			})
			.filter(item => !needle || `${item.info.label} ${item.name}`.toLowerCase().includes(needle));
	}, [describe, messages, query, senderName, t.you]);

	if (!open || typeof document === 'undefined') return null;

	const dateFmt = { day: 'numeric', month: 'short', year: 'numeric' };
	const timeFmt = { hour: 'numeric', minute: '2-digit' };
	const fmtLocale = ar ? 'ar-EG-u-nu-latn' : undefined;

	return createPortal(
		<aside className="wa-pinside" dir={ar ? 'rtl' : 'ltr'} role="dialog" aria-label={t.title} tabIndex={-1} ref={panel}>
			<header className="wa-pinside__head">
				<button type="button" className="wa-pinside__icon" onClick={onClose} title={t.close} aria-label={t.close}>
					<X size={20} />
				</button>
				<h2 className="wa-pinside__title">{t.title}</h2>
				<span className="wa-pinside__count">{messages.length}</span>
			</header>

			{messages.length > 3 ? (
				<label className="wa-pinside__search">
					<Search size={16} aria-hidden />
					<input
						ref={searchRef}
						type="search"
						value={query}
						onChange={event => setQuery(event.target.value)}
						placeholder={t.search}
						aria-label={t.search}
						autoComplete="off"
						dir="auto"
					/>
					{query ? (
						<button type="button" className="wa-pinside__clear" onClick={() => { setQuery(''); searchRef.current?.focus(); }} aria-label={t.close}>
							<X size={14} />
						</button>
					) : null}
				</label>
			) : null}

			<ol className="wa-pinside__list">
				{items.map(({ message, info, mine, name, date, thumb }) => {
					const busy = busyId === message.id;
					return (
						<li key={message.id} className={`wa-pinside__item ${message.id === currentId ? 'is-current' : ''}`}>
							<div className="wa-pinside__meta">
								<span className="wa-pinside__who" dir="auto">{name}</span>
								{date ? <time dateTime={date.toISOString()}>{date.toLocaleDateString(fmtLocale, dateFmt)}</time> : null}
							</div>
							<button type="button" className={`wa-pinside__bubble ${mine ? 'is-mine' : ''}`} onClick={() => onJump?.(message)} title={t.jump}>
								{thumb ? (
									<img className="wa-pinside__thumb" src={thumb} alt="" />
								) : info.kind !== 'text' && info.kind !== 'link' ? (
									<span className={`wa-pinside__kind is-${info.kind}`} aria-hidden>
										<info.Icon size={18} />
									</span>
								) : null}
								<span className="wa-pinside__text" dir="auto">{info.label}</span>
								{date ? <span className="wa-pinside__time">{date.toLocaleTimeString(fmtLocale, timeFmt)}</span> : null}
							</button>
							<div className="wa-pinside__actions">
								<button type="button" className="wa-pinside__action" onClick={() => onJump?.(message)}>
									<CornerDownRight size={15} aria-hidden />
									{t.jump}
								</button>
								{typeof onUnpin === 'function' ? (
									<button type="button" className="wa-pinside__action is-danger" disabled={busy} onClick={() => onUnpin(message)}>
										{busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <PinOff size={15} aria-hidden />}
										{t.unpin}
									</button>
								) : null}
							</div>
						</li>
					);
				})}
				{!items.length ? (
					<li className="wa-pinside__empty">
						<Pin size={22} aria-hidden />
						{t.noMatch}
					</li>
				) : null}
			</ol>
		</aside>,
		document.body,
	);
}
