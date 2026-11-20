'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { describeColor } from '../engine/color.js';
import { colorName, FAMILY_PATTERN, inkOn } from '../outfit-ui.js';
import { imageUrl } from '../wardrobe/db.js';
import { itemHex } from '../engine/stylist.js';

export function Swatch({ hex, family, size = 'md', colorBlind, label, className = '' }) {
	const fam = family || (colorBlind && hex ? describeColor(hex)?.family : null);
	const pattern = colorBlind ? FAMILY_PATTERN[fam] || 'none' : 'none';
	return (
		<span
			className={`wa-of-swatch wa-of-swatch-${size} ${className}`}
			data-pattern={pattern}
			style={{ '--swatch': hex || 'transparent', '--swatch-ink': hex ? inkOn(hex) : 'currentColor' }}
			role={label ? 'img' : undefined}
			aria-label={label}
			aria-hidden={label ? undefined : true}
		/>
	);
}

/** Colour shown with its name and hex as text (never colour alone). */
export function ColorLabel({ hex, locale, colorBlind, showHex = true }) {
	if (!hex) return null;
	return (
		<span className="wa-of-colorlabel">
			<Swatch hex={hex} size="sm" colorBlind={colorBlind} />
			<span>{colorName(hex, locale)}</span>
			{showHex ? (
				<span className="wa-of-mono" dir="ltr">
					{hex}
				</span>
			) : null}
		</span>
	);
}

export function ScoreRing({ score, label, size = 'md' }) {
	return (
		<span className={`wa-of-score wa-of-score-${size}`} style={{ '--score': score }} role="img" aria-label={label}>
			{score}
		</span>
	);
}

/** Modal sheet: bottom sheet on phones, centred dialog on larger screens. */
export function Sheet({ open, onClose, title, children, footer, size = 'md', labelledBy }) {
	const tc = useTranslations('outfitMatcher.common');
	const ref = useRef(null);
	const id = useId();
	useEffect(() => {
		if (!open) return undefined;
		const previous = document.activeElement;
		const node = ref.current;
		const focusable = () => [...(node?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') || [])].filter(el => !el.disabled && el.offsetParent !== null);
		requestAnimationFrame(() => (focusable()[0] || node)?.focus());
		const onKey = event => {
			if (event.key === 'Escape') {
				event.stopPropagation();
				onClose?.();
			}
			if (event.key === 'Tab') {
				const list = focusable();
				if (!list.length) return;
				const first = list[0];
				const last = list[list.length - 1];
				if (event.shiftKey && document.activeElement === first) {
					event.preventDefault();
					last.focus();
				} else if (!event.shiftKey && document.activeElement === last) {
					event.preventDefault();
					first.focus();
				}
			}
		};
		document.addEventListener('keydown', onKey, true);
		const overflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.removeEventListener('keydown', onKey, true);
			document.body.style.overflow = overflow;
			previous?.focus?.();
		};
	}, [open, onClose]);
	if (!open) return null;
	return (
		<div className="wa-of-sheet-wrap" onMouseDown={event => event.target === event.currentTarget && onClose?.()}>
			<div ref={ref} className={`wa-of-sheet wa-of-sheet-${size}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy || id} tabIndex={-1}>
				<div className="wa-of-sheet-head">
					<span className="wa-of-sheet-grip" aria-hidden="true" />
					<h2 id={id} className="wa-of-sheet-title">
						{title}
					</h2>
					<button type="button" className="wa-of-icon-btn" onClick={onClose} aria-label={tc('close')}>
						<X size={20} aria-hidden="true" />
					</button>
				</div>
				<div className="wa-of-sheet-body">{children}</div>
				{footer ? <div className="wa-of-sheet-foot">{footer}</div> : null}
			</div>
		</div>
	);
}

export function Segmented({ value, options, onChange, label, size = 'md' }) {
	return (
		<div className={`wa-of-segment wa-of-segment-${size}`} role="tablist" aria-label={label}>
			{options.map(option => (
				<button
					key={option.id}
					type="button"
					role="tab"
					aria-selected={value === option.id}
					className="wa-of-segment-btn"
					data-active={value === option.id || undefined}
					onClick={() => onChange(option.id)}
				>
					{option.icon ? <option.icon size={16} aria-hidden="true" /> : null}
					<span>{option.label}</span>
					{option.badge ? <span className="wa-of-count">{option.badge}</span> : null}
				</button>
			))}
		</div>
	);
}

export function Chips({ value, options, onChange, label, render, multiple = false, size = 'md' }) {
	const isOn = option => (multiple ? (value || []).includes(option) : value === option);
	return (
		<div className={`wa-of-chips wa-of-chips-${size}`} role={multiple ? 'group' : 'radiogroup'} aria-label={label}>
			{options.map(option => (
				<button
					key={option}
					type="button"
					role={multiple ? undefined : 'radio'}
					aria-checked={multiple ? undefined : isOn(option)}
					aria-pressed={multiple ? isOn(option) : undefined}
					className="wa-of-chip"
					data-active={isOn(option) || undefined}
					onClick={() => {
						if (!multiple) return onChange(option);
						const list = value || [];
						onChange(isOn(option) ? list.filter(v => v !== option) : [...list, option]);
					}}
				>
					{render(option)}
				</button>
			))}
		</div>
	);
}

/** Compact select that looks like a pill: "Occasion · Casual ▾". */
export function PillSelect({ label, value, options, onChange, render, icon: Icon }) {
	return (
		<label className="wa-of-pill-select">
			{Icon ? <Icon size={15} aria-hidden="true" /> : null}
			<span className="wa-of-pill-label">{label}</span>
			<select value={value} onChange={event => onChange(event.target.value)} aria-label={label}>
				{options.map(option => (
					<option key={option} value={option}>
						{render(option)}
					</option>
				))}
			</select>
			<span className="wa-of-pill-value" aria-hidden="true">
				{render(value)}
			</span>
			<ChevronDown size={14} aria-hidden="true" />
		</label>
	);
}

export function EmptyState({ icon: Icon, title, text, action }) {
	return (
		<div className="wa-of-empty">
			{Icon ? (
				<span className="wa-of-empty-icon">
					<Icon size={26} aria-hidden="true" />
				</span>
			) : null}
			<p className="wa-of-empty-title">{title}</p>
			{text ? <p className="wa-of-empty-text wa-of-muted">{text}</p> : null}
			{action}
		</div>
	);
}

/** Item photo from IndexedDB (lazy), falling back to a colour tile. */
export function ItemImage({ item, size = 'thumb', className = '', colorBlind }) {
	const [url, setUrl] = useState(null);
	const [visible, setVisible] = useState(false);
	const ref = useRef(null);
	useEffect(() => {
		const node = ref.current;
		if (!node) return undefined;
		const io = new IntersectionObserver(entries => {
			if (entries.some(entry => entry.isIntersecting)) {
				setVisible(true);
				io.disconnect();
			}
		}, { rootMargin: '200px' });
		io.observe(node);
		return () => io.disconnect();
	}, []);
	useEffect(() => {
		if (!visible || !item?.id || item.noPhoto) return undefined;
		let alive = true;
		imageUrl(item.id, size).then(value => alive && setUrl(value));
		return () => {
			alive = false;
		};
	}, [visible, item?.id, item?.updatedAt, item?.noPhoto, size]);
	const hex = itemHex(item);
	return (
		<span ref={ref} className={`wa-of-itemimg ${className}`} style={{ '--swatch': hex || 'transparent' }}>
			{url ? (
				<img src={url} alt="" loading="lazy" decoding="async" />
			) : (
				<>
					<Swatch hex={hex} size="fill" colorBlind={colorBlind} />
					<GarmentGlyph category={item?.category} ink={hex ? inkOn(hex) : 'currentColor'} />
				</>
			)}
		</span>
	);
}

/** A simple garment outline drawn over colour-only tiles, so pieces without a photo read as clothes. */
const GLYPHS = {
	top: 'M9 4l3 2 3-2 5 3-2 4-2-1v10H8V10l-2 1-2-4z',
	outerwear: 'M9 4l3 3 3-3 5 3-2 4-2-1v10h-3.5V8L12 10l-.5-2V20H8V10l-2 1-2-4z',
	onepiece: 'M9 3l3 2 3-2 4 3-2 3-1-1v13H8V8L7 9 5 6z',
	bottom: 'M7 3h10l1 18h-4l-2-11-2 11H6z',
	shoes: 'M3 15c0-2 1-4 2-5l3 1c1 2 3 3 6 3l5 1c1 0 2 1 2 2v1H3z',
	socks: 'M9 3h5v9l3 3c1 1 1 3 0 4s-3 1-4 0l-4-4z',
	belt: 'M3 10h18v4H3z M10 9h4v6h-4z',
	watch: 'M9 3h6v4H9z M9 17h6v4H9z M12 7a5 5 0 110 10 5 5 0 010-10z',
};
function GarmentGlyph({ category, ink }) {
	const d = GLYPHS[category];
	if (!d) return null;
	return (
		<svg className="wa-of-glyph" viewBox="0 0 24 24" aria-hidden="true" style={{ color: ink }}>
			<path d={d} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
		</svg>
	);
}

export function Disclosure({ title, children, defaultOpen = false, icon: Icon, badge }) {
	return (
		<details className="wa-of-disclosure" open={defaultOpen || undefined}>
			<summary>
				{Icon ? <Icon size={17} aria-hidden="true" /> : null}
				<span className="wa-of-grow">{title}</span>
				{badge}
				<ChevronDown size={16} className="wa-of-disclosure-icon" aria-hidden="true" />
			</summary>
			<div className="wa-of-disclosure-body">{children}</div>
		</details>
	);
}
