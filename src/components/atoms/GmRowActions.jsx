'use client';

import { Fragment, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const TONES = {
	primary: 'var(--color-primary-600)',
	cyan: '#0891b2',
	violet: '#7c3aed',
	amber: 'var(--gm-warn)',
	danger: 'var(--gm-danger)',
	slate: 'var(--gm-ink-soft)',
};

const TIP_BG = 'color-mix(in srgb, var(--color-primary-950, #0b1a33) 92%, #000)';

const SIZES = {
	md: { wrap: 'rounded-[12px] p-[3px]', btn: 'size-8 rounded-[9px]', icon: 'size-[17px]', stroke: 1.9, divider: 'h-5' },
	sm: { wrap: 'rounded-[10px] p-0.5', btn: 'size-7 rounded-[8px]', icon: 'size-[14px]', stroke: 2, divider: 'h-4' },
};

export default function GmRowActions({ options = [], size = 'md' }) {
	const s = SIZES[size] || SIZES.md;
	const [tip, setTip] = useState(null);
	const visible = options.filter(o => !o?.hide);

	useEffect(() => {
		if (!tip) return;
		const hide = () => setTip(null);
		window.addEventListener('scroll', hide, true);
		window.addEventListener('resize', hide);
		return () => {
			window.removeEventListener('scroll', hide, true);
			window.removeEventListener('resize', hide);
		};
	}, [tip]);

	if (!visible.length) return null;

	const showTip = (e, label) => {
		const r = e.currentTarget.getBoundingClientRect();
		setTip({ label, x: r.left + r.width / 2, y: r.top - 8 });
	};
	const hideTip = () => setTip(null);

	return (
		<div
			role='toolbar'
			className={`inline-flex shrink-0 items-center gap-0.5 border border-(--gm-line) ${s.wrap} shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_color-mix(in_srgb,var(--color-primary-900)_6%,transparent)]`}
			style={{ background: 'color-mix(in srgb, var(--gm-paper) 82%, transparent)' }}
		>
			{visible.map((opt, i) => {
				const Icon = opt.icon;
				const isDanger = opt.tone === 'danger';
				return (
					<Fragment key={opt.label}>
						{isDanger && i > 0 ? <span aria-hidden className={`mx-0.5 w-px bg-(--gm-line) ${s.divider}`} /> : null}
						<button
							type='button'
							aria-label={opt.label}
							disabled={opt.disabled || opt.loading}
							onClick={(e) => { hideTip(); opt.onClick?.(e); }}
							onMouseEnter={(e) => showTip(e, opt.label)}
							onMouseLeave={hideTip}
							onFocus={(e) => showTip(e, opt.label)}
							onBlur={hideTip}
							style={{ '--tone': TONES[opt.tone] || TONES.slate }}
							className={`group/act grid ${s.btn} place-items-center transition-all duration-150 hover:bg-[color-mix(in_srgb,var(--tone)_12%,transparent)] hover:text-(--tone) focus-visible:bg-[color-mix(in_srgb,var(--tone)_12%,transparent)] focus-visible:text-(--tone) focus-visible:outline-none active:scale-90 disabled:cursor-not-allowed disabled:opacity-35 ${isDanger ? 'text-[color-mix(in_srgb,var(--gm-danger)_70%,var(--gm-ink-soft))]' : 'gm-ink-soft'}`}
						>
							<Icon className={`${s.icon} transition-transform duration-150 ${opt.loading ? 'animate-spin' : 'group-hover/act:scale-110'}`} strokeWidth={s.stroke} />
						</button>
					</Fragment>
				);
			})}

			{tip && typeof document !== 'undefined' && createPortal(
				<span
					role='tooltip'
					className='gm-tip pointer-events-none fixed whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold text-white shadow-lg'
					style={{ left: tip.x, top: tip.y, zIndex: 1200000, background: TIP_BG }}
				>
					{tip.label}
					<span
						aria-hidden
						className='absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent'
						style={{ borderTopColor: TIP_BG }}
					/>
				</span>,
				document.body,
			)}
		</div>
	);
}
