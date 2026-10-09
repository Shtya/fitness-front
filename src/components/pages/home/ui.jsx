'use client';

import { motion, useReducedMotion } from 'framer-motion';

/**
 * Section heading block. Headings arrive once as the section scrolls in; the rest
 * of the page only moves in response to what the visitor does.
 */
export function SectionHead({ id, eyebrow, title, lead, aside, className = '' }) {
	const reduced = useReducedMotion();
	return (
		<motion.div
			className={`hm-head grid gap-6 lg:grid-cols-12 lg:items-end ${className}`}
			initial={reduced ? false : { opacity: 0, y: 22 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: '0px 0px -12% 0px' }}
			transition={{ duration: 0.65, ease: [0.2, 0.8, 0.2, 1] }}
		>
			<div className={aside ? 'lg:col-span-7' : 'lg:col-span-9'}>
				{eyebrow ? <p className="hm-eyebrow">{eyebrow}</p> : null}
				<h2 id={id} className="hm-h2">
					{title}
				</h2>
				{lead ? <p className="hm-lead mt-6">{lead}</p> : null}
			</div>
			{aside ? <div className="lg:col-span-5 lg:justify-self-end">{aside}</div> : null}
		</motion.div>
	);
}

/** Segmented tab list with a sliding pill (shared layoutId per group). */
export function Tabs({ items, value, onChange, label, group, className = '' }) {
	const reduced = useReducedMotion();
	return (
		<div role="tablist" aria-label={label} className={`hm-tabs ${className}`}>
			{items.map(item => {
				const on = item.id === value;
				const Icon = item.icon;
				return (
					<button
						key={item.id}
						type="button"
						role="tab"
						id={`${group}-tab-${item.id}`}
						aria-selected={on}
						aria-controls={`${group}-panel`}
						tabIndex={on ? 0 : -1}
						onClick={() => onChange(item.id)}
						onKeyDown={event => {
							const index = items.findIndex(entry => entry.id === value);
							const rtl = document.documentElement.dir === 'rtl';
							const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
							const back = rtl ? 'ArrowRight' : 'ArrowLeft';
							let next = null;
							if (event.key === forward) next = items[(index + 1) % items.length];
							if (event.key === back) next = items[(index - 1 + items.length) % items.length];
							if (event.key === 'Home') next = items[0];
							if (event.key === 'End') next = items[items.length - 1];
							if (!next) return;
							event.preventDefault();
							onChange(next.id);
							document.getElementById(`${group}-tab-${next.id}`)?.focus();
						}}
						className="hm-tab"
					>
						{on ? (
							<motion.span
								layoutId={`${group}-pill`}
								className="hm-tab__pill"
								transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 36 }}
							/>
						) : null}
						{Icon ? <Icon size={16} strokeWidth={2} aria-hidden="true" /> : null}
						<span>{item.label}</span>
					</button>
				);
			})}
		</div>
	);
}
