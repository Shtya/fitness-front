'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { motion } from 'framer-motion';
import { Loader2, Plus, Sparkles } from 'lucide-react';
import { aiReadingApi } from '@/lib/ai-reading/client-api';
import { currentMonthKey, journeyProgress, monthLabel } from '@/lib/ai-reading/schemas';
import { getActiveJourney, listJourneys, upsertBook, upsertJourney } from '@/lib/ai-reading/storage';
import { enqueueReviewItems } from '@/lib/ai-reading/spaced-review';

export function JourneysList() {
	const t = useTranslations('aiReading');
	const locale = useLocale();
	const [journeys, setJourneys] = useState([]);
	const [theme, setTheme] = useState('');
	const [busy, setBusy] = useState(false);

	const refresh = () => setJourneys(listJourneys());

	useEffect(() => {
		refresh();
	}, []);

	const create = async () => {
		if (!theme.trim()) return;
		setBusy(true);
		try {
			const { journey } = await aiReadingApi.roadmap({
				theme: theme.trim(),
				language: locale === 'ar' ? 'ar' : 'en',
				monthKey: currentMonthKey(),
			});
			upsertJourney(journey);
			setTheme('');
			refresh();
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-[family-name:var(--font-space-grotesk)] text-3xl font-bold text-[var(--ar-heading)]">{t('journeys.title')}</h1>
				<p className="mt-2 text-sm text-[var(--ar-muted)]">{t('journeys.subtitle')}</p>
			</div>

			<div className="flex flex-col gap-2 rounded-3xl bg-white/70 p-4 ring-1 ring-[color:var(--ar-ring)]/10 sm:flex-row">
				<input
					value={theme}
					onChange={e => setTheme(e.target.value)}
					placeholder={t('journeys.themePlaceholder')}
					className="flex-1 rounded-2xl border border-[color:var(--ar-border)]/15 bg-white px-4 py-3 text-sm outline-none"
				/>
				<button
					type="button"
					disabled={busy || !theme.trim()}
					onClick={create}
					className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--ar-accent)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
				>
					{busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
					{t('journeys.create')}
				</button>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				{journeys.map(j => {
					const pct = journeyProgress(j);
					return (
						<Link
							key={j.id}
							href={`/ai-studio/journeys/${j.id}`}
							className="rounded-3xl bg-white/70 p-5 ring-1 ring-[color:var(--ar-ring)]/10 transition hover:shadow-md"
						>
							<p className="text-[10px] font-bold uppercase tracking-widest text-[#b45309]">{monthLabel(j.monthKey, locale)}</p>
							<h2 className="mt-2 font-[family-name:var(--font-space-grotesk)] text-xl font-bold text-[var(--ar-heading)]">{j.title}</h2>
							<p className="mt-1 text-sm text-[var(--ar-muted)]">{j.theme}</p>
							<div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--ar-accent)]/10">
								<div className="h-full rounded-full bg-[var(--ar-accent)]" style={{ width: `${pct}%` }} />
							</div>
							<p className="mt-2 text-xs font-semibold text-[var(--ar-muted)]">
								{pct}% · {(j.items || []).length} {t('journeys.sessions')}
							</p>
						</Link>
					);
				})}
			</div>
		</div>
	);
}

export function JourneyDetail({ journeyId }) {
	const t = useTranslations('aiReading');
	const locale = useLocale();
	const router = useRouter();
	const [journey, setJourney] = useState(null);
	const [busyId, setBusyId] = useState(null);

	useEffect(() => {
		const j = listJourneys().find(x => x.id === journeyId) || getActiveJourney();
		setJourney(j);
	}, [journeyId]);

	if (!journey) {
		return <p className="text-sm text-[var(--ar-muted)]">{t('journeys.notFound')}</p>;
	}

	const pct = journeyProgress(journey);

	const generateItem = async item => {
		setBusyId(item.id);
		try {
			const { book } = await aiReadingApi.generate({
				topic: `${journey.theme}: ${item.title}`,
				style: 'narrative',
				depth: 'standard',
				language: journey.language || (locale === 'ar' ? 'ar' : 'en'),
				readingTimeMinutes: item.readingTimeMinutes || 8,
			});
			book.journeyId = journey.id;
			book.subtitle = item.subtitle || journey.title;
			const saved = upsertBook(enqueueReviewItems(book));
			const items = journey.items.map(it =>
				it.id === item.id ? { ...it, bookId: saved.id, status: 'done' } : it,
			);
			const next = upsertJourney({ ...journey, items });
			setJourney(next);
			router.push(`/ai-studio/read/${saved.id}`);
		} finally {
			setBusyId(null);
		}
	};

	return (
		<div className="mx-auto max-w-2xl space-y-6">
			<div>
				<p className="text-[11px] font-bold uppercase tracking-widest text-[#b45309]">{monthLabel(journey.monthKey, locale)}</p>
				<h1 className="mt-2 font-[family-name:var(--font-space-grotesk)] text-3xl font-bold text-[var(--ar-heading)]">{journey.title}</h1>
				<p className="mt-2 text-sm text-[var(--ar-muted)]">{journey.description || journey.theme}</p>
				<div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--ar-accent)]/10">
					<div className="h-full rounded-full bg-[var(--ar-accent)] transition-all" style={{ width: `${pct}%` }} />
				</div>
				<p className="mt-2 text-xs font-semibold text-[var(--ar-muted)]">{pct}% {t('journeys.complete')}</p>
			</div>

			<ol className="space-y-3">
				{(journey.items || []).map((item, i) => (
					<motion.li
						key={item.id}
						initial={{ opacity: 0, y: 6 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: i * 0.04 }}
						className="flex items-center gap-4 rounded-2xl bg-white/70 p-4 ring-1 ring-[color:var(--ar-ring)]/10"
					>
						<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ar-accent)] text-sm font-bold text-[var(--color-secondary-400, #e8c07a)]">
							{String(item.order || i + 1).padStart(2, '0')}
						</span>
						<div className="min-w-0 flex-1">
							<p className="font-semibold text-[var(--ar-heading)]">{item.title}</p>
							<p className="text-xs text-[var(--ar-muted)]">
								{item.subtitle || `${item.readingTimeMinutes || 8} min`}
								{item.status === 'done' ? ` · ${t('journeys.done')}` : ''}
							</p>
						</div>
						{item.bookId ? (
							<Link
								href={`/ai-studio/read/${item.bookId}`}
								className="rounded-full bg-[var(--ar-accent)] px-3 py-1.5 text-xs font-bold text-white"
							>
								{t('journeys.read')}
							</Link>
						) : (
							<button
								type="button"
								disabled={busyId === item.id}
								onClick={() => generateItem(item)}
								className="inline-flex items-center gap-1 rounded-full bg-[var(--ar-accent)] px-3 py-1.5 text-xs font-bold text-white"
							>
								{busyId === item.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
								{t('journeys.start')}
							</button>
						)}
					</motion.li>
				))}
			</ol>
		</div>
	);
}
