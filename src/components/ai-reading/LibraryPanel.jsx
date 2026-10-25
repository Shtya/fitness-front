'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useReadingNav } from '@/lib/ai-reading/reading-nav';
import { BookShelf } from '@/components/ai-reading/BookShelf';
import { deleteBook, listBooks, upsertBook } from '@/lib/ai-reading/storage';

export default function LibraryPanel() {
	const t = useTranslations('aiReading');
	const { openBook, goTab } = useReadingNav();
	const [books, setBooks] = useState([]);

	const refresh = () => setBooks(listBooks().filter(b => !b.indexOnly));

	useEffect(() => {
		refresh();
		const onChange = () => refresh();
		window.addEventListener('ai-reading:changed', onChange);
		return () => window.removeEventListener('ai-reading:changed', onChange);
	}, []);

	return (
		<div className="space-y-4 sm:space-y-6">
			<div>
				<h1 className="font-[family-name:var(--font-space-grotesk)] text-xl font-bold text-[var(--ar-heading)] sm:text-3xl">
					{t('library.title')}
				</h1>
				<p className="mt-1 text-xs text-[var(--ar-muted)] sm:mt-2 sm:text-sm">{t('library.subtitle')}</p>
			</div>
			<BookShelf
				books={books}
				emptyLabel={t('hub.empty')}
				onDelete={id => {
					deleteBook(id);
					refresh();
				}}
				onEdit={book => {
					const title = window.prompt(t('library.renamePrompt'), book.title);
					if (!title?.trim()) return;
					upsertBook({ ...book, title: title.trim() });
					refresh();
				}}
				onOpen={openBook}
				onImport={goTab ? () => goTab('import') : undefined}
			/>
		</div>
	);
}
