'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, Image as ImageIcon, Link2, Rows3, Loader2, Mic, Pin, PinOff, Sticker, Video, X } from 'lucide-react';
import './chat-bars.css';

const copy = {
	en: {
		title: 'Pinned',
		pinnedOne: 'Pinned message',
		pinnedOf: (i, n) => `Pinned message ${i} of ${n}`,
		hide: 'Hide pinned',
		all: 'All pinned',
		allTitle: n => `${n} pinned messages`,
		loading: 'Loading pinned messages',
		empty: 'No pinned messages in this chat',
		jump: 'Go to message',
		unpin: 'Unpin',
		photo: 'Photo',
		video: 'Video',
		voice: 'Voice message',
		document: 'Document',
		sticker: 'Sticker',
		message: 'Message',
	},
	ar: {
		title: 'مثبّتة',
		pinnedOne: 'رسالة مثبّتة',
		pinnedOf: (i, n) => `رسالة مثبّتة ${i} من ${n}`,
		hide: 'إخفاء المثبّتة',
		all: 'كل المثبّتة',
		allTitle: n => `${n} رسائل مثبّتة`,
		loading: 'جارٍ تحميل الرسائل المثبّتة',
		empty: 'لا توجد رسائل مثبّتة في هذه المحادثة',
		jump: 'الانتقال إلى الرسالة',
		unpin: 'إلغاء التثبيت',
		photo: 'صورة',
		video: 'فيديو',
		voice: 'رسالة صوتية',
		document: 'مستند',
		sticker: 'ملصق',
		message: 'رسالة',
	},
};

function formatWhen(value, ar) {
	if (!value) return '';
	const date = new Date(value);
	if (!Number.isFinite(date.getTime())) return '';
	return date.toLocaleString(ar ? 'ar-EG-u-nu-latn' : undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** What the pinned message is, for the preview text and its icon. */
function describe(message, t) {
	const text = String(message?.text || '').trim();
	const att = Array.isArray(message?.attachments) ? message.attachments[0] : null;
	const type = String(att?.type || message?.type || '').toLowerCase();
	if (type === 'image') return { kind: 'image', Icon: ImageIcon, label: text || t.photo };
	if (type === 'sticker') return { kind: 'sticker', Icon: Sticker, label: text || t.sticker };
	if (type.includes('video')) return { kind: 'video', Icon: Video, label: text || t.video };
	if (type === 'audio' || type === 'ptt' || type === 'voice') return { kind: 'voice', Icon: Mic, label: text || t.voice };
	if (type.includes('document') || type === 'file') return { kind: 'document', Icon: FileText, label: text || t.document };
	if (/https?:\/\//i.test(text)) return { kind: 'link', Icon: Link2, label: text };
	return { kind: 'text', Icon: Pin, label: text || t.message };
}

/** Thin vertical indicator: one segment per pinned message (a sliding thumb past five). */
function Rail({ count, index }) {
	if (count <= 1) return <span className="wa-pinbar__rail is-single" aria-hidden />;
	if (count <= 5) {
		return (
			<span className="wa-pinbar__rail" aria-hidden>
				{Array.from({ length: count }, (_, i) => (
					<span key={i} className={i === index ? 'is-on' : ''} />
				))}
			</span>
		);
	}
	return (
		<span className="wa-pinbar__rail is-thumb" aria-hidden>
			<span className="is-on" style={{ height: `${100 / count}%`, transform: `translateY(${index * 100}%)` }} />
		</span>
	);
}

export default function PinnedMessagesPanel({ ar = false, open = true, messages = [], loading = false, busyId = '', onHide, onJump, onUnpin }) {
	const t = ar ? copy.ar : copy.en;
	const list = Array.isArray(messages) ? messages.filter(item => item?.isPinned !== false) : [];
	const [index, setIndex] = useState(0);
	const [listOpen, setListOpen] = useState(false);
	const wrap = useRef(null);
	const count = list.length;
	const current = list[Math.min(index, Math.max(0, count - 1))];

	// Keep the pointer valid when pins are added or removed.
	useEffect(() => {
		if (index > count - 1) setIndex(Math.max(0, count - 1));
		if (count < 2) setListOpen(false);
	}, [count, index]);

	useEffect(() => {
		if (!listOpen) return undefined;
		const onDown = event => {
			if (!wrap.current?.contains(event.target)) setListOpen(false);
		};
		const onKey = event => {
			if (event.key === 'Escape') {
				event.stopPropagation();
				setListOpen(false);
			}
		};
		document.addEventListener('pointerdown', onDown);
		document.addEventListener('keydown', onKey, true);
		return () => {
			document.removeEventListener('pointerdown', onDown);
			document.removeEventListener('keydown', onKey, true);
		};
	}, [listOpen]);

	if (!open) return null;

	if (loading && !count) {
		return (
			<div className="wa-pinbar is-loading" role="status" aria-label={t.loading}>
				<span className="wa-pinbar__rail is-single" aria-hidden />
				<Loader2 size={16} className="animate-spin" aria-hidden />
				<span className="wa-pinbar__skeleton" aria-hidden />
			</div>
		);
	}

	if (!count) {
		return (
			<div className="wa-pinbar is-empty">
				<span className="wa-pinbar__tile" aria-hidden>
					<Pin size={16} />
				</span>
				<span className="wa-pinbar__empty">{t.empty}</span>
				{typeof onHide === 'function' ? (
					<button type="button" className="wa-pinbar__btn" onClick={onHide} title={t.hide} aria-label={t.hide}>
						<X size={17} />
					</button>
				) : null}
			</div>
		);
	}

	const info = describe(current, t);
	const busy = busyId === current?.id;

	// Tap the bar: go to this pin, then line up the next one (WhatsApp/Telegram style).
	const jumpAndAdvance = () => {
		onJump?.(current);
		if (count > 1) setIndex(i => (i + 1) % count);
	};

	return (
		<div className="wa-pinbar-wrap" ref={wrap}>
			<div className="wa-pinbar">
				<button type="button" className="wa-pinbar__main" onClick={jumpAndAdvance} title={t.jump}>
					<Rail count={count} index={index} />
					<span className={`wa-pinbar__tile is-${info.kind}`} aria-hidden>
						<info.Icon size={16} />
					</span>
					<span className="wa-pinbar__text">
						<span className="wa-pinbar__label">{count > 1 ? t.pinnedOf(index + 1, count) : t.pinnedOne}</span>
						<span className="wa-pinbar__preview" dir="auto" key={current?.id}>
							{info.label}
						</span>
					</span>
				</button>
				<div className="wa-pinbar__tools">
					{count > 1 ? (
						<button
							type="button"
							className={`wa-pinbar__btn wa-pinbar__all ${listOpen ? 'is-on' : ''}`}
							onClick={() => setListOpen(v => !v)}
							aria-expanded={listOpen}
							aria-haspopup="true"
							title={t.all}
						>
							<Rows3 size={16} />
							<span>{count}</span>
						</button>
					) : null}
					{typeof onUnpin === 'function' ? (
						<button type="button" className="wa-pinbar__btn" disabled={busy} onClick={() => onUnpin(current)} title={t.unpin} aria-label={t.unpin}>
							{busy ? <Loader2 size={16} className="animate-spin" /> : <PinOff size={16} />}
						</button>
					) : null}
					{typeof onHide === 'function' ? (
						<button type="button" className="wa-pinbar__btn" onClick={onHide} title={t.hide} aria-label={t.hide}>
							<X size={17} />
						</button>
					) : null}
				</div>
			</div>

			{listOpen ? (
				<div className="wa-pinbar__menu" role="dialog" aria-label={t.allTitle(count)}>
					<p className="wa-pinbar__menu-title">
						<Pin size={14} aria-hidden />
						{t.allTitle(count)}
					</p>
					<ul>
						{list.map((item, i) => {
							const d = describe(item, t);
							const when = formatWhen(item.providerTimestamp || item.createdAt, ar);
							const itemBusy = busyId === item.id;
							return (
								<li key={item.id} className={i === index ? 'is-current' : ''}>
									<button
										type="button"
										className="wa-pinbar__item"
										onClick={() => {
											setIndex(i);
											setListOpen(false);
											onJump?.(item);
										}}
									>
										<span className={`wa-pinbar__tile is-${d.kind}`} aria-hidden>
											<d.Icon size={16} />
										</span>
										<span className="wa-pinbar__item-text">
											<span className="wa-pinbar__item-preview" dir="auto">
												{d.label}
											</span>
											{when ? <span className="wa-pinbar__item-when">{when}</span> : null}
										</span>
									</button>
									{typeof onUnpin === 'function' ? (
										<button type="button" className="wa-pinbar__btn wa-pinbar__unpin" disabled={itemBusy} onClick={() => onUnpin(item)} title={t.unpin} aria-label={`${t.unpin}: ${d.label}`}>
											{itemBusy ? <Loader2 size={15} className="animate-spin" /> : <PinOff size={15} />}
										</button>
									) : null}
								</li>
							);
						})}
					</ul>
				</div>
			) : null}
		</div>
	);
}
