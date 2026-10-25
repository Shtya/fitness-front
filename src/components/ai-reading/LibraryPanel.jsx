'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDownUp, Plus, Search, SearchX, X } from 'lucide-react';
import { useReadingNav } from '@/lib/ai-reading/reading-nav';
import { deleteBook, listBooks, upsertBook } from '@/lib/ai-reading/storage';
import {
	AddBookTile,
	BookTile,
	ConfirmDeleteDialog,
	Dropdown,
	EmptyState,
	PageHeader,
	RenameDialog,
	ReadingSpeedControl,
	arBooks,
	bookPercent,
	useReadingSpeed,
	useRoomLang,
} from '@/components/ai-reading/room/RoomUI';
import { formatMinutes, getBookMeasure, minutesFor } from '@/lib/ai-reading/book-stats';

const recent = (a, b) => String(b.lastOpenedAt || b.updatedAt || '').localeCompare(String(a.lastOpenedAt || a.updatedAt || ''));

export default function LibraryPanel() {
	const { ar, L } = useRoomLang();
	const { openBook, goTab } = useReadingNav();
	const { wpm, prefs } = useReadingSpeed();
	const [books, setBooks] = useState(() => listBooks().filter(b => !b.indexOnly));
	const [query, setQuery] = useState('');
	const [filter, setFilter] = useState('all');
	const [sort, setSort] = useState('recent');
	const [renaming, setRenaming] = useState(null);
	const [deleting, setDeleting] = useState(null);

	useEffect(() => {
		const refresh = () => setBooks(listBooks().filter(b => !b.indexOnly));
		refresh();
		window.addEventListener('ai-reading:changed', refresh);
		return () => window.removeEventListener('ai-reading:changed', refresh);
	}, []);

	const counts = useMemo(() => {
		const c = { all: books.length, reading: 0, unread: 0, done: 0 };
		for (const b of books) {
			const p = bookPercent(b);
			if (p >= 100) c.done += 1;
			else if (p > 0) c.reading += 1;
			else c.unread += 1;
		}
		return c;
	}, [books]);

	const visible = useMemo(() => {
		const q = query.trim().toLowerCase();
		const list = books.filter(b => {
			const p = bookPercent(b);
			if (filter === 'reading' && !(p > 0 && p < 100)) return false;
			if (filter === 'unread' && p !== 0) return false;
			if (filter === 'done' && p < 100) return false;
			if (!q) return true;
			return `${b.title || ''} ${b.author || ''}`.toLowerCase().includes(q);
		});
		if (sort === 'title') return [...list].sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
		if (sort === 'short') return [...list].sort((a, b) => getBookMeasure(a).words - getBookMeasure(b).words);
		if (sort === 'long') return [...list].sort((a, b) => getBookMeasure(b).words - getBookMeasure(a).words);
		if (sort === 'added') return [...list].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
		return [...list].sort(recent);
	}, [books, query, filter, sort]);

	const totals = useMemo(() => {
		let words = 0;
		let minutes = 0;
		for (const b of books) {
			const m = getBookMeasure(b);
			words += m.words;
			minutes += minutesFor(m.words, wpm(m.language));
		}
		return { words, minutes };
		// eslint-disable-next-line react-hooks/exhaustive-deps -- wpm() only reads prefs
	}, [books, prefs]);

	const toImport = goTab ? () => goTab('import') : undefined;
	const compactWords = new Intl.NumberFormat(ar ? 'ar-EG-u-nu-latn' : 'en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(totals.words);
	const subtitle = books.length
		? L(
			`${arBooks(books.length)} · ${compactWords} كلمة · ${formatMinutes(totals.minutes, true)} قراءة`,
			`${books.length} book${books.length === 1 ? '' : 's'} · ${compactWords} words · ${formatMinutes(totals.minutes, false)} of reading`,
		)
		: L('لسه مفيش كتب', 'No books yet');
	const FILTERS = [
		['all', L('الكل', 'All')],
		['reading', L('بقرأه', 'Reading')],
		['unread', L('لم أبدأ', 'Not started')],
		['done', L('انتهيت', 'Finished')],
	];

	return (
		<div className="space-y-8">
			<PageHeader
				title={L('مكتبتي', 'Library')}
				subtitle={subtitle}
				actions={
					<>
						{books.length > 0 && <ReadingSpeedControl />}
						{toImport ? (
							<button type="button" className="rr-btn rr-btn-primary" onClick={toImport}>
								<Plus size={17} /> {L('أضف كتابًا', 'Add book')}
							</button>
						) : null}
					</>
				}
			/>

			{books.length > 0 && (
				<div className="flex flex-col gap-3 md:flex-row md:items-center">
					<div className="flex items-center gap-2 md:contents">
						<label className="relative block min-w-0 flex-1 md:w-72 md:flex-none">
							<Search size={16} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 rr-faint" />
							<input
								type="search"
								value={query}
								onChange={e => setQuery(e.target.value)}
								placeholder={L('ابحث في كتبك', 'Search your books')}
								className="rr-field h-10 rounded-full py-0 ps-10 pe-9 text-[14px]"
								aria-label={L('بحث في المكتبة', 'Search library')}
							/>
							{query && (
								<button type="button" onClick={() => setQuery('')} className="absolute end-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full rr-faint hover:bg-[var(--rr-sunken)]" aria-label={L('مسح البحث', 'Clear search')}>
									<X size={14} />
								</button>
							)}
						</label>
						<Dropdown
							value={sort}
							onChange={setSort}
							label={L('ترتيب الكتب', 'Sort books')}
							icon={ArrowDownUp}
							className="w-auto shrink-0 md:order-last md:ms-auto"
							options={[
								{ value: 'recent', label: L('آخر ما قرأت', 'Recently read') },
								{ value: 'added', label: L('أحدث إضافة', 'Recently added') },
								{ value: 'title', label: L('الاسم', 'Title') },
								{ value: 'short', label: L('الأقصر أولًا', 'Shortest first') },
								{ value: 'long', label: L('الأطول أولًا', 'Longest first') },
							]}
						/>
					</div>
					<div className="rr-tabs flex w-full md:inline-flex md:w-auto" role="tablist" aria-label={L('فلترة', 'Filter')}>
						{FILTERS.map(([id, label]) => (
							<button
								key={id}
								type="button"
								role="tab"
								aria-selected={filter === id}
								aria-current={filter === id ? 'page' : undefined}
								onClick={() => setFilter(id)}
								className="rr-tab h-8 flex-1 justify-center gap-1.5 px-2 text-[13px] md:flex-none md:px-3"
							>
								{filter === id && <span className="rr-tab-pill" />}
								<span>{label}</span>
								<span className="tabular-nums rr-faint">{counts[id]}</span>
							</button>
						))}
					</div>
				</div>
			)}

			{books.length === 0 ? (
				<div className="rr-card">
					<EmptyState
						icon={Plus}
						title={L('مكتبتك فاضية', 'Nothing here yet')}
						body={L('أي كتاب أو مقال تضيفه هيظهر هنا.', 'Every book and article you add lands here.')}
						action={toImport ? <button type="button" className="rr-btn rr-btn-primary" onClick={toImport}>{L('أضف كتابًا', 'Add a book')}</button> : null}
					/>
				</div>
			) : visible.length === 0 ? (
				<EmptyState
					icon={SearchX}
					title={L('مفيش نتايج', 'No matches')}
					body={L('جرّب كلمة تانية أو شيل الفلتر.', 'Try another word or clear the filter.')}
					action={<button type="button" className="rr-btn rr-btn-quiet" onClick={() => { setQuery(''); setFilter('all'); }}>{L('مسح الفلاتر', 'Clear filters')}</button>}
				/>
			) : (
				<div className="rr-grid">
					{visible.map(book => (
						<BookTile key={book.id} book={book} onOpen={openBook} onRename={setRenaming} onDelete={setDeleting} />
					))}
					{toImport && filter === 'all' && !query ? <AddBookTile onClick={toImport} /> : null}
				</div>
			)}

			<RenameDialog
				book={renaming}
				onCancel={() => setRenaming(null)}
				onSave={title => {
					upsertBook({ ...renaming, title });
					setBooks(listBooks().filter(b => !b.indexOnly));
					setRenaming(null);
				}}
			/>
			<ConfirmDeleteDialog
				book={deleting}
				onCancel={() => setDeleting(null)}
				onConfirm={() => {
					deleteBook(deleting.id);
					setBooks(listBooks().filter(b => !b.indexOnly));
					setDeleting(null);
				}}
			/>
		</div>
	);
}
