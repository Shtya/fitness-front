'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw, Type } from 'lucide-react';
import { ARABIC_FONTS, ENGLISH_FONTS, TYPOGRAPHY_DEFAULTS, TYPOGRAPHY_RANGES } from './typography';

const PANEL_W = 320;
const GUTTER = 8;

const SLIDERS = ['fontSize', 'lineHeight', 'letterSpacing', 'wordSpacing', 'paragraphSpacing'];

const FALLBACK_LABELS = {
	typography: 'Typography',
	typographyHint: 'Applies to the whole document in both Edit and Preview.',
	fontSize: 'Font size',
	lineHeight: 'Line height',
	letterSpacing: 'Letter spacing',
	wordSpacing: 'Word spacing',
	paragraphSpacing: 'Paragraph spacing',
	arabicFont: 'Arabic font',
	englishFont: 'English font',
	reset: 'Reset',
};

function formatValue(key, value) {
	const { unit, digits } = TYPOGRAPHY_RANGES[key];
	return `${Number(value).toFixed(digits)}${unit}`;
}

function FontChoices({ fonts, value, onPick, lang }) {
	return (
		<div className="sd-typo-fonts">
			{Object.entries(fonts).map(([id, font]) => (
				<button
					key={id}
					type="button"
					aria-pressed={value === id}
					className={`sd-typo-font${value === id ? ' is-active' : ''}`}
					onClick={() => onPick(id)}
				>
					<span className="sd-typo-font-sample" lang={lang} style={{ fontFamily: font.stack }}>
						{font.sample}
					</span>
					<span className="sd-typo-font-name">{font.label}</span>
				</button>
			))}
		</div>
	);
}

export default function TypographyPanel({ settings, onChange, labels = {} }) {
	const [open, setOpen] = useState(false);
	const [pos, setPos] = useState(null);
	const triggerRef = useRef(null);
	const panelRef = useRef(null);
	const L = { ...FALLBACK_LABELS, ...Object.fromEntries(Object.entries(labels).filter(([, v]) => v)) };

	const place = useCallback(() => {
		const el = triggerRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const isRtl = getComputedStyle(el).direction === 'rtl';
		const width = Math.min(PANEL_W, window.innerWidth - GUTTER * 2);
		const preferred = isRtl ? rect.left : rect.right - width;
		const left = Math.min(Math.max(GUTTER, preferred), window.innerWidth - width - GUTTER);
		const panelH = panelRef.current?.offsetHeight || 420;
		const below = rect.bottom + 8;
		const top = below + panelH > window.innerHeight - GUTTER && rect.top - 8 - panelH > GUTTER
			? Math.max(GUTTER, rect.top - 8 - panelH)
			: Math.min(below, window.innerHeight - GUTTER - Math.min(panelH, window.innerHeight - GUTTER * 2));
		setPos({ top, left, width });
	}, []);

	useLayoutEffect(() => {
		if (!open) return undefined;
		place();
		window.addEventListener('resize', place);
		window.addEventListener('scroll', place, true);
		return () => {
			window.removeEventListener('resize', place);
			window.removeEventListener('scroll', place, true);
		};
	}, [open, place]);

	useEffect(() => {
		if (!open) return undefined;
		const onDown = (e) => {
			if (panelRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return;
			setOpen(false);
		};
		const onKey = (e) => {
			if (e.key === 'Escape') {
				setOpen(false);
				triggerRef.current?.focus();
			}
		};
		document.addEventListener('mousedown', onDown);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDown);
			document.removeEventListener('keydown', onKey);
		};
	}, [open]);

	const update = (key, value) => onChange({ ...settings, [key]: value });
	const isDefault = Object.keys(TYPOGRAPHY_DEFAULTS).every((k) => settings[k] === TYPOGRAPHY_DEFAULTS[k]);

	return (
		<div className="sd-typo">
			<button
				ref={triggerRef}
				type="button"
				className={`sd-icon-btn sd-typo-trigger${open ? ' is-open' : ''}`}
				aria-expanded={open}
				aria-haspopup="dialog"
				title={L.typography}
				onClick={() => setOpen((v) => !v)}
			>
				<Type size={15} />
			</button>

			{open && pos && typeof document !== 'undefined'
				? createPortal(
					<div
						ref={panelRef}
						className="sd-typo-panel"
						role="dialog"
						aria-label={L.typography}
						style={{ top: pos.top, left: pos.left, width: pos.width }}
					>
						<div className="sd-typo-head">
							<div>
								<div className="sd-typo-title">{L.typography}</div>
								<p className="sd-typo-hint">{L.typographyHint}</p>
							</div>
							<button
								type="button"
								className="sd-typo-reset"
								disabled={isDefault}
								onClick={() => onChange({ ...TYPOGRAPHY_DEFAULTS })}
							>
								<RotateCcw size={12} />
								{L.reset}
							</button>
						</div>

						<div className="sd-typo-section">
							<div className="sd-typo-label">{L.arabicFont}</div>
							<FontChoices fonts={ARABIC_FONTS} value={settings.arabicFont} lang="ar" onPick={(id) => update('arabicFont', id)} />
						</div>

						<div className="sd-typo-section">
							<div className="sd-typo-label">{L.englishFont}</div>
							<FontChoices fonts={ENGLISH_FONTS} value={settings.englishFont} lang="en" onPick={(id) => update('englishFont', id)} />
						</div>

						<div className="sd-typo-section sd-typo-sliders">
							{SLIDERS.map((key) => {
								const range = TYPOGRAPHY_RANGES[key];
								return (
									<label key={key} className="sd-typo-slider">
										<span className="sd-typo-slider-row">
											<span>{L[key]}</span>
											<output>{formatValue(key, settings[key])}</output>
										</span>
										<input
											type="range"
											min={range.min}
											max={range.max}
											step={range.step}
											value={settings[key]}
											onChange={(e) => update(key, Number(e.target.value))}
											onDoubleClick={() => update(key, TYPOGRAPHY_DEFAULTS[key])}
										/>
									</label>
								);
							})}
						</div>
					</div>,
					document.body,
				)
				: null}
		</div>
	);
}
