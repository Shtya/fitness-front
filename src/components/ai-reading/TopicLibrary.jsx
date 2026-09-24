'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, Loader2, Plus, Sparkles, Star, Trash2, X } from 'lucide-react';
import { createTopic, uid } from '@/lib/ai-reading/schemas';
import { deleteTopic, listTopics, upsertTopic } from '@/lib/ai-reading/storage';
import { aiReadingApi } from '@/lib/ai-reading/client-api';
import { interpolate } from '@/lib/ai-reading/prompts';
import { listPrompts } from '@/lib/ai-reading/storage';

function todayISO() {
	return new Date().toISOString().slice(0, 10);
}

function formatTopicDate(dateStr, locale) {
	if (!dateStr) return null;
	try {
		return new Date(`${dateStr}T12:00:00`).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		});
	} catch {
		return dateStr;
	}
}

export default function TopicLibrary() {
	const t = useTranslations('aiReading');
	const locale = useLocale();
	const router = useRouter();
	const [topics, setTopics] = useState([]);
	const [adding, setAdding] = useState(false);
	const [draftTitle, setDraftTitle] = useState('');
	const [draftDate, setDraftDate] = useState(todayISO);
	const [suggestBusy, setSuggestBusy] = useState(false);
	const [genBusy, setGenBusy] = useState(null);

	const refresh = () => setTopics(listTopics());

	useEffect(() => {
		refresh();
		const onChange = e => {
			if (e?.detail?.key?.includes?.('topics')) refresh();
		};
		window.addEventListener('ai-reading:changed', onChange);
		return () => window.removeEventListener('ai-reading:changed', onChange);
	}, []);

	const sorted = useMemo(() => {
		return [...topics].sort((a, b) => {
			const da = a.date || a.createdAt || '';
			const db = b.date || b.createdAt || '';
			return String(db).localeCompare(String(da));
		});
	}, [topics]);

	const saveTopic = () => {
		if (!draftTitle.trim()) return;
		const date = draftDate || todayISO();
		upsertTopic(
			createTopic({
				id: uid('topic'),
				title: draftTitle.trim(),
				date,
				monthKey: date.slice(0, 7),
				folder: 'inbox',
			}),
		);
		setDraftTitle('');
		setDraftDate(todayISO());
		setAdding(false);
		refresh();
	};

	const suggest = async () => {
		setSuggestBusy(true);
		try {
			const { topics: suggested } = await aiReadingApi.suggestTopics({ seed: '' });
			(suggested || []).forEach(tp =>
				upsertTopic({
					...tp,
					id: tp.id || uid('topic'),
					date: tp.date || todayISO(),
				}),
			);
			refresh();
		} finally {
			setSuggestBusy(false);
		}
	};

	const generateFromTopic = async topic => {
		setGenBusy(topic.id);
		try {
			const deep = listPrompts().find(p => /deep article/i.test(p.title));
			const promptTemplate = deep
				? interpolate(deep.body, {
						topic: topic.title,
						style: 'narrative',
						depth: 'standard',
						language: locale === 'ar' ? 'ar' : 'en',
						readingTime: '10',
					})
				: undefined;
			const { book } = await aiReadingApi.generate({
				topic: topic.title,
				style: 'narrative',
				depth: 'standard',
				language: locale === 'ar' ? 'ar' : 'en',
				readingTimeMinutes: 10,
				promptTemplate,
			});
			const { upsertBook } = await import('@/lib/ai-reading/storage');
			const { enqueueReviewItems } = await import('@/lib/ai-reading/spaced-review');
			const saved = upsertBook(enqueueReviewItems(book));
			upsertTopic({ ...topic, bookId: saved.id, status: 'reading' });
			router.push(`/ai-studio/read/${saved.id}`);
		} finally {
			setGenBusy(null);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold tracking-tight text-[var(--ar-heading)]">
						{t('topics.title')}
					</h1>
					<p className="mt-1.5 text-sm text-[var(--ar-muted)]">{t('topics.subtitle')}</p>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={suggest}
						disabled={suggestBusy}
						className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3.5 py-2 text-xs font-semibold text-[var(--ar-heading)] ring-1 ring-[color:var(--ar-ring)]/12"
					>
						{suggestBusy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
						{t('topics.suggest')}
					</button>
					<button
						type="button"
						onClick={() => setAdding(true)}
						className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ar-accent)] text-white shadow-sm"
						title={t('topics.add')}
						aria-label={t('topics.add')}
					>
						<Plus size={16} />
					</button>
				</div>
			</div>

			<AnimatePresence>
				{adding && (
					<motion.div
						initial={{ opacity: 0, y: -6 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -4 }}
						className="rounded-2xl border border-[color:var(--ar-border)]/12 bg-white/80 p-4 shadow-sm"
					>
						<div className="mb-3 flex items-center justify-between">
							<p className="text-sm font-bold text-[var(--ar-heading)]">{t('topics.add')}</p>
							<button type="button" onClick={() => setAdding(false)} className="rounded-lg p-1 text-[var(--ar-muted)]">
								<X size={14} />
							</button>
						</div>
						<div className="flex flex-col gap-3 sm:flex-row sm:items-end">
							<label className="min-w-0 flex-1 space-y-1.5">
								<span className="text-[11px] font-semibold text-[var(--ar-muted)]">{t('topics.titleField')}</span>
								<input
									value={draftTitle}
									onChange={e => setDraftTitle(e.target.value)}
									onKeyDown={e => e.key === 'Enter' && saveTopic()}
									placeholder={t('topics.addPlaceholder')}
									className="w-full rounded-xl border border-[color:var(--ar-border)]/15 bg-[var(--ar-bg)]/60 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--ar-accent)]/20"
									autoFocus
								/>
							</label>
							<label className="space-y-1.5 sm:w-44">
								<span className="text-[11px] font-semibold text-[var(--ar-muted)]">{t('topics.date')}</span>
								<input
									type="date"
									value={draftDate}
									onChange={e => setDraftDate(e.target.value)}
									className="w-full rounded-xl border border-[color:var(--ar-border)]/15 bg-[var(--ar-bg)]/60 px-3 py-2.5 text-sm outline-none"
								/>
							</label>
							<button
								type="button"
								onClick={saveTopic}
								disabled={!draftTitle.trim()}
								className="rounded-xl bg-[var(--ar-accent)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
							>
								{t('common.save')}
							</button>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			<div className="space-y-2.5">
				{sorted.map(topic => (
					<motion.article
						key={topic.id}
						layout
						className="flex flex-col gap-3 rounded-2xl border border-[color:var(--ar-border)]/10 bg-white/75 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
					>
						<div className="min-w-0 flex-1">
							<h3 className="font-semibold leading-snug text-[var(--ar-heading)]">{topic.title}</h3>
							{(topic.date || topic.createdAt) && (
								<p className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--ar-muted)]">
									<CalendarDays size={12} />
									{formatTopicDate(topic.date || topic.createdAt?.slice(0, 10), locale)}
								</p>
							)}
						</div>
						<div className="flex shrink-0 items-center gap-1.5">
							<button
								type="button"
								onClick={() => {
									upsertTopic({ ...topic, favorite: !topic.favorite });
									refresh();
								}}
								className="rounded-lg p-1.5 hover:bg-black/5"
							>
								<Star size={14} className={topic.favorite ? 'fill-amber-400 text-amber-400' : 'text-slate-400'} />
							</button>
							<button
								type="button"
								disabled={genBusy === topic.id}
								onClick={() => generateFromTopic(topic)}
								className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ar-accent)]/[0.07] px-3 py-1.5 text-xs font-bold text-[var(--ar-heading)]"
							>
								{genBusy === topic.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
								{t('topics.generateReading')}
							</button>
							<button
								type="button"
								onClick={() => {
									deleteTopic(topic.id);
									refresh();
								}}
								className="rounded-lg p-1.5 hover:bg-rose-50"
							>
								<Trash2 size={14} className="text-rose-400" />
							</button>
						</div>
					</motion.article>
				))}
			</div>

			{!sorted.length && !adding && (
				<div className="rounded-3xl border border-dashed border-[color:var(--ar-border)]/20 px-6 py-14 text-center text-sm text-[var(--ar-muted)]">
					<p>{t('topics.empty')}</p>
					<button
						type="button"
						onClick={() => setAdding(true)}
						className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--ar-accent)] px-4 py-2 text-sm font-semibold text-white"
					>
						<Plus size={14} /> {t('topics.add')}
					</button>
				</div>
			)}
		</div>
	);
}
