'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import ReadingShell from '@/components/ai-reading/ReadingShell';
import ReadingView from '@/components/ai-reading/ReadingView';
import { getBook } from '@/lib/ai-reading/storage';
import { aiReadingApi } from '@/lib/ai-reading/client-api';
import { upsertBook } from '@/lib/ai-reading/storage';

export default function ReadBookPage() {
	const params = useParams();
	const bookId = params?.bookId;
	const t = useTranslations('aiReading');
	const [book, setBook] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let local = getBook(bookId);
		if (local) {
			setBook(local);
			setLoading(false);
			return;
		}
		aiReadingApi
			.listBooks()
			.then(({ books }) => {
				const found = (books || []).find(b => b.id === bookId);
				if (found) {
					upsertBook(found);
					setBook(found);
				}
			})
			.finally(() => setLoading(false));
	}, [bookId]);

	if (loading) {
		return (
			<ReadingShell bare>
				<div className="grid min-h-screen place-items-center text-sm text-[#5c6b63]">{t('common.loading')}</div>
			</ReadingShell>
		);
	}

	if (!book) {
		return (
			<ReadingShell>
				<div className="py-20 text-center">
					<p className="text-[#1a2e28] font-semibold">{t('reading.notFound')}</p>
					<Link href="/ai-studio/library" className="mt-4 inline-block text-sm text-[#3d5a4c] underline">
						{t('reading.back')}
					</Link>
				</div>
			</ReadingShell>
		);
	}

	return (
		<ReadingShell bare>
			<ReadingView book={book} />
		</ReadingShell>
	);
}
