'use client';

import { useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { XCircle } from 'lucide-react';

export default function GmToggleGroup({ label, options = [], value, onChange, error, className = '' }) {
	const handleKey = useCallback(e => {
		if (!options.length) return;
		const idx = Math.max(0, options.findIndex(o => o.id === value));
		if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
			e.preventDefault();
			onChange?.(options[(idx + 1) % options.length].id);
		}
		if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
			e.preventDefault();
			onChange?.(options[(idx - 1 + options.length) % options.length].id);
		}
	}, [options, value, onChange]);

	return (
		<div className={className}>
			<div
				className={`relative flex h-11 items-center rounded-[11px] border bg-[color-mix(in_srgb,var(--gm-paper,#fff)_62%,transparent)] px-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] ${
					error ? 'border-rose-300' : 'border-(--gm-line,rgba(92,143,211,0.22))'
				}`}
			>
				{label ? (
					<span className='pointer-events-none absolute start-3 top-0 z-1 -translate-y-1/2 rounded-md bg-(--gm-paper,#fff) px-1 text-[11px] font-medium text-(--gm-muted,#56719a)'>
						{label}
					</span>
				) : null}
				<div role='radiogroup' aria-label={typeof label === 'string' ? label : undefined} onKeyDown={handleKey} className='gm-seg gm-seg--plain w-full'>
					{options.map(opt => {
						const active = value === opt.id;
						return (
							<button
								key={opt.id ?? 'none'}
								type='button'
								role='radio'
								aria-checked={active}
								onClick={() => onChange?.(opt.id)}
								className={`gm-seg-item ${active ? 'is-on' : ''}`}
							>
								{opt.label}
							</button>
						);
					})}
				</div>
			</div>
			<AnimatePresence>
				{error && (
					<motion.p key='error' className='text-xs text-rose-500 mt-1.5 flex items-center gap-1' initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
						<XCircle className='w-3 h-3' /> {error}
					</motion.p>
				)}
			</AnimatePresence>
		</div>
	);
}
