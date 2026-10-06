'use client';

import { useTranslations } from 'next-intl';
import SmartDocumentEditor from '@/components/smart-document/SmartDocumentEditor';

export default function DocumentEditorPage() {
	const t = useTranslations('documentEditor');

	return (
		<div className="min-h-[calc(100vh-3.25rem)] px-2 py-2 sm:px-3 sm:py-3">
			<SmartDocumentEditor
				placeholder={t('placeholder')}
				storageKey="so7ba:smart-document:super-admin"
				labels={{
					badge: t('badge'),
					loading: t('loading'),
					words: t('words'),
					chars: t('chars'),
					edit: t('edit'),
					preview: t('preview'),
					modeLabel: t('modeLabel'),
					history: t('history'),
					historyEmpty: t('historyEmpty'),
					newDoc: t('newDoc'),
					showHistory: t('showHistory'),
					hideHistory: t('hideHistory'),
					delete: t('delete'),
					untitled: t('untitled'),
					saved: t('saved'),
					previewEmpty: t('previewEmpty'),
					justNow: t('justNow'),
					minAgo: t('minAgo'),
					hourAgo: t('hourAgo'),
					typography: t('typography'),
					typographyHint: t('typographyHint'),
					fontSize: t('fontSize'),
					lineHeight: t('lineHeight'),
					letterSpacing: t('letterSpacing'),
					wordSpacing: t('wordSpacing'),
					paragraphSpacing: t('paragraphSpacing'),
					arabicFont: t('arabicFont'),
					englishFont: t('englishFont'),
					reset: t('reset'),
					rename: t('rename'),
					renameHint: t('renameHint'),
				}}
			/>
		</div>
	);
}
