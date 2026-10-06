'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import './stat-card.css';

const RING_RADIUS = 17;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** Counts from the previous value to the new one; respects reduced-motion. */
function useCountUp(target, duration = 700) {
	const reduceMotion = useReducedMotion();
	const [value, setValue] = useState(reduceMotion ? target : 0);
	const fromRef = useRef(0);

	useEffect(() => {
		if (reduceMotion) {
			setValue(target);
			return undefined;
		}
		const from = fromRef.current;
		const start = performance.now();
		let frame;
		const tick = (now) => {
			const t = Math.min(1, (now - start) / duration);
			const eased = 1 - Math.pow(1 - t, 3);
			setValue(Math.round(from + (target - from) * eased));
			if (t < 1) frame = requestAnimationFrame(tick);
			else fromRef.current = target;
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [target, duration, reduceMotion]);

	return value;
}

/** Share of a total, drawn as a thin ring in the card tone. */
export function ShareRing({ percent }) {
	const safe = Math.min(100, Math.max(0, Math.round(Number(percent) || 0)));
	return (
		<span className='sc-ring' aria-hidden>
			<svg viewBox='0 0 44 44'>
				<circle className='sc-ring__track' cx='22' cy='22' r={RING_RADIUS} />
				<motion.circle
					className='sc-ring__fill'
					cx='22'
					cy='22'
					r={RING_RADIUS}
					strokeDasharray={RING_LENGTH}
					initial={{ strokeDashoffset: RING_LENGTH }}
					animate={{ strokeDashoffset: RING_LENGTH * (1 - safe / 100) }}
					transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
				/>
			</svg>
			<span className='sc-ring__text'>{safe}%</span>
		</span>
	);
}

export function StatCardGrid({ children, className = '' }) {
	return <section className={`sc-grid ${className}`.trim()}>{children}</section>;
}

/**
 * Dashboard metric card: tone accent, raised icon tile, counted value and an
 * optional share ring or custom body.
 */
export default function StatCard({
	icon: Icon,
	label,
	value,
	hint,
	tone = 'primary',
	share,
	index = 0,
	wide = false,
	action,
	onClick,
	children,
}) {
	const numeric = Number(value) || 0;
	const shown = useCountUp(numeric);
	const Tag = onClick ? motion.button : motion.article;

	return (
		<Tag
			type={onClick ? 'button' : undefined}
			onClick={onClick}
			className={`sc-card sc-card--${tone}${wide ? ' is-wide' : ''}${onClick ? ' is-clickable' : ''}`}
			initial={{ opacity: 0, y: 14 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.04 + index * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
			<div className='sc-card__top'>
				{Icon && (
					<span className='sc-card__icon' aria-hidden>
						<Icon strokeWidth={1.9} />
					</span>
				)}
				<span className='sc-card__label' title={typeof label === 'string' ? label : undefined}>
					{label}
				</span>
				{action}
			</div>
			<div className='sc-card__body'>
				<div className='sc-card__figures'>
					<span className='sc-card__value'>{shown.toLocaleString()}</span>
					{hint && (
						<span className='sc-card__hint' title={typeof hint === 'string' ? hint : undefined}>
							{hint}
						</span>
					)}
				</div>
				{children}
				{children == null && Number.isFinite(Number(share)) && <ShareRing percent={share} />}
			</div>
		</Tag>
	);
}
