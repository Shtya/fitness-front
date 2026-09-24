'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { motion } from 'framer-motion';
import { Flame, Import, MessageSquare, Sparkles, Clock, Highlighter } from 'lucide-react';
import { BookShelf } from '@/components/ai-reading/BookShelf';
import {
	getActiveJourney,
	getContinueBook,
	getStats,
	getTodayPick,
	knowledgeStats,
	listBooks,
	upsertBook,
} from '@/lib/ai-reading/storage';
import { journeyProgress, monthLabel } from '@/lib/ai-reading/schemas';
import { generateFallbackBook } from '@/lib/ai-reading/transform';
import { enqueueReviewItems } from '@/lib/ai-reading/spaced-review';

export default function ReadingHub({ compact = false, onNavigate }) {
	const t = useTranslations('aiReading');
	const locale = useLocale();
	const router = useRouter();
	const [books, setBooks] = useState([]);
	const [stats, setStats] = useState(getStats);
	const [kStats, setKStats] = useState({ highlights: 0, notes: 0, actions: 0 });
	const [continueBook, setContinueBook] = useState(null);
	const [today, setToday] = useState(null);
	const [journey, setJourney] = useState(null);

	useEffect(() => {
		let list = listBooks().filter(b => !b.indexOnly);
		if (!list.length) {
			const sample = enqueueReviewItems(
				generateFallbackBook({
					topic: 'Why motivation is not enough',
					style: 'philosophical',
					depth: 'standard',
					language: locale === 'ar' ? 'ar' : 'en',
					readingTimeMinutes: 8,
				}),
			);
			upsertBook(sample);
			list = [sample];
		}
		setBooks(list);
		setStats(getStats());
		setKStats(knowledgeStats());
		setContinueBook(getContinueBook());
		setToday(getTodayPick());
		setJourney(getActiveJourney());
	}, [locale]);

	const journeyPct = journey ? journeyProgress(journey) : 0;
	const nextItem = journey?.items?.find(i => !i.bookId) || journey?.items?.[0];
	const nextMinutes = nextItem?.readingTimeMinutes || today?.readingTimeMinutes || 8;
	const go = (tab, sub) => (onNavigate ? onNavigate(tab, sub) : null);

	return (
		<div className={compact ? 'space-y-8' : 'space-y-10'}>
			<section
				className="relative overflow-hidden rounded-[1.75rem] px-6 py-9 sm:px-9"
				style={{ background: 'linear-gradient(145deg, var(--ar-heading) 0%, var(--color-primary-700) 55%, var(--ar-accent) 100%)' }}
			>
				<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
					<p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--color-secondary-400, #e8c07a)]">
						{journey ? monthLabel(journey.monthKey, locale) : t('hub.eyebrow')}
					</p>
					<h1 className="mt-3 max-w-xl font-[family-name:var(--font-space-grotesk)] text-3xl font-bold leading-tight text-white sm:text-4xl">
						{journey ? `${t('hub.focus')}: ${journey.theme || journey.title}` : t('brand')}
					</h1>
					{journey && (
						<div className="mt-4 max-w-sm">
							<div className="flex justify-between text-xs text-white/70">
								<span>{t('hub.journeyProgress')}</span>
								<span className="font-bold text-[var(--color-secondary-400, #e8c07a)]">{journeyPct}%</span>
							</div>
							<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
								<div className="h-full rounded-full bg-[var(--color-secondary-400, #e8c07a)]" style={{ width: `${journeyPct}%` }} />
							</div>
						</div>
					)}
					{(nextItem || today) && (
						<div className="mt-6 max-w-lg rounded-2xl bg-white/10 p-4">
							<p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-secondary-400, #e8c07a)]">{t('hub.next')}</p>
							<p className="mt-1 text-lg font-bold text-white">
								{nextItem?.title || today?.title}
								<span className="ms-2 text-sm font-normal text-white/70">— {nextMinutes} min</span>
							</p>
							<div className="mt-3 flex flex-wrap gap-2">
								{nextItem?.bookId || today ? (
									<Link
										href={`/ai-studio/read/${nextItem?.bookId || today.id}`}
										className="rounded-full bg-[var(--color-secondary-400, #e8c07a)] px-4 py-2 text-sm font-bold text-[var(--ar-heading)]"
									>
										{t('hub.startReading')}
									</Link>
								) : (
									<button
										type="button"
										onClick={() => go('studio', 'topics')}
										className="rounded-full bg-[var(--color-secondary-400, #e8c07a)] px-4 py-2 text-sm font-bold text-[var(--ar-heading)]"
									>
										{t('hub.startReading')}
									</button>
								)}
								<button
									type="button"
									onClick={() => go('studio', 'chat')}
									className="rounded-full border border-white/25 px-4 py-2 text-sm font-semibold text-white"
								>
									{t('hub.openWorkspace')}
								</button>
							</div>
						</div>
					)}
				</motion.div>
			</section>

			<section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				{[
					{ icon: Flame, label: t('hub.streak'), value: `${stats.streak || 0}` },
					{ icon: Clock, label: t('hub.minutes'), value: `${stats.totalMinutes || 0}` },
					{ icon: Highlighter, label: t('hub.highlights'), value: `${kStats.highlights || 0}` },
					{ icon: BookOpenStat, label: t('hub.books'), value: `${books.length}` },
				].map(({ icon: Icon, label, value }) => (
					<div key={label} className="rounded-2xl bg-white/65 px-4 py-3 ring-1 ring-[color:var(--ar-ring)]/10">
						<div className="flex items-center gap-2">
							<Icon size={15} className="text-[var(--ar-heading)]" />
							<div>
								<p className="text-xl font-bold text-[var(--ar-heading)]">{value}</p>
								<p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ar-muted)]">{label}</p>
							</div>
						</div>
					</div>
				))}
			</section>

			<section className="grid gap-3 sm:grid-cols-3">
				{continueBook && (
					<Link href={`/ai-studio/read/${continueBook.id}`} className="rounded-2xl bg-white/70 p-5 ring-1 ring-[color:var(--ar-ring)]/10">
						<p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ar-accent)]">{t('hub.continue')}</p>
						<p className="mt-1 font-bold text-[var(--ar-heading)]">{continueBook.title}</p>
					</Link>
				)}
				<button type="button" onClick={() => go('import')} className="rounded-2xl bg-white/70 p-5 text-start ring-1 ring-[color:var(--ar-ring)]/10">
					<p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-secondary-600,#b45309)]">{t('hub.import')}</p>
					<p className="mt-1 text-sm text-[var(--ar-muted)]">{t('import.linkHintShort')}</p>
				</button>
				<button type="button" onClick={() => go('review')} className="rounded-2xl bg-white/70 p-5 text-start ring-1 ring-[color:var(--ar-ring)]/10">
					<p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-primary-500)]">{t('hub.dailyReview')}</p>
					<p className="mt-1 text-sm text-[var(--ar-muted)]">{t('hub.reviewSub')}</p>
				</button>
			</section>

			<section className="flex flex-wrap gap-2">
				{[
					{ tab: 'studio', sub: 'chat', icon: MessageSquare, label: t('hub.openWorkspace') },
					{ tab: 'studio', sub: 'generate', icon: Sparkles, label: t('hub.generate') },
					{ tab: 'import', icon: Import, label: t('hub.import') },
					{ tab: 'library', icon: Flame, label: t('nav.library') },
				].map(item => (
					<button
						key={item.label}
						type="button"
						onClick={() => go(item.tab, item.sub)}
						className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-[var(--ar-heading)] ring-1 ring-[color:var(--ar-ring)]/10"
					>
						<item.icon size={14} /> {item.label}
					</button>
				))}
			</section>

			<section>
				<div className="mb-4 flex items-end justify-between">
					<div>
						<h2 className="font-[family-name:var(--font-space-grotesk)] text-xl font-bold text-[var(--ar-heading)]">{t('hub.shelf')}</h2>
						<p className="text-sm text-[var(--ar-muted)]">{t('hub.shelfSub')}</p>
					</div>
					<button type="button" onClick={() => go('library')} className="text-xs font-bold text-[var(--ar-accent)]">
						{t('hub.seeAll')} →
					</button>
				</div>
				<BookShelf
					books={books.slice(0, 6)}
					emptyLabel={t('hub.empty')}
					onOpen={id => router.push(`/ai-studio/read/${id}`)}
				/>
			</section>
		</div>
	);
}

function BookOpenStat(props) {
	return (
		<svg width={props.size || 15} height={props.size || 15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={props.className}>
			<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
			<path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
		</svg>
	);
}
