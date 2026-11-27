'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import HabitTimer from '@/app/[locale]/dashboard/whatsapp/tickets/HabitTimer';
import { dayKey, normalizeHabit, toggleDay } from '@/app/[locale]/dashboard/whatsapp/tickets/habits-model';
import SmartDocumentEditor from './SmartDocumentEditor';

const HABITS_LS = 'wa-habits:v1';

function readHabitList() {
	try {
		const raw = JSON.parse(window.localStorage.getItem(HABITS_LS) || 'null');
		const today = dayKey();
		return (raw?.habits || []).filter(h => h && !h.deletedAt).map(h => normalizeHabit(h, today));
	} catch {
		return [];
	}
}

/** Mark today's habit done in the same local copy Habits reads, without opening that screen. */
function markHabitDoneToday(id) {
	try {
		const raw = JSON.parse(window.localStorage.getItem(HABITS_LS) || 'null');
		if (!raw || !Array.isArray(raw.habits)) return;
		const today = dayKey();
		const habits = raw.habits.map(h => {
			if (h?.id !== id) return h;
			const cur = normalizeHabit(h, today);
			if (cur.log?.[today]?.s === 'done') return h;
			return { ...toggleDay(cur, today), updatedAt: Date.now() };
		});
		window.localStorage.setItem(HABITS_LS, JSON.stringify({ ...raw, habits }));
	} catch {
		/* ignore a blocked or broken store */
	}
}

function DocsTimer() {
	const locale = useLocale();
	const ar = locale === 'ar';
	const [habits, setHabits] = useState([]);
	useEffect(() => {
		const sync = () => setHabits(readHabitList());
		sync();
		window.addEventListener('storage', sync);
		window.addEventListener('focus', sync);
		return () => {
			window.removeEventListener('storage', sync);
			window.removeEventListener('focus', sync);
		};
	}, []);
	return (
		<div className="sd-chrome-timer">
			<HabitTimer ar={ar} habits={habits} onMarkDone={markHabitDoneToday} />
		</div>
	);
}

/** The editor's translated labels, shared by every place that embeds the Documents editor. */
export function useDocumentEditorLabels() {
	const t = useTranslations('documentEditor');
	return useMemo(
		() => ({
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
			lookupLoading: t('lookupLoading'),
			lookupError: t('lookupError'),
			translateSelection: t('translateSelection'),
			contextSentence: t('contextSentence'),
			listen: t('listen'),
			reviewOptions: t('reviewOptions'),
			meaningShow: t('meaningShow'),
			meaningBlur: t('meaningBlur'),
			meaningHide: t('meaningHide'),
			showAnswer: t('showAnswer'),
			autoSpeak: t('autoSpeak'),
			hideExample: t('hideExample'),
			dueTab: t('dueTab'),
			reviewedTab: t('reviewedTab'),
			reviewedEmpty: t('reviewedEmpty'),
			reviewedHint: t('reviewedHint'),
			dueClear: t('dueClear'),
			shuffle: t('shuffle'),
			coverWord: t('coverWord'),
			speakSentence: t('speakSentence'),
			reviewSettings: t('reviewSettings'),
			voices: t('voices'),
			voiceHint: t('voiceHint'),
			voiceEmpty: t('voiceEmpty'),
			example: t('example'),
			pronunciation: t('pronunciation'),
			partOfSpeech: t('partOfSpeech'),
			favorite: t('favorite'),
			favorited: t('favorited'),
			recentLookups: t('recentLookups'),
			favorites: t('favorites'),
			favoritesEmpty: t('favoritesEmpty'),
			recentEmpty: t('recentEmpty'),
			openShelf: t('openShelf'),
			reviewed: t('reviewed'),
			showReviewed: t('showReviewed'),
			hideReviewed: t('hideReviewed'),
			langAr: t('langAr'),
			langEn: t('langEn'),
			close: t('close'),
			shelfTitle: t('shelfTitle'),
			shelfHint: t('shelfHint'),
			shelfButton: t('shelfButton'),
			export: t('export'),
			exportShort: t('exportShort'),
			shareShort: t('shareShort'),
			shareLive: t('shareLive'),
			typeShort: t('typeShort'),
			reviewShort: t('reviewShort'),
			readMins: t('readMins'),
			exportDone: t('exportDone'),
			exportEmpty: t('exportEmpty'),
			exportFailed: t('exportFailed'),
			share: t('share'),
			shareAgain: t('shareAgain'),
			shareCopied: t('shareCopied'),
			shareReady: t('shareReady'),
			shareCopyHint: t('shareCopyHint'),
			shareEmpty: t('shareEmpty'),
			shareFailed: t('shareFailed'),
			shareVisitors: t('shareVisitors'),
			shareVisitorsHint: t('shareVisitorsHint'),
			shareVisitsEmpty: t('shareVisitsEmpty'),
			shareVisitsFailed: t('shareVisitsFailed'),
			shareVisitsNeedShare: t('shareVisitsNeedShare'),
			shareVisitsRefresh: t('shareVisitsRefresh'),
			shareVisitUnknownLocation: t('shareVisitUnknownLocation'),
			shareVisitLocal: t('shareVisitLocal'),
			shareVisitUnknownBrowser: t('shareVisitUnknownBrowser'),
			shareVisitLocation: t('shareVisitLocation'),
			shareVisitBrowser: t('shareVisitBrowser'),
			shareVisitIp: t('shareVisitIp'),
			shareVisitIsp: t('shareVisitIsp'),
			shareVisitDevice: t('shareVisitDevice'),
		}),
		[t],
	);
}

/**
 * The smart document editor with its translated labels. Shared by the
 * /dashboard/super-admin/document-editor page and the WhatsApp "Documents" tab
 * (admin + super admin), so both open the same documents and history (same storage key).
 */
export default function DocumentEditorWorkspace({ className = 'min-h-[calc(100vh-3.25rem)] px-2 py-2 sm:px-3 sm:py-3' }) {
	const t = useTranslations('documentEditor');
	const labels = useDocumentEditorLabels();

	return (
		<div className={className}>
			<SmartDocumentEditor
				// The placeholder shows sample HTML tags; t() would parse them as rich-text tags and fail.
				placeholder={t.raw('placeholder')}
				storageKey="so7ba:smart-document:super-admin"
				labels={labels}
				toolbarEnd={<DocsTimer />}
				// Documents live in the user's account; the browser keeps a cache for instant opens.
				remoteSync
			/>
		</div>
	);
}
