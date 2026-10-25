'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Layers, Plus } from 'lucide-react';
import { useReadingNav } from '@/lib/ai-reading/reading-nav';
import { getContinueBook, listBooks } from '@/lib/ai-reading/storage';
import { collectAllDue } from '@/lib/ai-reading/spaced-review';
import { AddBookTile, BookCover, BookSize, BookTile, DirArrow, EmptyState, arCards, bookPercent, bookTiming, useReadingSpeed, useRoomLang } from '@/components/ai-reading/room/RoomUI';
import { formatMinutes } from '@/lib/ai-reading/book-stats';

const recent = (a, b) => String(b.lastOpenedAt || b.updatedAt || '').localeCompare(String(a.lastOpenedAt || a.updatedAt || ''));

function greeting(L) {
	const h = new Date().getHours();
	if (h < 12) return L('صباح الخير', 'Good morning');
	if (h < 18) return L('نهارك سعيد', 'Good afternoon');
	return L('مساء الخير', 'Good evening');
}

/** Home: the book you're in the middle of, anything due for review, and your shelf. */
export default function ReadingHub({ onNavigate }) {
	const { L } = useRoomLang();
	const { openBook } = useReadingNav();
	const { wpm } = useReadingSpeed();
	const [books, setBooks] = useState(() => listBooks().filter(b => !b.indexOnly).sort(recent));
	const [hero, setHero] = useState(() => getContinueBook() || listBooks().filter(b => !b.indexOnly).sort(recent)[0] || null);
	const [due, setDue] = useState(0);

	useEffect(() => {
		const read = () => {
			const list = listBooks().filter(b => !b.indexOnly).sort(recent);
			setBooks(list);
			setHero(getContinueBook() || list[0] || null);
			setDue(collectAllDue(list).length);
		};
		read();
		window.addEventListener('ai-reading:changed', read);
		return () => window.removeEventListener('ai-reading:changed', read);
	}, []);

	const go = tab => onNavigate?.(tab);
	if (!books) return null;

	if (!books.length) {
		return (
			<div className="rr-card">
				<EmptyState
					icon={BookOpen}
					title={L('رفّك لسه فاضي', 'Your shelf is empty')}
					body={L('ابدأ بأول كتاب: الصق نص، أو حط لينك مقال أو محادثة ChatGPT، أو ارفع PDF.', 'Start with your first book — paste text, drop in an article or ChatGPT link, or upload a PDF.')}
					action={
						<button type="button" className="rr-btn rr-btn-primary rr-btn-lg" onClick={() => go('import')}>
							<Plus size={18} /> {L('أضف أول كتاب', 'Add your first book')}
						</button>
					}
				/>
			</div>
		);
	}

	const pct = hero ? bookPercent(hero) : 0;
	const left = hero ? bookTiming(hero, wpm).left : 0;
	const shelf = books.filter(b => b.id !== hero?.id).slice(0, 11);

	return (
		<div className="space-y-10 sm:space-y-14">
			<header>
				<p className="rr-eyebrow mb-2">{greeting(L)}</p>
				<h1 className="rr-display">{L('نكمّل من حيث وقفت؟', 'Pick up where you left off')}</h1>
			</header>

			{hero && (
				<motion.section
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
					className="rr-card relative overflow-hidden p-5 sm:p-8"
				>
					<div
						aria-hidden
						className="pointer-events-none absolute -top-24 end-[-6rem] size-72 rounded-full opacity-60 blur-3xl"
						style={{ background: 'var(--rr-accent-soft)' }}
					/>
					<div className="relative flex gap-5 sm:gap-8">
						<button type="button" onClick={() => openBook(hero.id)} className="rr-book w-[96px] shrink-0 sm:w-[150px]" aria-label={hero.title}>
							<BookCover book={hero} />
						</button>
						<div className="flex min-w-0 flex-1 flex-col">
							<p className="rr-eyebrow">{pct > 0 ? L('بتقرأ دلوقتي', 'Currently reading') : L('جاهز تبدأ', 'Ready to start')}</p>
							<h2 className="rr-serif mt-2 line-clamp-3 text-[20px] font-medium leading-snug sm:text-[30px] sm:leading-tight" dir="auto">
								{hero.title}
							</h2>
							<BookSize book={hero} className="mt-2 text-[12.5px]" />
							<div className="mt-auto pt-5">
								<div className="flex items-center gap-3">
									<div className="rr-progress flex-1" aria-hidden><span style={{ width: `${pct}%` }} /></div>
									<span className="shrink-0 text-[13px] font-semibold tabular-nums">{pct}%</span>
								</div>
								<div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
									<button type="button" className="rr-btn rr-btn-primary" onClick={() => openBook(hero.id)}>
										{pct > 0 ? L('كمّل القراءة', 'Continue reading') : L('ابدأ القراءة', 'Start reading')}
										<DirArrow size={16} />
									</button>
									{left ? <span className="text-[13px] rr-faint">{L(`فاضل ${formatMinutes(left, true)}`, `${formatMinutes(left, false)} left`)}</span> : null}
								</div>
							</div>
						</div>
					</div>
				</motion.section>
			)}

			{due > 0 && (
				<button type="button" onClick={() => go('review')} className="rr-card group flex w-full items-center gap-4 p-4 text-start transition hover:shadow-[var(--rr-shadow)] sm:px-6">
					<span className="grid size-11 shrink-0 place-items-center rounded-full" style={{ background: 'var(--rr-accent-soft)', color: 'var(--rr-accent)' }}>
						<Layers size={19} />
					</span>
					<span className="min-w-0 flex-1">
						<span className="block text-[15px] font-semibold">
							{L(`${arCards(due)} مستنية مراجعة`, `${due} card${due === 1 ? '' : 's'} ready to review`)}
						</span>
						<span className="mt-0.5 block text-[13px] rr-faint">{L('دقيقتين يثبّتوا اللي قريته', 'Two minutes to make your reading stick')}</span>
					</span>
					<DirArrow size={18} className="shrink-0 rr-faint" />
				</button>
			)}

			<section>
				<div className="mb-5 flex items-end justify-between gap-4">
					<h2 className="rr-serif text-[24px] font-medium sm:text-[28px]">{L('رفّك', 'Your shelf')}</h2>
					<button type="button" className="rr-btn rr-btn-ghost rr-btn-sm -me-3" onClick={() => go('library')}>
						{L(`كل الكتب (${books.length})`, `All books (${books.length})`)} <DirArrow size={14} />
					</button>
				</div>
				<div className="rr-shelf-row">
					{shelf.map(book => (
						<BookTile key={book.id} book={book} onOpen={openBook} />
					))}
					<AddBookTile onClick={() => go('import')} />
				</div>
			</section>
		</div>
	);
}
