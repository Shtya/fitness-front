'use client';

import { MEASUREMENT_FIELDS } from './measurement-fields';

function displayValue(value, t) {
	if (value === '' || value == null) return t('results.couldNotEstimate');
	return `${value}`;
}

const FEATURED = ['chest', 'waist', 'hips'];

export default function MeasurementResults({ values, t }) {
	const featured = MEASUREMENT_FIELDS.filter((f) => FEATURED.includes(f.key));
	const rest = MEASUREMENT_FIELDS.filter((f) => !FEATURED.includes(f.key));

	return (
		<div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
			<div className="border-b border-slate-100 px-5 py-4 sm:px-7">
				<h2 className="text-lg font-black text-slate-900">{t('results.title')}</h2>
				<p className="mt-1 text-xs leading-relaxed text-slate-500">{t('results.disclaimer')}</p>
			</div>
			<div className="space-y-4 p-5 sm:p-7">
				<div className="grid grid-cols-3 gap-2">
					{featured.map(({ key }) => {
						const missing = values[key] === '' || values[key] == null;
						return (
							<div
								key={key}
								className="rounded-2xl bg-gradient-to-br from-[var(--color-primary-50)] to-white px-3 py-4 text-center ring-1 ring-[var(--color-primary-100)]"
							>
								<p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-primary-600)]">{t(`fields.${key}`)}</p>
								<p className={`mt-1 text-xl font-black tabular-nums sm:text-2xl ${missing ? 'text-slate-300' : 'text-slate-900'}`}>
									{displayValue(values[key], t)}
								</p>
								<p className="text-[10px] font-semibold text-slate-400">{missing ? '—' : t('units.cm')}</p>
							</div>
						);
					})}
				</div>
				<dl className="grid grid-cols-2 gap-2">
					{rest.map(({ key }) => {
						const missing = values[key] === '' || values[key] == null;
						return (
							<div key={key} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
								<dt className="text-xs font-semibold text-slate-500">{t(`fields.${key}`)}</dt>
								<dd className={`text-sm font-black tabular-nums ${missing ? 'text-slate-400' : 'text-slate-900'}`}>
									{missing ? t('results.couldNotEstimate') : `${values[key]} ${t('units.cm')}`}
								</dd>
							</div>
						);
					})}
				</dl>
			</div>
		</div>
	);
}
