'use client';

import { cn } from '@/lib/utils';

export const SCAN_PHASES = [
	{ id: 'start', stepKey: 'flow.start' },
	{ id: 'height', stepKey: 'flow.height' },
	{ id: 'photos', stepKey: 'flow.photos' },
	{ id: 'review', stepKey: 'flow.review' },
];

export function scanPhaseIndex(step) {
	if (step === 'intro') return 0;
	if (step === 'height') return 1;
	if (step === 'front' || step === 'side' || step === 'processing') return 2;
	return 3;
}

export default function ScanProgress({ step, t }) {
	const active = scanPhaseIndex(step);
	return (
		<ol className="grid grid-cols-4 gap-1 sm:gap-2" aria-label={t('flow.progress')}>
			{SCAN_PHASES.map((phase, i) => {
				const done = i < active;
				const current = i === active;
				return (
					<li key={phase.id} className="min-w-0">
						<div className="flex items-center gap-1.5">
							<span
								className={cn(
									'grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-black',
									done && 'bg-[var(--color-primary-600)] text-white',
									current && 'bg-[var(--color-primary-600)] text-white ring-4 ring-[var(--color-primary-100)]',
									!done && !current && 'bg-slate-100 text-slate-400',
								)}
							>
								{i + 1}
							</span>
							<span
								className={cn(
									'hidden truncate text-[11px] font-bold sm:block',
									current || done ? 'text-slate-800' : 'text-slate-400',
								)}
							>
								{t(phase.stepKey)}
							</span>
						</div>
						<div
							className={cn(
								'mt-2 h-1 rounded-full',
								i <= active ? 'bg-[var(--color-primary-500)]' : 'bg-slate-100',
							)}
						/>
					</li>
				);
			})}
		</ol>
	);
}
