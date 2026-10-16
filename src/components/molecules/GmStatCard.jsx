'use client';

import { useEffect, useRef, useState } from 'react';
import { animate, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

const NUM = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const fmt = n => NUM.format(Number(n) || 0);
const isNumber = v => typeof v === 'number' && Number.isFinite(v);

// Card-only typefaces: Sora for Latin letters and numbers, Readex Pro for Arabic. Loaded once, the
// first time a stat card mounts, so pages without cards never download them.
const CARD_FONTS = 'https://fonts.googleapis.com/css2?family=Readex+Pro:wght@400;500;600;700&family=Sora:wght@500;600;700;800&display=swap';
function useCardFonts() {
	useEffect(() => {
		if (document.querySelector('link[data-gm-card-fonts]')) return;
		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = CARD_FONTS;
		link.dataset.gmCardFonts = '';
		document.head.appendChild(link);
	}, []);
}

/** Counts up to `value` on mount and whenever it changes. */
function useCountUp(value, enabled) {
	const [shown, setShown] = useState(enabled ? 0 : value);
	const from = useRef(enabled ? 0 : value);
	useEffect(() => {
		if (!enabled) {
			setShown(value);
			return undefined;
		}
		const controls = animate(from.current, value, {
			duration: Math.min(1, 0.4 + Math.log10(Math.abs(value) + 1) * 0.2),
			ease: [0.16, 1, 0.3, 1],
			onUpdate: v => setShown(v),
		});
		from.current = value;
		return () => controls.stop();
	}, [value, enabled]);
	return shown;
}

/**
 * How much of a known whole this card represents (e.g. 9 of 14 plans).
 * Only shown when there is a real reference total — never an invented trend.
 */
function shareOf(card) {
	const part = isNumber(card.spark) ? card.spark : Number(card.value);
	const whole = Number(card.max);
	if (!Number.isFinite(part) || !(whole > 0) || part < 0 || part > whole) return null;
	// A card measured against itself ("14 of 14") says nothing.
	if (!isNumber(card.spark) && Number(card.value) === whole) return null;
	return { part, whole, pct: Math.round((part / whole) * 100) };
}

export default function GmStatCard({ card, index = 0 }) {
	const Icon = card.icon;
	useCardFonts();
	const reduce = useReducedMotion();
	const clickable = typeof card.onClick === 'function';
	const Tag = clickable ? motion.button : motion.article;
	const numeric = isNumber(card.value);
	const counted = useCountUp(numeric ? card.value : 0, numeric && !reduce);
	const share = shareOf(card);
	const accent = card.stroke || 'var(--color-primary-500)';
	const text = numeric ? fmt(Number.isInteger(card.value) ? Math.round(counted) : counted) : String(card.value ?? '—');
	const longText = !numeric && text.length > 12;
	const ratio = share ? `${fmt(share.part)} / ${fmt(share.whole)}` : '';

	return (
		<motion.div
			initial={reduce ? false : { opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.03 + index * 0.05, type: 'spring', stiffness: 220, damping: 24 }}
			className='h-full'
		>
			<Tag
				type={clickable ? 'button' : undefined}
				onClick={card.onClick}
				whileHover={clickable && !reduce ? { y: -2 } : undefined}
				whileTap={clickable && !reduce ? { scale: 0.985 } : undefined}
				transition={{ type: 'spring', stiffness: 400, damping: 28 }}
				style={{ '--gm-stat-accent': accent }}
				className={`gm-stat w-full text-start ${clickable ? 'gm-stat--action' : ''}`}
				aria-label={clickable ? `${card.title}: ${numeric ? fmt(card.value) : text}` : undefined}
			>
				<span className='gm-stat__top'>
					<span className='gm-stat__title'>{card.title}</span>
					{clickable ? <ArrowUpRight className='gm-stat__go size-4 rtl:-scale-x-100' aria-hidden /> : null}
					<span className={`gm-stat__icon ${card.tone || 'gm-chip'}`} aria-hidden>
						<Icon strokeWidth={2} />
					</span>
				</span>

				<span className='gm-stat__line'>
					<span className={`gm-stat__value gm-display ${longText ? 'is-text' : ''}`} title={longText ? text : undefined}>
						{numeric ? <span aria-hidden>{text}</span> : text}
						{numeric ? <span className='sr-only'>{fmt(card.value)}</span> : null}
					</span>
					{share ? <span className='gm-stat__pct' title={ratio}>{share.pct}%</span> : null}
				</span>

				{card.hint ? <span className='gm-stat__hint' title={card.hint}>{card.hint}</span> : null}

				{share ? (
					<span
						className='gm-stat__track'
						role='meter'
						aria-valuemin={0}
						aria-valuemax={share.whole}
						aria-valuenow={share.part}
						aria-label={`${card.title}: ${ratio}`}
					>
						<motion.span
							className='gm-stat__fill'
							initial={reduce ? false : { scaleX: 0 }}
							animate={{ scaleX: share.pct / 100 }}
							transition={{ delay: 0.15 + index * 0.05, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
						/>
					</span>
				) : null}
			</Tag>
		</motion.div>
	);
}
