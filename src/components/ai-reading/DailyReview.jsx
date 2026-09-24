'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Check, Flame, RotateCcw } from 'lucide-react';
import { answerReview, collectAllDue, enqueueReviewItems } from '@/lib/ai-reading/spaced-review';
import { getStats, listBooks, saveStats, upsertBook } from '@/lib/ai-reading/storage';

export default function DailyReview() {
	const t = useTranslations('aiReading');
	const [queue, setQueue] = useState([]);
	const [current, setCurrent] = useState(null);
	const [stats, setStats] = useState(getStats);
	const [flipped, setFlipped] = useState(false);

	const rebuild = () => {
		const books = listBooks().map(b => enqueueReviewItems({ ...b }));
		books.forEach(b => upsertBook(b));
		const due = collectAllDue(books);
		setQueue(due);
		setCurrent(due[0] || null);
		setFlipped(false);
		setStats(getStats());
	};

	useEffect(() => {
		rebuild();
	}, []);

	const grade = quality => {
		if (!current) return;
		const book = listBooks().find(b => b.id === current.bookId);
		if (!book) return;
		const nextBook = answerReview(book, current.id, quality);
		upsertBook(nextBook);
		const nextStats = { ...getStats(), reviewsDone: (getStats().reviewsDone || 0) + 1 };
		saveStats(nextStats);
		setStats(nextStats);
		const rest = queue.filter(q => q.id !== current.id);
		setQueue(rest);
		setCurrent(rest[0] || null);
		setFlipped(false);
	};

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-[family-name:var(--font-space-grotesk)] text-3xl font-bold tracking-tight text-[var(--ar-heading)]">
					{t('review.title')}
				</h1>
				<p className="mt-2 text-sm text-[var(--ar-muted)]">{t('review.subtitle')}</p>
			</div>

			<div className="grid grid-cols-3 gap-3">
				{[
					{ label: t('review.streak'), value: stats.streak || 0, icon: Flame },
					{ label: t('review.due'), value: queue.length, icon: RotateCcw },
					{ label: t('review.done'), value: stats.reviewsDone || 0, icon: Check },
				].map(({ label, value, icon: Icon }) => (
					<div key={label} className="rounded-2xl bg-white/70 p-4 text-center ring-1 ring-[color:var(--ar-ring)]/10">
						<Icon size={16} className="mx-auto text-[var(--ar-accent)]" />
						<p className="mt-2 text-2xl font-bold text-[var(--ar-heading)]">{value}</p>
						<p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ar-muted)]">{label}</p>
					</div>
				))}
			</div>

			{!current ? (
				<div className="rounded-3xl bg-white/60 px-6 py-16 text-center text-sm text-[var(--ar-muted)]">
					{t('review.empty')}
				</div>
			) : (
				<motion.div
					key={current.id}
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					className="rounded-3xl bg-white/80 p-6 shadow-sm ring-1 ring-[color:var(--ar-ring)]/10"
				>
					<p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ar-muted)]">
						{current.bookTitle} · {current.type}
					</p>
					<button type="button" onClick={() => setFlipped(f => !f)} className="mt-4 w-full text-start">
						<p className="font-[family-name:var(--font-space-grotesk)] text-xl font-semibold leading-snug text-[var(--ar-heading)]">
							{flipped && current.answer ? current.answer : current.text}
						</p>
						<p className="mt-3 text-xs text-[var(--ar-muted)]">{flipped ? t('review.promptRecall') : t('review.tapReveal')}</p>
					</button>

					{flipped && (
						<div className="mt-6 flex flex-wrap gap-2">
							{[
								[0, t('review.forgot')],
								[3, t('review.hard')],
								[4, t('review.good')],
								[5, t('review.easy')],
							].map(([q, label]) => (
								<button
									key={q}
									type="button"
									onClick={() => grade(q)}
									className="rounded-full px-4 py-2 text-xs font-semibold text-white"
									style={{ background: q < 3 ? '#9f1239' : q === 3 ? '#b45309' : 'var(--ar-heading)' }}
								>
									{label}
								</button>
							))}
						</div>
					)}
				</motion.div>
			)}
		</div>
	);
}
