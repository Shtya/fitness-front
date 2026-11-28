'use client';

/*
 * The red "not sent" mark on an outgoing message. Hover it (or focus it, or tap it on a phone)
 * and a card explains why the message failed and how to fix it, with the server's own words
 * underneath and a Retry button. Clicking the mark itself still retries straight away.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check, Copy, RotateCcw } from 'lucide-react';
import { explainSendFailure } from './wa-send-failure';
import './wa-send-failure.css';

const CARD_W = 300;
const GAP = 8;

function retry(message) {
	window.dispatchEvent(new CustomEvent('wa-retry-outbound', { detail: { message } }));
}

export default function WaSendFailure({ message, size = 13, className = '' }) {
	const ar = typeof document !== 'undefined' && (document.documentElement.lang === 'ar' || document.documentElement.dir === 'rtl');
	const info = explainSendFailure(message, ar);
	const [open, setOpen] = useState(false);
	const [place, setPlace] = useState(null);
	const [copied, setCopied] = useState(false);
	const btnRef = useRef(null);
	const cardRef = useRef(null);
	const closeTimer = useRef(0);
	const touchRef = useRef(false);

	const show = useCallback(() => {
		window.clearTimeout(closeTimer.current);
		setOpen(true);
	}, []);
	const hideSoon = useCallback(() => {
		window.clearTimeout(closeTimer.current);
		closeTimer.current = window.setTimeout(() => setOpen(false), 180);
	}, []);
	useEffect(() => () => window.clearTimeout(closeTimer.current), []);

	// place the card above the mark (below when there is no room), kept inside the window
	useLayoutEffect(() => {
		if (!open) return undefined;
		const measure = () => {
			const b = btnRef.current?.getBoundingClientRect();
			if (!b) return;
			const h = cardRef.current?.offsetHeight || 180;
			const vw = window.innerWidth;
			const vh = window.innerHeight;
			const w = Math.min(CARD_W, vw - 16);
			const above = b.top - GAP - h >= 8 || b.top > vh - b.bottom;
			const top = above ? Math.max(8, b.top - GAP - h) : Math.min(vh - h - 8, b.bottom + GAP);
			// hang off the mark toward the bubble: end-aligned in LTR, start-aligned in RTL
			const rtl = getComputedStyle(btnRef.current).direction === 'rtl';
			const left = Math.min(vw - w - 8, Math.max(8, rtl ? b.left : b.right - w));
			setPlace({ top, left, w, above });
		};
		measure();
		const raf = window.requestAnimationFrame(measure);
		// the thread scrolls on its own (new messages, loading older ones): follow the mark, and
		// close only once it has left the window
		const follow = () => {
			const b = btnRef.current?.getBoundingClientRect();
			if (!b || b.bottom < 0 || b.top > window.innerHeight) setOpen(false);
			else measure();
		};
		const onKey = e => e.key === 'Escape' && setOpen(false);
		const onDown = e => {
			if (!cardRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) setOpen(false);
		};
		window.addEventListener('scroll', follow, true);
		window.addEventListener('resize', follow);
		document.addEventListener('keydown', onKey);
		document.addEventListener('pointerdown', onDown);
		return () => {
			window.cancelAnimationFrame(raf);
			window.removeEventListener('scroll', follow, true);
			window.removeEventListener('resize', follow);
			document.removeEventListener('keydown', onKey);
			document.removeEventListener('pointerdown', onDown);
		};
	}, [open]);

	const copyDetail = async () => {
		try {
			await navigator.clipboard.writeText(info.detail || info.title);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1400);
		} catch {
			/* clipboard blocked */
		}
	};

	return (
		<>
			<button
				ref={btnRef}
				type="button"
				aria-label={`${ar ? 'لم تُرسل الرسالة' : 'Message not sent'}: ${info.title}. ${ar ? 'إعادة المحاولة' : 'Retry'}`}
				aria-expanded={open}
				className={`wa-delivery-retry inline-flex items-center ${className}`}
				onPointerDown={e => {
					touchRef.current = e.pointerType === 'touch';
				}}
				onMouseEnter={show}
				onMouseLeave={hideSoon}
				onFocus={show}
				onBlur={hideSoon}
				onClick={event => {
					event.preventDefault();
					event.stopPropagation();
					// a tap opens the explanation first; the card has the Retry button
					if (touchRef.current && !open) {
						show();
						return;
					}
					setOpen(false);
					retry(message);
				}}
			>
				<AlertCircle size={size} className="text-rose-500" aria-hidden="true" />
				{/* The bare icon was easy to miss; in a bubble the action is spelled out. */}
				<span className="wa-delivery-retry__label">{ar ? 'إعادة' : 'Retry'}</span>
			</button>
			{open && typeof document !== 'undefined'
				? createPortal(
						<div
							ref={cardRef}
							className={`wa-nsf${place?.above === false ? ' is-below' : ''}`}
							role="dialog"
							aria-label={info.title}
							dir={ar ? 'rtl' : 'ltr'}
							style={place ? { top: place.top, left: place.left, width: place.w } : { visibility: 'hidden', top: 0, left: 0 }}
							onMouseEnter={show}
							onMouseLeave={hideSoon}
						>
							<div className="wa-nsf__head">
								<span className="wa-nsf__icon" aria-hidden="true">
									<AlertCircle size={16} strokeWidth={2.4} />
								</span>
								<div className="wa-nsf__titles">
									<small>{ar ? 'الرسالة ما اتبعتتش' : 'Not sent'}</small>
									<b>{info.title}</b>
								</div>
							</div>
							<p className="wa-nsf__fix">{info.fix}</p>
							{info.detail ? (
								<div className="wa-nsf__detail">
									<span className="wa-nsf__detail-label">
										{ar ? 'التفاصيل' : 'Details'}
										{info.code ? <em>HTTP {info.code}</em> : null}
									</span>
									<code dir="auto">{info.detail}</code>
								</div>
							) : null}
							<div className="wa-nsf__actions">
								{info.detail ? (
									<button type="button" className="wa-nsf__ghost" onClick={copyDetail}>
										{copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
										{copied ? (ar ? 'اتنسخ' : 'Copied') : ar ? 'انسخ' : 'Copy'}
									</button>
								) : null}
								<button
									type="button"
									className="wa-nsf__retry"
									onClick={() => {
										setOpen(false);
										retry(message);
									}}
								>
									<RotateCcw size={13} aria-hidden="true" />
									{ar ? 'جرّب تاني' : 'Retry'}
								</button>
							</div>
						</div>,
						document.body,
					)
				: null}
		</>
	);
}
