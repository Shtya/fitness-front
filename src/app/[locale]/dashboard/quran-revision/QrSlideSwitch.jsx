'use client';

import { useCallback, useRef } from 'react';
import { LayoutGroup, motion } from 'framer-motion';

const layoutSpring = { type: 'spring', stiffness: 480, damping: 34, mass: 0.65 };

/**
 * Tight fit switch: circle + label swap sides with layout animation.
 */
export default function QrSlideSwitch({
	on = false,
	onChange,
	label,
	icon: Icon,
	title,
	ariaLabel,
	className = '',
}) {
	const burstTimer = useRef(null);

	const toggle = useCallback((event) => {
		event?.preventDefault?.();
		event?.stopPropagation?.();
		onChange?.(!on);
		const el = event?.currentTarget;
		if (!el) return;
		el.classList.add('is-burst');
		if (burstTimer.current) window.clearTimeout(burstTimer.current);
		burstTimer.current = window.setTimeout(() => {
			el.classList.remove('is-burst');
		}, 560);
	}, [on, onChange]);

	return (
		<button
			type="button"
			role="switch"
			aria-checked={on}
			aria-label={ariaLabel || label}
			title={title || label}
			className={`qr-sw${on ? ' is-on' : ''}${className ? ` ${className}` : ''}`}
			onClick={toggle}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					toggle(e);
				}
			}}
		>
			<span className="qr-sw-fill" aria-hidden />
			<LayoutGroup>
				<motion.span
					layout
					layoutDependency={on}
					transition={layoutSpring}
					className="qr-sw-ball"
					aria-hidden
				>
					<span className="qr-sw-spark" />
					{Icon ? (
						<motion.span
							className="qr-sw-ico-wrap"
							animate={on
								? { rotate: -12, scale: 1.1, y: -0.5 }
								: { rotate: 0, scale: 1, y: 0 }}
							transition={layoutSpring}
						>
							<Icon size={12} strokeWidth={2.4} className="qr-sw-ico" />
						</motion.span>
					) : null}
				</motion.span>
				<motion.span
					layout
					layoutDependency={on}
					transition={layoutSpring}
					className="qr-sw-label"
				>
					{label}
				</motion.span>
			</LayoutGroup>
		</button>
	);
}
