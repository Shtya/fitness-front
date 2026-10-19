'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Pin, PinOff, X } from 'lucide-react';

const copy = {
	en: {
		title: 'Pinned',
		hide: 'Hide pinned',
		previous: 'Previous',
		following: 'Next',
		loading: 'Loading pinned messages',
		empty: 'No pinned messages in this chat',
		jump: 'Jump to message',
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
		hide: 'إخفاء المثبّتة',
		previous: 'السابق',
		following: 'التالي',
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
	return date.toLocaleString(ar ? 'ar-EG' : undefined, {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	});
}

function pinnedPreview(message, t) {
	const text = String(message?.text || '').trim();
	if (text) return text;
	const att = Array.isArray(message?.attachments) ? message.attachments[0] : null;
	const type = String(att?.type || message?.type || '').toLowerCase();
	if (type === 'image') return t.photo;
	if (type === 'sticker') return t.sticker;
	if (type.includes('video')) return t.video;
	if (type === 'audio' || type === 'ptt' || type === 'voice') return t.voice;
	if (type.includes('document') || type === 'file') return t.document;
	return t.message;
}

export default function PinnedMessagesPanel({
	ar = false,
	open = true,
	messages = [],
	loading = false,
	busyId = '',
	onHide,
	onJump,
	onUnpin,
}) {
	const t = ar ? copy.ar : copy.en;
	const scrollerRef = useRef(null);
	const [edges, setEdges] = useState({ start: false, end: false });
	const list = Array.isArray(messages) ? messages.filter(item => item?.isPinned !== false) : [];

	const measureEdges = useCallback(() => {
		const node = scrollerRef.current;
		if (!node) return;
		const max = node.scrollWidth - node.clientWidth;
		const offset = Math.abs(node.scrollLeft);
		setEdges(current => {
			const next = { start: offset > 2, end: max - offset > 2 };
			return current.start === next.start && current.end === next.end ? current : next;
		});
	}, []);

	useEffect(() => {
		if (!open || !scrollerRef.current) return undefined;
		scrollerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
		measureEdges();
		window.addEventListener('resize', measureEdges);
		return () => window.removeEventListener('resize', measureEdges);
	}, [open, list.length, measureEdges]);

	if (!open) return null;

	if (loading && !list.length) {
		return (
			<div className="wa-ui-sched is-loading" role="status" aria-label={t.loading}>
				<Loader2 size={14} className="animate-spin" aria-hidden="true" />
				<span>{t.title}</span>
			</div>
		);
	}

	if (!list.length) {
		return (
			<section className="wa-ui-sched wa-ui-pins is-empty" aria-label={t.title}>
				<div className="wa-ui-sched__bar">
					<Pin size={16} strokeWidth={1.9} className="wa-ui-sched__glyph" aria-hidden="true" />
					<span className="wa-ui-sched__title">{t.title}</span>
					<span className="wa-ui-sched__empty-hint">{t.empty}</span>
					{typeof onHide === 'function' ? (
						<div className="wa-ui-sched__tools">
							<button
								type="button"
								className="wa-ui-icon-btn wa-ui-icon-btn--sm"
								onClick={onHide}
								title={t.hide}
								aria-label={t.hide}
							>
								<X size={16} strokeWidth={2} />
							</button>
						</div>
					) : null}
				</div>
			</section>
		);
	}

	const scrollBy = direction => {
		const node = scrollerRef.current;
		if (!node) return;
		const delta = Math.max(180, Math.round(node.clientWidth * 0.7)) * direction;
		node.scrollBy({ left: ar ? -delta : delta, behavior: 'smooth' });
	};

	return (
		<section className="wa-ui-sched wa-ui-pins" aria-label={`${t.title} (${list.length})`}>
			<div className="wa-ui-sched__bar">
				<Pin size={16} strokeWidth={1.9} className="wa-ui-sched__glyph" aria-hidden="true" />
				<span className="wa-ui-sched__title">{t.title}</span>
				<span className="wa-ui-sched__count">{list.length}</span>
				<div className="wa-ui-sched__tools">
					{edges.start ? (
						<button
							type="button"
							className="wa-ui-icon-btn wa-ui-icon-btn--sm"
							onClick={() => scrollBy(-1)}
							aria-label={t.previous}
							title={t.previous}
						>
							{ar ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
						</button>
					) : null}
					{edges.end ? (
						<button
							type="button"
							className="wa-ui-icon-btn wa-ui-icon-btn--sm"
							onClick={() => scrollBy(1)}
							aria-label={t.following}
							title={t.following}
						>
							{ar ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
						</button>
					) : null}
					{typeof onHide === 'function' ? (
						<button
							type="button"
							className="wa-ui-icon-btn wa-ui-icon-btn--sm"
							onClick={onHide}
							title={t.hide}
							aria-label={t.hide}
						>
							<X size={16} strokeWidth={2} />
						</button>
					) : null}
				</div>
			</div>

			<ul ref={scrollerRef} className="wa-ui-sched__list" onScroll={measureEdges}>
				{list.map(item => {
					const busy = busyId === item.id;
					const title = pinnedPreview(item, t);
					const when = formatWhen(item.providerTimestamp || item.createdAt, ar);

					return (
						<li key={item.id} className="wa-ui-sched__card wa-ui-pins__card" aria-busy={busy || undefined}>
							<button
								type="button"
								className="wa-ui-pins__jump"
								onClick={() => onJump?.(item)}
								title={t.jump}
								aria-label={t.jump}
							>
								<p className="wa-ui-sched__text" dir="auto" title={title}>
									{title}
								</p>
								<p className="wa-ui-sched__meta">
									{when ? <span className="truncate">{when}</span> : <span />}
								</p>
							</button>
							<div className="wa-ui-sched__foot">
								<span className="wa-ui-sched__when">
									<Pin size={12} strokeWidth={2.2} aria-hidden="true" />
								</span>
								<span className="wa-ui-sched__actions">
									{typeof onUnpin === 'function' ? (
										<button
											type="button"
											className="wa-ui-icon-btn wa-ui-icon-btn--sm"
											disabled={busy}
											onClick={() => onUnpin?.(item)}
											title={t.unpin}
											aria-label={t.unpin}
										>
											{busy ? (
												<Loader2 size={14} className="animate-spin" />
											) : (
												<PinOff size={14} strokeWidth={2} />
											)}
										</button>
									) : null}
								</span>
							</div>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
