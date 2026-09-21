'use client';

import { motion, useReducedMotion } from 'framer-motion';
import ScanSilhouette from './ScanSilhouette';

export default function ProcessingState({ t }) {
	const reduce = useReducedMotion();
	const beats = [t('processing.beat1'), t('processing.beat2'), t('processing.beat3')];

	return (
		<div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-[var(--color-primary-800)] via-[var(--color-primary-700)] to-[var(--color-secondary-600)] px-6 py-10 text-center text-white shadow-[0_12px_40px_rgba(15,23,42,0.16)]">
			<ScanSilhouette scanning className="max-w-[160px]" />
			<h2 className="mt-6 text-xl font-black">{t('processing.title')}</h2>
			<p className="mx-auto mt-2 max-w-sm text-sm text-white/75">{t('processing.subtitle')}</p>
			<ul className="mx-auto mt-6 max-w-xs space-y-2 text-start">
				{beats.map((label, i) => (
					<motion.li
						key={label}
						className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold"
						animate={reduce ? undefined : { opacity: [0.45, 1, 0.45] }}
						transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.35 }}
					>
						<span className="h-1.5 w-1.5 rounded-full bg-white" />
						{label}
					</motion.li>
				))}
			</ul>
		</div>
	);
}
