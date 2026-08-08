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

function ErrorMenu({
	anchorRect,
	isAr,
	labels,
	hasExisting,
	onPick,
	onRemove,
	onCancel,
}) {
	if (!anchorRect) return null;
	const gap = 8;
	const width = Math.min(280, window.innerWidth - 16);
	let left = anchorRect.left + anchorRect.width / 2 - width / 2;
	left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
	const preferAbove = anchorRect.top > 120;
	const top = preferAbove ? anchorRect.top - gap : anchorRect.bottom + gap;
	const transform = preferAbove ? 'translateY(-100%)' : 'none';

	return createPortal(
		<div
			className="qr-err-menu"
			role="dialog"
			aria-label={labels.title}
			dir={isAr ? 'rtl' : 'ltr'}
			style={{ left, top, width, transform }}
			onMouseDown={(e) => e.stopPropagation()}
		>
			<p className="qr-err-menu-title">{labels.title}</p>
			<div className="qr-err-menu-actions">
				<button
					type="button"
					className="qr-err-opt is-tashkeel"
					onClick={() => onPick('tashkeel')}
				>
					{labels.tashkeel}
				</button>
				<button
					type="button"
					className="qr-err-opt is-forgot"
					onClick={() => onPick('forgot')}
				>
					{labels.forgot}
				</button>
			</div>
			<div className="qr-err-menu-foot">
				{hasExisting ? (
					<button type="button" className="qr-err-link is-danger" onClick={onRemove}>
						{labels.remove}
					</button>
				) : null}
				<button type="button" className="qr-err-link" onClick={onCancel}>
					{labels.cancel}
				</button>
			</div>
		</div>,
		document.body,
	);
}

function rangeOf(a, b) {
	const start = Math.min(a, b);
	const end = Math.max(a, b);
	return { start, end };
}

function indicesInRange(start, end) {
	const out = [];
	for (let i = start; i <= end; i += 1) out.push(i);
	return out;
}

function unionRect(els) {
	let left = Infinity;
	let top = Infinity;
	let right = -Infinity;
	let bottom = -Infinity;
	els.forEach((el) => {
		if (!el) return;
		const r = el.getBoundingClientRect();
		left = Math.min(left, r.left);
		top = Math.min(top, r.top);
		right = Math.max(right, r.right);
		bottom = Math.max(bottom, r.bottom);
	});
	if (!Number.isFinite(left)) return null;
	return {
		left,
		top,
		right,
		bottom,
		width: right - left,
		height: bottom - top,
	};
}

export default function TajweedText({
	tajweed,
	plain,
	hideParts = [],
	enabled = true,
	/** When true: hover/focus/click shows rule explanation tooltips. Colors still render when enabled. */
	interactive = false,
	errorMode = false,
	/** wordIndex -> 'tashkeel' | 'forgot' */
	marks = {},
	onSetMarks,
	errorLabels,
	isAr = true,
}) {
	const tipId = useId();
	const rootRef = useRef(null);
	const wordRefs = useRef(new Map());
	const hideTimer = useRef(null);
	const dragRef = useRef(null); // { origin }
	const [active, setActive] = useState(null); // { index, rect, rules }
	const [draft, setDraft] = useState(null); // { start, end }
	const [menu, setMenu] = useState(null); // { start, end, rect }

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

	const labels = errorLabels || {
		title: isAr ? 'نوع الخطأ؟' : 'What kind of mistake?',
		tashkeel: isAr ? 'تشكيل غلط' : 'Wrong tashkeel',
		forgot: isAr ? 'مش فاكرها' : "Don't remember",
		remove: isAr ? 'إزالة العلامة' : 'Remove mark',
		cancel: isAr ? 'إلغاء' : 'Cancel',
	};

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

	const closeMenu = useCallback(() => {
		setMenu(null);
		setDraft(null);
		dragRef.current = null;
	}, []);

	const openMenuForRange = useCallback((start, end) => {
		const idxs = indicesInRange(start, end);
		const els = idxs.map((i) => wordRefs.current.get(i)).filter(Boolean);
		const rect = unionRect(els);
		if (!rect) return;
		setDraft({ start, end });
		setMenu({ start, end, rect });
	}, []);

	useEffect(() => () => {
		if (hideTimer.current) window.clearTimeout(hideTimer.current);
	}, []);

	useEffect(() => {
		if (!interactive || errorMode) clear();
	}, [interactive, errorMode, clear]);

	useEffect(() => {
		if (!errorMode) closeMenu();
	}, [errorMode, closeMenu]);

	useEffect(() => {
		if (!active) return undefined;
		const onScroll = () => clear();
		window.addEventListener('scroll', onScroll, true);
		return () => window.removeEventListener('scroll', onScroll, true);
	}, [active, clear]);

	useEffect(() => {
		if (!menu) return undefined;
		const onScroll = () => closeMenu();
		const onKey = (e) => {
			if (e.key === 'Escape') closeMenu();
		};
		const onPointerDown = (e) => {
			if (e.target?.closest?.('.qr-err-menu')) return;
			if (e.target?.closest?.('.qr-tw-word.is-markable')) return;
			closeMenu();
		};
		window.addEventListener('scroll', onScroll, true);
		window.addEventListener('keydown', onKey);
		window.addEventListener('mousedown', onPointerDown);
		return () => {
			window.removeEventListener('scroll', onScroll, true);
			window.removeEventListener('keydown', onKey);
			window.removeEventListener('mousedown', onPointerDown);
		};
	}, [menu, closeMenu]);

	useEffect(() => {
		if (!errorMode) return undefined;
		const finishDrag = () => {
			const d = dragRef.current;
			if (!d) return;
			dragRef.current = null;
			const { start, end } = rangeOf(d.origin, d.current ?? d.origin);
			openMenuForRange(start, end);
		};
		const onUp = () => finishDrag();
		const onCancel = () => {
			dragRef.current = null;
			setDraft(null);
		};
		window.addEventListener('mouseup', onUp);
		window.addEventListener('blur', onCancel);
		return () => {
			window.removeEventListener('mouseup', onUp);
			window.removeEventListener('blur', onCancel);
		};
	}, [errorMode, openMenuForRange]);

	const showFor = (index, el, rules) => {
		if (!interactive || errorMode || !rules?.length) return;
		cancelClear();
		const rect = el.getBoundingClientRect();
		setActive({ index, rect, rules });
	};

	const beginDrag = (index, e) => {
		if (!errorMode) return;
		e.preventDefault();
		clear();
		dragRef.current = { origin: index, current: index };
		setMenu(null);
		setDraft({ start: index, end: index });
	};

	const extendDrag = (index) => {
		if (!errorMode || !dragRef.current) return;
		dragRef.current.current = index;
		setDraft(rangeOf(dragRef.current.origin, index));
	};

	const applyType = (type) => {
		if (!menu || !onSetMarks) return;
		onSetMarks(indicesInRange(menu.start, menu.end), type);
		closeMenu();
	};

	const removeMarks = () => {
		if (!menu || !onSetMarks) return;
		onSetMarks(indicesInRange(menu.start, menu.end), null);
		closeMenu();
	};

	if (!words.length) {
		return <span className="qr-ayah-text">{plain || ''}</span>;
	}

	const draftRange = draft || (menu ? { start: menu.start, end: menu.end } : null);
	const menuHasExisting = menu
		? indicesInRange(menu.start, menu.end).some((i) => Boolean(marks[i]))
		: false;

	return (
		<span
			className={cx('qr-ayah-text', 'qr-tw-text', errorMode && 'is-error-mode')}
			ref={rootRef}
		>
			{words.map((word, index) => {
				const hasRules = word.rules.length > 0;
				const tipOn = interactive && !errorMode && hasRules;
				const markType = marks[index] || null;
				const inDraft = draftRange
					&& index >= draftRange.start
					&& index <= draftRange.end;

				return (
					<span key={`${index}-${word.parts.map(p => p.text).join('')}`}>
						{index > 0 ? ' ' : null}
						<span
							ref={(el) => {
								if (el) wordRefs.current.set(index, el);
								else wordRefs.current.delete(index);
							}}
							className={cx(
								'qr-tw-word',
								hasRules && 'has-rule',
								tipOn && 'is-interactive',
								errorMode && 'is-markable',
								markType && `is-error is-error-${markType}`,
								inDraft && 'is-draft',
							)}
							data-word-idx={index}
							tabIndex={tipOn || errorMode ? 0 : undefined}
							aria-describedby={tipOn && active?.index === index ? tipId : undefined}
							onMouseEnter={(e) => {
								if (errorMode) {
									extendDrag(index);
									return;
								}
								if (tipOn) showFor(index, e.currentTarget, word.rules);
							}}
							onMouseLeave={tipOn ? scheduleClear : undefined}
							onFocus={tipOn ? (e) => showFor(index, e.currentTarget, word.rules) : undefined}
							onBlur={tipOn ? scheduleClear : undefined}
							onMouseDown={errorMode ? (e) => {
								if (e.button !== 0) return;
								beginDrag(index, e);
							} : undefined}
							onClick={tipOn ? (e) => {
								if (active?.index === index) clear();
								else showFor(index, e.currentTarget, word.rules);
							} : errorMode ? (e) => {
								e.preventDefault();
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
			{interactive && !errorMode && active ? (
				<Tip
					anchorRect={active.rect}
					rules={active.rules}
					isAr={isAr}
					tipId={tipId}
					onEnter={cancelClear}
					onLeave={scheduleClear}
				/>
			) : null}
			{errorMode && menu ? (
				<ErrorMenu
					anchorRect={menu.rect}
					isAr={isAr}
					labels={labels}
					hasExisting={menuHasExisting}
					onPick={applyType}
					onRemove={removeMarks}
					onCancel={closeMenu}
				/>
			) : null}
		</span>
	);
}

function cx(...a) {
	return a.filter(Boolean).join(' ');
}
