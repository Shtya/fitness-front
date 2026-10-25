'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AnimatePresence, motion } from 'framer-motion';
import { PartyPopper, RotateCcw } from 'lucide-react';
import { answerReview, collectAllDue, enqueueReviewItems } from '@/lib/ai-reading/spaced-review';
import { getStats, listBooks, saveStats, upsertBook } from '@/lib/ai-reading/storage';
import { EmptyState, PageHeader, arCards, useRoomLang } from '@/components/ai-reading/room/RoomUI';

const GRADES = [
	{ q: 0, key: 'review.forgot', tone: 'var(--rr-danger)' },
	{ q: 3, key: 'review.hard', tone: '#b7791f' },
	{ q: 4, key: 'review.good', tone: 'var(--rr-accent)' },
	{ q: 5, key: 'review.easy', tone: '#2f6db5' },
];

export default function DailyReview() {
	const t = useTranslations('aiReading');
	const { L } = useRoomLang();
	const [queue, setQueue] = useState([]);
	const [total, setTotal] = useState(0);
	const [flipped, setFlipped] = useState(false);

	useEffect(() => {
		// Only books whose queue actually gained items are written back.
		const books = listBooks().map(b => {
			const next = enqueueReviewItems({ ...b });
			if ((next.reviewQueue?.length || 0) !== (b.reviewQueue?.length || 0)) upsertBook(next);
			return next;
		});
		const due = collectAllDue(books);
		setQueue(due);
		setTotal(due.length);
	}, []);

	const current = queue[0] || null;
	const done = total - queue.length;

	const grade = quality => {
		if (!current) return;
		const book = listBooks().find(b => b.id === current.bookId);
		if (book) {
			upsertBook(answerReview(book, current.id, quality));
			saveStats({ ...getStats(), reviewsDone: (getStats().reviewsDone || 0) + 1 });
		}
		setFlipped(false);
		setQueue(q => q.slice(1));
	};

	useEffect(() => {
		if (!current) return undefined;
		const onKey = e => {
			if (e.target.closest?.('input, textarea, select')) return;
			if (e.key === ' ' || e.key === 'Enter') {
				e.preventDefault();
				setFlipped(f => !f);
			} else if (flipped && ['1', '2', '3', '4'].includes(e.key)) {
				grade(GRADES[Number(e.key) - 1].q);
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	return (
		<div className="mx-auto max-w-2xl space-y-8">
			<PageHeader
				title={L('المراجعة', 'Review')}
				subtitle={L('أفكار من كتبك ترجعلك في الوقت المناسب عشان تفضل فاكرها.', 'Ideas from your books come back right when you are about to forget them.')}
			/>

			{!current ? (
				<div className="rr-card">
					<EmptyState
						icon={total ? PartyPopper : RotateCcw}
						title={total ? L('خلّصت مراجعة النهارده', 'All done for today') : L('مفيش حاجة للمراجعة دلوقتي', 'Nothing to review right now')}
						body={
							total
								? L(`راجعت ${arCards(total)}. ارجع بكرة.`, `You reviewed ${total} card${total === 1 ? '' : 's'}. Come back tomorrow.`)
								: L('ظلّل جمل أو اكتب ملاحظات وانت بتقرأ، وهتظهر هنا للمراجعة.', 'Highlight lines or take notes while reading and they will show up here.')
						}
					/>
				</div>
			) : (
				<div className="space-y-5">
					<div className="flex items-center gap-3">
						<div className="rr-progress flex-1" aria-hidden><span style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
						<span className="shrink-0 text-[13px] font-semibold tabular-nums rr-muted" dir="ltr">{done + 1} / {total}</span>
					</div>

					<AnimatePresence mode="wait">
						<motion.div
							key={current.id}
							initial={{ opacity: 0, x: 24 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -24 }}
							transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
							className="rr-flash"
						>
							<button
								type="button"
								onClick={() => setFlipped(f => !f)}
								className={`rr-flash-inner w-full text-start ${flipped ? 'is-flipped' : ''}`}
								aria-label={flipped ? L('اعرض السؤال', 'Show prompt') : L('اعرض الإجابة', 'Show answer')}
							>
								<span className="rr-flash-face" aria-hidden={flipped}>
									<span className="rr-eyebrow truncate" dir="auto">{current.bookTitle}</span>
									<span className="rr-serif my-auto py-8 text-[22px] leading-snug sm:text-[26px]" dir="auto">{current.text}</span>
									<span className="text-[13px] rr-faint">{t('review.tapReveal')}</span>
								</span>
								<span className="rr-flash-face is-back" aria-hidden={!flipped}>
									<span className="rr-eyebrow truncate" dir="auto">{current.bookTitle}</span>
									<span className="rr-serif my-auto py-8 text-[20px] leading-relaxed sm:text-[23px]" dir="auto">{current.answer || current.text}</span>
									<span className="text-[13px] rr-faint">{t('review.promptRecall')}</span>
								</span>
							</button>
						</motion.div>
					</AnimatePresence>

					<div className="grid grid-cols-4 gap-2" style={{ opacity: flipped ? 1 : 0.4, pointerEvents: flipped ? 'auto' : 'none', transition: 'opacity .2s' }} aria-hidden={!flipped}>
						{GRADES.map(({ q, key, tone }, i) => (
							<button
								key={q}
								type="button"
								tabIndex={flipped ? 0 : -1}
								onClick={() => grade(q)}
								className="rr-btn h-auto flex-col gap-0.5 rounded-2xl px-2 py-3"
								style={{ background: 'var(--rr-surface)', boxShadow: 'inset 0 0 0 1px var(--rr-line-strong)', color: tone }}
							>
								<span className="text-[14px] font-semibold">{t(key)}</span>
								<span className="hidden text-[11px] font-medium rr-faint sm:block">{i + 1}</span>
							</button>
						))}
					</div>
					{!flipped && <p className="text-center text-[12.5px] rr-faint">{L('فكّر في الإجابة الأول، وبعدين اقلب البطاقة', 'Recall it first, then flip the card')}</p>}
				</div>
			)}
		</div>
	);
}
