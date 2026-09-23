'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { BookShelf } from '@/components/ai-reading/BookShelf';
import { deleteBook, listBooks, upsertBook } from '@/lib/ai-reading/storage';

export default function LibraryPanel() {
	const t = useTranslations('aiReading');
	const router = useRouter();
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
				<h1 className="font-[family-name:var(--font-space-grotesk)] text-xl font-bold text-[#1a2e28] sm:text-3xl">
					{t('library.title')}
				</h1>
				<p className="mt-1 text-xs text-[#5c6b63] sm:mt-2 sm:text-sm">{t('library.subtitle')}</p>
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
				onOpen={id => router.push(`/ai-studio/read/${id}`)}
			/>
		</div>
	);
}
