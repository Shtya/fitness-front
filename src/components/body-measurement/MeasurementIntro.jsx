'use client';

import { Camera, Check, Clock, Ruler, ScanLine, ShieldAlert, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import ScanSilhouette from './ScanSilhouette';

const STEPS = [
	{ icon: Ruler, n: '01', titleKey: 'intro.step1Title', textKey: 'intro.step1Text' },
	{ icon: Camera, n: '02', titleKey: 'intro.step2Title', textKey: 'intro.step2Text' },
	{ icon: ScanLine, n: '03', titleKey: 'intro.step3Title', textKey: 'intro.step3Text' },
];

export default function MeasurementIntro({ existing, onStart, t, formatDate }) {
	return (
		<div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
			<div className="relative overflow-hidden bg-gradient-to-br from-[var(--color-primary-800)] via-[var(--color-primary-700)] to-[var(--color-secondary-600)] px-5 py-7 text-white sm:px-8 sm:py-9">
				<div className="pointer-events-none absolute -top-16 -end-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
				<div className="pointer-events-none absolute -bottom-20 -start-8 h-40 w-40 rounded-full bg-[var(--color-secondary-400)]/30 blur-3xl" />
				<div className="relative grid items-center gap-6 md:grid-cols-[1fr_auto]">
					<div className="space-y-4 text-start">
						<p className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-[11px] font-bold tracking-wide">
							<Sparkles className="h-3.5 w-3.5" />
							{t('flow.estimatesOnly')}
						</p>
						<div>
							<h2 className="text-2xl font-black leading-tight tracking-tight sm:text-3xl">{t('intro.title')}</h2>
							<p className="mt-2 max-w-md text-sm leading-relaxed text-white/80">{t('intro.subtitle')}</p>
						</div>
						<div className="flex flex-wrap gap-2">
							<span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-xs font-semibold">
								<Clock className="h-3.5 w-3.5" />
								{t('flow.minutes')}
							</span>
							<span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-xs font-semibold">
								<Camera className="h-3.5 w-3.5" />
								{t('flow.photosCount')}
							</span>
						</div>
					</div>
					<div className="hidden justify-self-center md:block">
						<div className="rounded-[2rem] border border-white/20 bg-white/8 p-4 backdrop-blur-sm">
							<ScanSilhouette scanning className="max-w-[150px]" />
						</div>
					</div>
				</div>
			</div>

			<div className="space-y-5 p-5 sm:p-7">
				<div className="grid gap-3 sm:grid-cols-3">
					{STEPS.map((item, i) => {
						const Icon = item.icon;
						return (
							<motion.div
								key={item.n}
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.05 * i }}
								className="relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
							>
								<div className="mb-3 flex items-center justify-between">
									<span className="text-[11px] font-black tracking-widest text-[var(--color-primary-500)]">{item.n}</span>
									<span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[var(--color-primary-600)] shadow-sm ring-1 ring-slate-200">
										<Icon className="h-4 w-4" />
									</span>
								</div>
								<p className="text-sm font-black text-slate-900">{t(item.titleKey)}</p>
								<p className="mt-1 text-xs leading-relaxed text-slate-500">{t(item.textKey)}</p>
							</motion.div>
						);
					})}
				</div>

				{existing && (
					<div className="flex items-start gap-3 rounded-2xl border border-[var(--color-primary-100)] bg-[var(--color-primary-50)] px-4 py-3">
						<div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[var(--color-primary-600)]">
							<ShieldAlert className="h-4 w-4" />
						</div>
						<div className="min-w-0">
							<p className="text-sm font-bold text-slate-800">{t('existing.title')}</p>
							<p className="mt-0.5 text-xs text-slate-500">
								{t('existing.hint', { date: formatDate(existing.updatedAt || existing.date) })}
							</p>
						</div>
					</div>
				)}

				<p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">
					<Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-primary-500)]" />
					{t('intro.estimateDisclaimer')}
				</p>

				<Button type="button" className="h-12 w-full rounded-xl text-base font-bold" onClick={onStart}>
					{t('actions.start')}
				</Button>
			</div>
		</div>
	);
}
