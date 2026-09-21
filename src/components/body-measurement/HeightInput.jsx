'use client';

import { Minus, Plus, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HeightInput({ value, onChange, onContinue, t }) {
	const n = Number(value);
	const valid = Number.isFinite(n) && n >= 100 && n <= 230;
	const display = valid ? String(Math.round(n)) : value || '—';

	const nudge = (delta) => {
		const base = valid ? n : 170;
		const next = Math.min(230, Math.max(100, Math.round(base + delta)));
		onChange(String(next));
	};

	return (
		<div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white pt-10 shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
			<div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-7">
				<div className="grid h-11 w-11 place-items-center rounded-xl text-white bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-primary-700)]">
					<Ruler className="h-5 w-5" />
				</div>
				<div>
					<h2 className="text-lg font-black text-slate-900">{t('height.title')}</h2>
					<p className="text-xs text-slate-500">{t('height.subtitle')}</p>
				</div>
			</div>

			<div className="space-y-6 px-5 py-7 sm:px-7">
				<div className="rounded-3xl bg-slate-50 px-4 py-8 text-center">
					<p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{t('height.label')}</p>
					<div className="mt-3 flex items-center justify-center gap-4">
						<button
							type="button"
							onClick={() => nudge(-1)}
							className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-[var(--color-primary-300)] hover:text-[var(--color-primary-700)]"
							aria-label="-1"
						>
							<Minus className="h-5 w-5" />
						</button>
						<div>
							<p className="text-6xl font-black tabular-nums tracking-tight text-slate-900">{display}</p>
							<p className="mt-1 text-sm font-bold text-slate-400">{t('units.cm')}</p>
						</div>
						<button
							type="button"
							onClick={() => nudge(1)}
							className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-[var(--color-primary-300)] hover:text-[var(--color-primary-700)]"
							aria-label="+1"
						>
							<Plus className="h-5 w-5" />
						</button>
					</div>
					<input
						type="number"
						min={100}
						max={230}
						inputMode="numeric"
						aria-label={t('height.label')}
						placeholder={t('height.placeholder')}
						value={value}
						onChange={(e) => onChange(e.target.value)}
						className="mt-5 h-11 w-full max-w-[220px] rounded-xl border border-slate-200 bg-white px-3 text-center text-sm font-semibold text-slate-800 outline-none focus:border-[var(--color-primary-400)] focus:ring-4 focus:ring-[var(--color-primary-100)]"
					/>
					{value && !valid && (
						<p className="mt-2 text-xs font-semibold text-red-500">{t('height.invalid')}</p>
					)}
				</div>

				<Button type="button" className="h-12 w-full rounded-xl text-base font-bold" disabled={!valid} onClick={onContinue}>
					{t('actions.continue')}
				</Button>
			</div>
		</div>
	);
}
