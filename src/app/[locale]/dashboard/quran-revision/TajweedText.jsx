'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
	TAJWEED_RULES,
	maskTajweedWords,
	parseTajweedToWords,
} from './tajweed';

function Tip({ anchorRect, rules, isAr, tipId, onEnter, onLeave }) {
	if (!anchorRect || !rules?.length) return null;
	const gap = 10;
	const width = Math.min(340, window.innerWidth - 16);
	let left = anchorRect.left + anchorRect.width / 2 - width / 2;
	left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
	const spaceBelow = window.innerHeight - anchorRect.bottom;
	const preferBelow = spaceBelow > 220 || anchorRect.top < 200;
	const top = preferBelow ? anchorRect.bottom + gap : anchorRect.top - gap;
	const transform = preferBelow ? 'none' : 'translateY(-100%)';

	const meaningLabel = isAr ? 'يعني إيه؟' : 'What does it mean?';
	const whyLabel = isAr ? 'ليه الكلمة دي؟' : 'Why on this word?';

	return createPortal(
		<div
			id={tipId}
			className="qr-tw-tip"
			role="tooltip"
			dir={isAr ? 'rtl' : 'ltr'}
			style={{ left, top, width, transform }}
			onMouseEnter={onEnter}
			onMouseLeave={onLeave}
		>
			<ul className="qr-tw-tip-list">
				{rules.map(code => {
					const r = TAJWEED_RULES[code];
					if (!r) return null;
					return (
						<li key={code} className="qr-tw-tip-card">
							<header className="qr-tw-tip-head">
								<span className="qr-tw-swatch is-lg" style={{ background: r.color }} aria-hidden />
								<strong>{isAr ? r.nameAr : r.nameEn}</strong>
							</header>
							<div className="qr-tw-tip-box">
								<span className="qr-tw-tip-label">{meaningLabel}</span>
								<p>{isAr ? r.meaningAr : r.meaningEn}</p>
							</div>
							<div className="qr-tw-tip-box is-soft">
								<span className="qr-tw-tip-label">{whyLabel}</span>
								<p>{isAr ? r.whyAr : r.whyEn}</p>
							</div>
						</li>
					);
				})}
			</ul>
		</div>,
		document.body,
	);
}

export default function TajweedText({
	tajweed,
	plain,
	hideParts = [],
	enabled = true,
	isAr = true,
}) {
	const tipId = useId();
	const rootRef = useRef(null);
	const hideTimer = useRef(null);
	const [active, setActive] = useState(null); // { index, rect, rules }

	const words = useMemo(() => {
		if (!enabled || !tajweed) {
			const text = plain || '';
			if (!hideParts?.length) {
				return text.trim() ? [{ parts: [{ text }], rules: [] }] : [];
			}
			const ws = text.trim().split(/\s+/).filter(Boolean);
			const n = ws.length;
			const parts = new Set(hideParts);
			return ws.map((w, i) => {
				const bucket = Math.min(2, Math.floor((i * 3) / Math.max(1, n)));
				const zone = bucket === 0 ? 'start' : bucket === 1 ? 'middle' : 'end';
				return {
					parts: [{ text: parts.has(zone) ? '••••' : w }],
					rules: [],
				};
			});
		}
		return maskTajweedWords(parseTajweedToWords(tajweed), hideParts);
	}, [enabled, tajweed, plain, hideParts]);

	const clear = useCallback(() => {
		if (hideTimer.current) {
			window.clearTimeout(hideTimer.current);
			hideTimer.current = null;
		}
		setActive(null);
	}, []);

	const scheduleClear = useCallback(() => {
		if (hideTimer.current) window.clearTimeout(hideTimer.current);
		hideTimer.current = window.setTimeout(() => {
			setActive(null);
			hideTimer.current = null;
		}, 160);
	}, []);

	const cancelClear = useCallback(() => {
		if (hideTimer.current) {
			window.clearTimeout(hideTimer.current);
			hideTimer.current = null;
		}
	}, []);

	useEffect(() => () => {
		if (hideTimer.current) window.clearTimeout(hideTimer.current);
	}, []);

	useEffect(() => {
		if (!active) return undefined;
		const onScroll = () => clear();
		window.addEventListener('scroll', onScroll, true);
		return () => window.removeEventListener('scroll', onScroll, true);
	}, [active, clear]);

	const showFor = (index, el, rules) => {
		if (!rules?.length) return;
		cancelClear();
		const rect = el.getBoundingClientRect();
		setActive({ index, rect, rules });
	};

	if (!words.length) {
		return <span className="qr-ayah-text">{plain || ''}</span>;
	}

	return (
		<span className="qr-ayah-text qr-tw-text" ref={rootRef}>
			{words.map((word, index) => {
				const hasRules = word.rules.length > 0;
				return (
					<span key={`${index}-${word.parts.map(p => p.text).join('')}`}>
						{index > 0 ? ' ' : null}
						<span
							className={hasRules ? 'qr-tw-word has-rule' : 'qr-tw-word'}
							tabIndex={hasRules ? 0 : undefined}
							aria-describedby={active?.index === index ? tipId : undefined}
							onMouseEnter={hasRules ? (e) => showFor(index, e.currentTarget, word.rules) : undefined}
							onMouseLeave={hasRules ? scheduleClear : undefined}
							onFocus={hasRules ? (e) => showFor(index, e.currentTarget, word.rules) : undefined}
							onBlur={hasRules ? scheduleClear : undefined}
							onClick={hasRules ? (e) => {
								if (active?.index === index) clear();
								else showFor(index, e.currentTarget, word.rules);
							} : undefined}
						>
							{word.parts.map((p, pi) => (
								p.code ? (
									<span
										key={pi}
										className={`qr-tw-mark qr-tw-${TAJWEED_RULES[p.code]?.id || p.code}`}
										style={{
											color: p.color,
											fontFamily: 'var(--font-qr-uthmani), var(--font-qr-amiri), serif',
										}}
									>
										{p.text}
									</span>
								) : (
									<span
										key={pi}
										style={{ fontFamily: 'var(--font-qr-uthmani), var(--font-qr-amiri), serif' }}
									>
										{p.text}
									</span>
								)
							))}
						</span>
					</span>
				);
			})}
			{active ? (
				<Tip
					anchorRect={active.rect}
					rules={active.rules}
					isAr={isAr}
					tipId={tipId}
					onEnter={cancelClear}
					onLeave={scheduleClear}
				/>
			) : null}
		</span>
	);
}
