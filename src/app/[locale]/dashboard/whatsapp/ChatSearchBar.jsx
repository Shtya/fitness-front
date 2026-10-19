'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, List, Loader2, Search, X } from 'lucide-react';
import './chat-bars.css';

const copy = {
	en: {
		placeholder: 'Search in this chat',
		clear: 'Clear',
		close: 'Close search',
		older: 'Older match (Enter)',
		newer: 'Newer match (Shift+Enter)',
		results: 'Results',
		noResults: 'No results',
		searching: 'Searching…',
		you: 'You',
		hint: 'Type a word or a phrase',
	},
	ar: {
		placeholder: 'ابحث في هذه المحادثة',
		clear: 'مسح',
		close: 'إغلاق البحث',
		older: 'النتيجة الأقدم (Enter)',
		newer: 'النتيجة الأحدث (Shift+Enter)',
		results: 'النتائج',
		noResults: 'لا توجد نتائج',
		searching: 'جارٍ البحث…',
		you: 'أنت',
		hint: 'اكتب كلمة أو جملة',
	},
};

function formatWhen(value, ar) {
	if (!value) return '';
	const date = new Date(value);
	if (!Number.isFinite(date.getTime())) return '';
	const today = new Date();
	const sameDay = date.toDateString() === today.toDateString();
	return date.toLocaleString(ar ? 'ar-EG-u-nu-latn' : undefined, sameDay ? { hour: 'numeric', minute: '2-digit' } : { month: 'short', day: 'numeric' });
}

/** The matched words with a little context on each side, the match itself highlighted. */
function Snippet({ text, query }) {
	const source = String(text || '').replace(/\s+/g, ' ').trim();
	const q = String(query || '').trim();
	const at = q ? source.toLowerCase().indexOf(q.toLowerCase()) : -1;
	if (at < 0) return <span>{source.slice(0, 120)}</span>;
	const start = Math.max(0, at - 32);
	const end = Math.min(source.length, at + q.length + 70);
	return (
		<span>
			{start > 0 ? '…' : ''}
			{source.slice(start, at)}
			<mark>{source.slice(at, at + q.length)}</mark>
			{source.slice(at + q.length, end)}
			{end < source.length ? '…' : ''}
		</span>
	);
}

export default function ChatSearchBar({ ar = false, query = '', onQuery, busy = false, hits = [], activeIndex = -1, onStep, onPick, onClose, peerName = '' }) {
	const t = ar ? copy.ar : copy.en;
	const [showList, setShowList] = useState(false);
	const input = useRef(null);
	const listRef = useRef(null);
	const wrap = useRef(null);
	const hasQuery = Boolean(String(query).trim());
	const count = hits.length;
	const active = count ? Math.max(activeIndex, 0) : -1;

	useEffect(() => {
		input.current?.focus();
	}, []);

	// Keep the highlighted result visible in the list.
	useEffect(() => {
		if (!showList || active < 0) return;
		listRef.current?.querySelector(`[data-hit="${active}"]`)?.scrollIntoView({ block: 'nearest' });
	}, [showList, active]);

	useEffect(() => {
		if (!showList) return undefined;
		const onDown = event => {
			if (!wrap.current?.contains(event.target)) setShowList(false);
		};
		document.addEventListener('pointerdown', onDown);
		return () => document.removeEventListener('pointerdown', onDown);
	}, [showList]);

	const onKeyDown = event => {
		if (event.key === 'Enter') {
			event.preventDefault();
			onStep?.(event.shiftKey ? -1 : 1);
		} else if (event.key === 'ArrowDown' && count) {
			event.preventDefault();
			setShowList(true);
			onStep?.(1);
		} else if (event.key === 'ArrowUp' && count) {
			event.preventDefault();
			onStep?.(-1);
		} else if (event.key === 'Escape') {
			event.preventDefault();
			if (showList) setShowList(false);
			else if (query) onQuery?.('');
			else onClose?.();
		}
	};

	let status = null;
	if (hasQuery) {
		if (busy && !count) status = <span className="wa-findbar__status">{t.searching}</span>;
		else if (!count) status = <span className="wa-findbar__status is-empty">{t.noResults}</span>;
		else
			status = (
				<span className="wa-findbar__status is-count" aria-live="polite">
					<b>{active + 1}</b>
					<span>/</span>
					{count}
				</span>
			);
	}

	return (
		<div className="wa-findbar-wrap" ref={wrap}>
			<div className={`wa-findbar ${hasQuery && !count && !busy ? 'is-miss' : ''}`} role="search">
				<label className="wa-findbar__field">
					<Search size={17} className="wa-findbar__icon" aria-hidden />
					<span className="wa-findbar__sr">{t.placeholder}</span>
					<input
						ref={input}
						value={query}
						onChange={event => onQuery?.(event.target.value)}
						onKeyDown={onKeyDown}
						placeholder={t.placeholder}
						dir="auto"
						autoComplete="off"
						enterKeyHint="search"
					/>
					{busy ? <Loader2 size={15} className="wa-findbar__spin animate-spin" aria-hidden /> : null}
					{query ? (
						<button type="button" className="wa-findbar__clear" onClick={() => onQuery?.('')} aria-label={t.clear} title={t.clear}>
							<X size={13} />
						</button>
					) : null}
				</label>

				{status}

				<div className="wa-findbar__nav">
					<button type="button" className="wa-findbar__btn" disabled={!count || active >= count - 1} onClick={() => onStep?.(1)} aria-label={t.older} title={t.older}>
						<ChevronUp size={18} />
					</button>
					<button type="button" className="wa-findbar__btn" disabled={!count || active <= 0} onClick={() => onStep?.(-1)} aria-label={t.newer} title={t.newer}>
						<ChevronDown size={18} />
					</button>
				</div>

				<button
					type="button"
					className={`wa-findbar__btn wa-findbar__list-btn ${showList ? 'is-on' : ''}`}
					disabled={!count}
					onClick={() => setShowList(v => !v)}
					aria-expanded={showList}
					title={t.results}
				>
					<List size={17} />
					<span>{t.results}</span>
				</button>

				<span className="wa-findbar__divider" aria-hidden />

				<button type="button" className="wa-findbar__btn" onClick={onClose} aria-label={t.close} title={t.close}>
					<X size={18} />
				</button>
			</div>

			{showList && count ? (
				<div className="wa-findbar__results" ref={listRef} role="listbox" aria-label={t.results}>
					{hits.map((hit, i) => {
						const mine = hit.direction === 'outbound' || hit.fromMe;
						const who = mine ? t.you : hit.senderName || peerName || '';
						return (
							<button
								key={hit.id || i}
								type="button"
								role="option"
								aria-selected={i === active}
								data-hit={i}
								className={`wa-findbar__hit ${i === active ? 'is-active' : ''}`}
								onClick={() => {
									onPick?.(i);
									setShowList(false);
								}}
							>
								<span className={`wa-findbar__who ${mine ? 'is-me' : ''}`}>{who}</span>
								<span className="wa-findbar__when">{formatWhen(hit.providerTimestamp || hit.createdAt || hit.created_at, ar)}</span>
								<span className="wa-findbar__snippet" dir="auto">
									<Snippet text={hit.text} query={query} />
								</span>
							</button>
						);
					})}
				</div>
			) : null}
		</div>
	);
}
