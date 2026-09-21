'use client';

import { useEffect, useState } from 'react';
import { Ruler, Sparkles } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { fetchLatestBodyMeasurement } from './body-measurement-api';
import { MEASUREMENT_FIELDS } from './measurement-fields';

function formatDate(value, locale) {
	if (!value) return '—';
	const dt = new Date(value);
	if (Number.isNaN(dt.getTime())) return String(value);
	return dt.toLocaleDateString(locale === 'ar' ? 'ar' : 'en-GB', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

export default function BodyMeasurementsCard({ userId, href }) {
	const t = useTranslations('bodyMeasurement');
	const locale = useLocale();
	const [row, setRow] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!userId) return;
		setLoading(true);
		fetchLatestBodyMeasurement(userId)
			.then(setRow)
			.catch(() => setRow(null))
			.finally(() => setLoading(false));
	}, [userId]);

	return (
		<div className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
			<div className="flex items-start justify-between gap-3 mb-4">
				<div className="flex items-center gap-3">
					<div className="h-11 w-11 grid place-items-center rounded-lg text-white bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-primary-700)]">
						<Ruler className="h-5 w-5" />
					</div>
					<div>
						<h3 className="text-sm sm:text-base font-black text-slate-900">{t('card.title')}</h3>
						<p className="text-xs text-slate-400">{t('card.subtitle')}</p>
					</div>
				</div>
				<Button asChild size="sm">
					<Link href={href}>
						<Sparkles className="h-4 w-4" />
						{row ? t('card.update') : t('card.start')}
					</Link>
				</Button>
			</div>

			{loading ? (
				<div className="h-24 animate-pulse rounded-lg bg-slate-100" />
			) : !row ? (
				<p className="text-sm text-slate-500">{t('card.empty')}</p>
			) : (
				<div className="space-y-3">
					<div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
						<span className="inline-flex items-center rounded-full border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] px-2.5 py-1 font-semibold text-[var(--color-primary-700)]">
							{row.source === 'ai' ? t('card.sourceAi') : t('card.sourceManual')}
						</span>
						<span>{t('card.updated', { date: formatDate(row.updatedAt || row.date, locale) })}</span>
					</div>
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
						{MEASUREMENT_FIELDS.map(({ key }) => (
							<div key={key} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
								<p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{t(`fields.${key}`)}</p>
								<p className="text-sm font-black text-slate-900 mt-0.5">
									{row[key] == null ? t('results.couldNotEstimate') : `${row[key]} ${t('units.cm')}`}
								</p>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
