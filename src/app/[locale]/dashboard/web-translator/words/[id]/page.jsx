'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, Languages } from 'lucide-react';
import { webTranslatorApi } from '@/lib/web-translator/web-translator-api';
import { STUDIO } from '../../../ai-content-studio/components/studio-theme';

export default function WebTranslatorWordPage({ params }) {
	const { id } = params;
	const t = useTranslations('webTranslator');
	const locale = useLocale();
	const [word, setWord] = useState(null);
	const [missing, setMissing] = useState(false);

	useEffect(() => {
		let cancelled = false;
		webTranslatorApi
			.word(id)
			.then(({ data }) => {
				if (!cancelled) setWord(data);
			})
			.catch(() => {
				if (!cancelled) setMissing(true);
			});
		return () => {
			cancelled = true;
		};
	}, [id]);

	return (
		<div className="min-h-full p-4 sm:p-6" style={{ background: STUDIO.page }}>
			<div className="mx-auto max-w-2xl rounded-[24px] bg-white p-6" style={{ boxShadow: STUDIO.shadowCard }}>
				<Link href={`/${locale}/dashboard/web-translator`} className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600">
					<ArrowLeft size={14} /> {t('back')}
				</Link>
				{missing && <p className="text-sm text-slate-500">{t('notFound')}</p>}
				{word && (
					<>
						<div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white" style={{ background: STUDIO.gradientBr }}>
							<Languages size={22} />
						</div>
						<p className="text-2xl font-black text-slate-900" dir="auto">{word.text}</p>
						<p className="mt-1 text-xl font-bold text-indigo-600" dir="auto">{word.translation}</p>
						<div className="mt-5 space-y-2 text-sm text-slate-600">
							{word.pronunciation && <p>{t('pronunciation')}: {word.pronunciation}</p>}
							{word.partOfSpeech && <p>{t('partOfSpeech')}: {word.partOfSpeech}</p>}
							{word.example && <p>{t('example')}: {word.example}</p>}
						</div>
					</>
				)}
			</div>
		</div>
	);
}
