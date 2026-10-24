'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, BookOpen, Loader2 } from 'lucide-react';
import { BookShelf } from '@/components/ai-reading/BookShelf';
import ReadingView from '@/components/ai-reading/ReadingView';
import { getBook, getContinueBook, hydrateAiReadingStore, listBooks } from '@/lib/ai-reading/storage';
import { uiFontFamily } from '@/lib/ai-reading/fonts';
import '@/lib/ai-reading/ai-reading-theme.css';
import '@/lib/ai-reading/reading-fonts.css';

export default function WhatsAppReadingTab() {
	const locale = useLocale();
	const t = useTranslations('aiReading');
	const [books, setBooks] = useState([]);
	const [selectedBook, setSelectedBook] = useState(null);
	const [loading, setLoading] = useState(true);
	const isArabic = locale === 'ar';

	const refreshBooks = useCallback(() => {
		const next = listBooks().filter(book => !book.indexOnly);
		setBooks(next);
		setSelectedBook(current => {
			if (!current) return null;
			return getBook(current.id) || null;
		});
	}, []);

	useEffect(() => {
		let alive = true;
		const onChanged = () => refreshBooks();
		window.addEventListener('ai-reading:changed', onChanged);
		hydrateAiReadingStore()
			.then(() => {
				if (!alive) return;
				const next = listBooks().filter(book => !book.indexOnly);
				setBooks(next);
				setSelectedBook(getContinueBook() || null);
				setLoading(false);
			})
			.catch(() => {
				if (alive) setLoading(false);
			});
		return () => {
			alive = false;
			window.removeEventListener('ai-reading:changed', onChanged);
		};
	}, [refreshBooks]);

	return (
		<div
			className="ai-reading-root min-h-full w-full overflow-hidden"
			dir={isArabic ? 'rtl' : 'ltr'}
			style={{ fontFamily: uiFontFamily(isArabic ? 'ar' : 'en') }}
		>
			{loading ? (
				<div className="grid min-h-[60vh] place-items-center text-sm" style={{ color: 'var(--ar-muted)' }} role="status">
					<Loader2 size={20} className="animate-spin" aria-label={t('common.loading')} />
				</div>
			) : selectedBook ? (
				<div className="h-[min(100dvh,900px)] min-h-[620px] w-full">
					<ReadingView book={selectedBook} onBack={() => setSelectedBook(null)} />
				</div>
			) : (
				<div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
					<header className="mb-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white/85 p-5 shadow-sm sm:rounded-3xl sm:p-7" style={{ borderColor: 'var(--ar-border)' }}>
						<div className="flex min-w-0 items-center gap-3">
							<span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white shadow-sm"><BookOpen size={20} /></span>
							<div className="min-w-0">
								<p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">{t('brand')}</p>
								<h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">{isArabic ? 'مكتبتك القرائية' : 'Your reading library'}</h1>
							</div>
						</div>
						<p className="max-w-lg text-sm leading-6 text-slate-500">{isArabic ? 'اختر كتابًا للمتابعة. تقدمك وملاحظاتك محفوظة في مكتبة القراءة الحالية.' : 'Choose a book to continue. Your progress and notes stay in your existing Reading library.'}</p>
					</header>
					{books.length ? (
						<BookShelf
							books={books}
							emptyLabel={t('hub.empty')}
							onOpen={id => setSelectedBook(getBook(id) || books.find(book => String(book.id) === String(id)) || null)}
						/>
					) : (
						<div className="rounded-2xl border border-dashed bg-white/70 px-5 py-14 text-center" style={{ borderColor: 'var(--ar-border)' }}>
							<BookOpen size={28} className="mx-auto text-slate-400" aria-hidden="true" />
							<p className="mt-3 font-semibold text-slate-800">{isArabic ? 'مكتبتك فارغة حاليًا' : 'Your library is empty'}</p>
							<p className="mt-1 text-sm text-slate-500">{isArabic ? 'أضف كتابًا من مساحة Reading الحالية، وسيظهر هنا تلقائيًا.' : 'Add a book from the existing Reading workspace and it will appear here.'}</p>
						</div>
						)}
					{selectedBook ? (
						<button type="button" className="mt-4 inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => setSelectedBook(null)}>
							<ArrowLeft size={15} aria-hidden="true" /> {isArabic ? 'العودة للمكتبة' : 'Back to library'}
						</button>
					) : null}
				</div>
			)}
		</div>
	);
}
