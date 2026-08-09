'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocale } from 'next-intl';
import {
	BookMarked,
	Play,
	Pause,
	SkipBack,
	SkipForward,
	Volume2,
	VolumeX,
	Repeat,
	Check,
	CheckCircle2,
	RotateCcw,
	Brain,
	LoaderCircle,
	Trash2,
	Plus,
	ExternalLink,
	History,
	X,
	RotateCw,
	Film,
	SignalLow,
	Settings2,
	ChevronDown,
	FolderPlus,
	Folder,
	FolderOpen,
	Pencil,
	Youtube,
	Maximize2,
	Minimize2,
	Info,
	BookOpenText,
	CircleAlert,
} from 'lucide-react';
import { GradientStatsHeader } from '@/components/molecules/GradientStatsHeader';
import Select from '@/components/atoms/Select';
import {
	SURAHS,
	BUILTIN_RECITERS,
	ayahAudioUrl,
	extractYoutubeId,
	fetchYoutubeTitle,
} from './quran-data';
import {
	setStudioMounted as setQuranStudioMounted,
	handoffFromStudio as handoffQuranBg,
	stop as stopQuranBg,
	reclaimIfStale as reclaimQuranBg,
} from '@/lib/quran-bg-player';
import YoutubeResumePlayer from './YoutubeResumePlayer';
import TajweedText from './TajweedText';
import TajweedGuideModal from './TajweedGuideModal';
import {
	cloudStateIsEmpty,
	createDebouncedPutter,
	fetchQuranRevisionState,
	importQuranRevisionState,
} from './quran-revision-api';
import './quran-revision.css';

const LS_PREFS = 'so7ba:quran-revision:prefs:v2';
const LS_FAVS = 'so7ba:quran-revision:yt-favs:v1';
const LS_FOLDERS = 'so7ba:quran-revision:yt-folders:v1';
const LS_HISTORY = 'so7ba:quran-revision:history:v1';
const LS_WORD_ERRORS = 'so7ba:quran-revision:word-errors:v1';
const LS_SESSION = 'so7ba:quran-revision:active-session:v1';
const EMPTY_WORD_MARKS = Object.freeze({});

function wordErrorKey(surahId, ayahNumber, wordIdx) {
	return `${surahId}:${ayahNumber}:${wordIdx}`;
}

function normalizeWordErrors(raw) {
	if (!raw || typeof raw !== 'object') return {};
	const out = {};
	Object.entries(raw).forEach(([key, type]) => {
		if (type !== 'tashkeel' && type !== 'forgot') return;
		const parts = String(key).split(':');
		if (parts.length !== 3) return;
		const surahId = Number(parts[0]);
		const ayahNumber = Number(parts[1]);
		const wordIdx = Number(parts[2]);
		if (![surahId, ayahNumber, wordIdx].every(Number.isInteger)) return;
		out[wordErrorKey(surahId, ayahNumber, wordIdx)] = type;
	});
	return out;
}

function clearSavedSession() {
	try {
		localStorage.removeItem(LS_SESSION);
	} catch {
		/* ignore */
	}
}

function normalizeSavedSession(raw) {
	if (!raw || typeof raw !== 'object') return null;
	if (raw.sessionPhase !== 'active' && raw.sessionPhase !== 'completed') return null;
	const surahId = Number(raw.selectedSurahId);
	if (!Number.isInteger(surahId) || surahId < 1) return null;
	const mode = raw.mode === 'page' ? 'page' : 'quarter';
	const selectedUnitIds = normalizeUnitIds(raw.selectedUnitIds);
	if (!selectedUnitIds.length) return null;
	return {
		v: 1,
		sessionPhase: raw.sessionPhase,
		selectedSurahId: surahId,
		mode,
		selectedUnitIds,
		repeatCount: Math.max(1, Number(raw.repeatCount) || 3),
		repeatScope: raw.repeatScope === 'selection' ? 'selection' : 'ayah',
		sourceTab: raw.sourceTab === 'youtube' || raw.sourceTab === 'favorites' ? 'youtube' : 'builtin',
		selectedReciterId: raw.selectedReciterId || 'minshawi',
		selectedFavId: raw.selectedFavId || null,
		currentVerseIndex: Math.max(0, Number(raw.currentVerseIndex) || 0),
		currentVerseRepeat: Math.max(1, Number(raw.currentVerseRepeat) || 1),
		completedVerses: Math.max(0, Number(raw.completedVerses) || 0),
		completedRepeats: Math.max(0, Number(raw.completedRepeats) || 0),
		elapsedSec: Math.max(0, Number(raw.elapsedSec) || 0),
		verseProgress: Math.min(100, Math.max(0, Number(raw.verseProgress) || 0)),
		muted: raw.muted === true,
		finalStats: raw.finalStats && typeof raw.finalStats === 'object' ? raw.finalStats : null,
	};
}
const HISTORY_MAX = 40;
const FOLDER_FILTER_ALL = 'all';
const REPEAT_OPTIONS = [1, 2, 3, 4, 5, 7, 10, 15];
const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5];
const QR_SELECT_CN = '!h-[2.2rem] !rounded-[0.65rem] !text-[0.75rem] !font-bold !bg-[var(--qr-soft,#f8fafc)] !border-slate-200';

const DEFAULT_PREFS = {
	selectedSurahId: 2,
	mode: 'quarter',
	selectedUnitIds: [],
	/** Persist quarter/page picks per surah+mode: { "2:quarter": [1,2] } */
	unitSelections: {},
	repeatCount: 3,
	repeatScope: 'ayah', // ayah | selection
	sourceTab: 'builtin',
	selectedReciterId: 'minshawi',
	selectedFavId: null,
	followAlong: true,
	showTajweed: false,
	isMemorizationMode: false,
	hideParts: ['middle'], // multi: start | middle | end
	volume: 0.85,
	speed: 1,
	ytPlayMode: 'audio', // audio = data-saver (lowest quality) | video = normal
};

function unitSelectionKey(surahId, mode) {
	return `${surahId}:${mode}`;
}

const COPY = {
	ar: {
		title: 'مراجعة القرآن',
		desc: 'سورة · ربع/صفحة · تكرار · قارئ · ابدأ',
		surah: 'السورة',
		mode: 'النوع',
		quarter: 'ربع',
		page: 'صفحة',
		byQuarterHint: 'أرباع الحزب الحقيقية',
		byPageHint: 'صفحات المصحف',
		hizb: 'حزب',
		rub1: '(1/4)',
		rub2: '(1/2)',
		rub3: '(3/4)',
		rub4: '(4/4)',
		unitsLoading: 'جاري تحميل الأرباع…',
		pick: 'اختر',
		pickUnits: 'اضغط لاختيار ربع أو أكثر · اضغط تاني أو ✕ للإلغاء',
		deselectUnit: 'إلغاء الاختيار',
		selectedCount: 'مختار',
		from: 'من',
		to: 'إلى',
		repeat: 'التكرار',
		repeatScope: 'نوع التكرار',
		repeatAyah: 'كل آية',
		repeatSelection: 'كل النطاق',
		repeatAyahHint: 'كرر الآية ثم انتقل للتالية',
		repeatSelectionHint: 'شغّل كل الآيات ثم كرّر النطاق',
		reciter: 'القارئ',
		builtin: 'قراء',
		youtube: 'YouTube',
		favorites: 'يوتيوب',
		search: 'بحث',
		searching: '…',
		noYt: 'ابحث أو احفظ رابطًا',
		start: 'ابدأ',
		verses: 'آيات',
		times: '×',
		newSession: 'جلسة جديدة',
		completed: 'اكتملت المراجعة',
		restart: 'إعادة',
		testMemo: 'اختبار حفظ',
		reviewed: 'تمت',
		duration: 'المدة',
		progress: 'التقدم',
		follow: 'تتبع',
		memo: 'إخفاء',
		hideStart: 'أولها',
		hideMiddle: 'وسطها',
		hideEnd: 'آخرها',
		hidePartsHint: 'ممكن تختار أكتر من جزء',
		saveReading: 'حفظ للمفضلة',
		sessionSettings: 'إعدادات الجلسة',
		changeWhilePlaying: 'عدّل السورة أو الربع أو التكرار، ثم اضغط تطبيق للبدء',
		applySettings: 'تطبيق وبدء',
		settingsPending: 'في تغييرات غير مطبّقة',
		ayah: 'آية',
		readingFrom: 'من آية',
		readingTo: 'إلى',
		saved: 'محفوظ',
		addFav: 'حفظ',
		favUrl: 'الصق رابط YouTube…',
		favEmpty: 'لا فيديوهات محفوظة بعد',
		favSaved: 'تم الحفظ',
		favLoadingTitle: 'جاري جلب اسم الفيديو…',
		favDetected: 'الاسم',
		remove: 'حذف',
		selectFav: 'اختيار',
		openYt: 'فتح',
		loadingAyahs: 'تحميل الآيات…',
		audioError: 'تعذّر تشغيل الصوت — جرّب قارئًا آخر',
		playing: 'يعمل',
		history: 'السجل',
		historyTitle: 'جلساتي السابقة',
		historyEmpty: 'لا توجد جلسات محفوظة بعد',
		historyClear: 'مسح الكل',
		historyReplay: 'إعادة',
		historyLoad: 'تحميل',
		historyDelete: 'حذف',
		historyJustNow: 'الآن',
		historyMins: 'د',
		historyHours: 'س',
		historyDays: 'ي',
		favPanelTitle: 'مفضلة يوتيوب',
		favFromSession: 'حفظ من الجلسة',
		favAddYoutube: 'إضافة من YouTube',
		useFav: 'استخدام',
		ytAudio: 'توفير داتا',
		ytVideo: 'فيديو عادي',
		ytModeHint: 'يوتيوب مفيهوش صوت فقط رسميًا · توفير الداتا = أقل جودة (١٤٤p)',
		ytAskMode: 'جودة التشغيل؟',
		ytClear: 'إلغاء اليوتيوب',
		folderAll: 'الكل',
		folderPick: 'الفولدر',
		folderNamePh: 'اسم الفولدر…',
		folderAdd: 'إضافة فولدر',
		folderNeed: 'اختَر فولدر أولاً',
		folderEmpty: 'مفيش فيديوهات في الفولدر ده',
		folderDelete: 'حذف الفولدر',
		folderRename: 'تعديل الاسم',
		expandMushaf: 'ملء الشاشة',
		collapseMushaf: 'تصغير',
		tajweed: 'تجويد',
		tajweedHint: 'شغّل «تجويد» عشان لما تمرّر أو تضغط على كلمة ملونة يظهر شرح الحكم',
		tajweedLegend: 'دليل ألوان التجويد',
		tajweedGuide: 'الدليل',
		tajweedLegendClose: 'إغلاق',
		tajweedMeaning: 'يعني إيه؟',
		tajweedWhy: 'إزاي تطبّقه؟',
		tajweedTip: 'خدها كده',
		tajweedExample: 'مثال',
		tajweedIntro: 'الألوان مش للزينة… كل لون بيحكي حكم. تحت هتلاقي الشرح ببساطة ولُطف.',
		tajweedHowTitle: 'إزاي تستخدم الدليل؟',
		tajweedHowBody: 'ألوان التجويد ظاهرة دايمًا. شغّل «تجويد» عشان يظهر شرح الحكم لما تمرّر على الكلمة، أو افتح الدليل للقراءة.',
		tajweedFooter: 'كل ما تقرأ وتتفرّج على الألوان… الأحكام هتتثبت لوحدها من غير حفظ ناشف.',
		errorMode: 'أخطاء',
		errorModeHint: 'فعّل المود، وبعدين اسحب أو اضغط على الكلمة/الكلمات اللي غلطت فيها',
		errorPickTitle: 'نوع الخطأ؟',
		errorTashkeel: 'تشكيل غلط',
		errorForgot: 'مش فاكرها',
		errorRemove: 'إزالة العلامة',
		errorCancel: 'إلغاء',
		errorCountOne: 'غلطة',
		errorCountMany: 'غلطات',
		hidePartsLabel: 'اخفِ جزء من الآية',
		unitsExpand: 'فتح قائمة الأرباع',
		unitsCollapse: 'إغلاق قائمة الأرباع',
	},
	en: {
		title: 'Quran Revision',
		desc: 'Surah · Quarter/Page · Repeat · Reciter · Start',
		surah: 'Surah',
		mode: 'Mode',
		quarter: 'Quarter',
		page: 'Page',
		byQuarterHint: 'Real Hizb quarters',
		byPageHint: 'Mushaf pages',
		hizb: 'Hizb',
		rub1: '(1/4)',
		rub2: '(1/2)',
		rub3: '(3/4)',
		rub4: '(4/4)',
		unitsLoading: 'Loading quarters…',
		pick: 'Pick',
		pickUnits: 'Tap to select one or more · tap again or ✕ to remove',
		deselectUnit: 'Deselect',
		selectedCount: 'selected',
		from: 'From',
		to: 'To',
		repeat: 'Repeat',
		repeatScope: 'Repeat mode',
		repeatAyah: 'Each ayah',
		repeatSelection: 'Whole range',
		repeatAyahHint: 'Repeat each ayah, then move on',
		repeatSelectionHint: 'Play all ayahs, then repeat the range',
		reciter: 'Reciter',
		builtin: 'Reciters',
		youtube: 'YouTube',
		favorites: 'YouTube',
		search: 'Search',
		searching: '…',
		noYt: 'Search or save a link',
		start: 'Start',
		verses: 'Ayahs',
		times: '×',
		newSession: 'New session',
		completed: 'Session complete',
		restart: 'Restart',
		testMemo: 'Memo test',
		reviewed: 'Done',
		duration: 'Time',
		progress: 'Progress',
		follow: 'Follow',
		memo: 'Hide',
		hideStart: 'Start',
		hideMiddle: 'Middle',
		hideEnd: 'End',
		hidePartsHint: 'Pick one or more parts',
		saveReading: 'Save to favorites',
		sessionSettings: 'Session settings',
		changeWhilePlaying: 'Change surah, range, or repeats — then press Apply to start',
		applySettings: 'Apply & start',
		settingsPending: 'Unapplied changes',
		ayah: 'Ayah',
		readingFrom: 'From ayah',
		readingTo: 'to',
		saved: 'Saved',
		addFav: 'Save',
		favUrl: 'Paste YouTube URL…',
		favEmpty: 'No saved videos yet',
		favSaved: 'Saved',
		favLoadingTitle: 'Fetching video title…',
		favDetected: 'Title',
		remove: 'Remove',
		selectFav: 'Select',
		openYt: 'Open',
		loadingAyahs: 'Loading ayahs…',
		audioError: 'Could not play audio — try another reciter',
		playing: 'Playing',
		history: 'History',
		historyTitle: 'My past sessions',
		historyEmpty: 'No saved sessions yet',
		historyClear: 'Clear all',
		historyReplay: 'Replay',
		historyLoad: 'Load',
		historyDelete: 'Delete',
		historyJustNow: 'now',
		historyMins: 'm',
		historyHours: 'h',
		historyDays: 'd',
		favPanelTitle: 'YouTube favorites',
		favFromSession: 'Save from session',
		favAddYoutube: 'Add from YouTube',
		useFav: 'Use',
		ytAudio: 'Data saver',
		ytVideo: 'Normal video',
		ytModeHint: 'No official audio-only embed · Data saver uses lowest quality (144p)',
		ytAskMode: 'Playback quality?',
		ytClear: 'Clear YouTube',
		folderAll: 'All',
		folderPick: 'Folder',
		folderNamePh: 'Folder name…',
		folderAdd: 'Add folder',
		folderNeed: 'Pick a folder first',
		folderEmpty: 'No videos in this folder',
		folderDelete: 'Delete folder',
		folderRename: 'Rename',
		expandMushaf: 'Full screen',
		collapseMushaf: 'Exit full screen',
		tajweed: 'Tajweed',
		tajweedHint: 'Turn on Tajweed to show rule explanations when you hover or tap a colored word',
		tajweedLegend: 'Tajweed color guide',
		tajweedGuide: 'Guide',
		tajweedLegendClose: 'Close',
		tajweedMeaning: 'What does it mean?',
		tajweedWhy: 'How do I apply it?',
		tajweedTip: 'Remember it like this',
		tajweedExample: 'Example',
		tajweedIntro: 'Colors aren’t decoration — each one teaches a rule. Below is a simple, friendly guide.',
		tajweedHowTitle: 'How to use this guide?',
		tajweedHowBody: 'Tajweed colors stay on. Turn on Tajweed for hover explanations, or open the guide to read the rules.',
		tajweedFooter: 'The more you read with colors on, the more the rules stick — without dry memorizing.',
		errorMode: 'Mistakes',
		errorModeHint: 'Turn on, then click or drag across the word(s) you missed',
		errorPickTitle: 'What kind of mistake?',
		errorTashkeel: 'Wrong tashkeel',
		errorForgot: "Don't remember",
		errorRemove: 'Remove mark',
		errorCancel: 'Cancel',
		errorCountOne: 'mistake',
		errorCountMany: 'mistakes',
		hidePartsLabel: 'Hide part of the ayah',
		unitsExpand: 'Show units list',
		unitsCollapse: 'Hide units list',
	},
};

function cx(...a) {
	return a.filter(Boolean).join(' ');
}

function formatTime(sec) {
	const s = Math.max(0, Math.floor(sec || 0));
	return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function dig(value, isAr) {
	const str = String(value);
	if (!isAr) return str;
	return str.replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
}

function relativeTime(ts, t, isAr) {
	const diff = Math.max(0, Date.now() - ts);
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return t.historyJustNow;
	if (mins < 60) return `${dig(mins, isAr)}${t.historyMins}`;
	const hours = Math.floor(mins / 60);
	if (hours < 48) return `${dig(hours, isAr)}${t.historyHours}`;
	return `${dig(Math.floor(hours / 24), isAr)}${t.historyDays}`;
}

function loadJson(key, fallback) {
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return fallback;
		return JSON.parse(raw);
	} catch {
		return fallback;
	}
}

function saveJson(key, value) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		/* ignore */
	}
}

/** Position inside a Hizb: 1=ربع, 2=نصف, 3=ثلاثة أرباع, 4=نهاية */
function rubPosition(hizbQuarter) {
	return ((Number(hizbQuarter) - 1) % 4) + 1;
}

function hizbNumber(hizbQuarter) {
	return Math.ceil(Number(hizbQuarter) / 4);
}

function rubPartLabel(pos, t) {
	if (pos === 1) return t.rub1;
	if (pos === 2) return t.rub2;
	if (pos === 3) return t.rub3;
	return t.rub4;
}

function normalizeUnitIds(ids, maxId = Infinity) {
	const list = Array.isArray(ids) ? ids : [];
	return [...new Set(list.map(Number).filter(n => Number.isFinite(n) && n >= 1 && n <= maxId))]
		.sort((a, b) => a - b);
}

function idsFromRange(from, to) {
	const lo = Math.min(Number(from) || 1, Number(to) || 1);
	const hi = Math.max(Number(from) || 1, Number(to) || 1);
	const out = [];
	for (let i = lo; i <= hi; i += 1) out.push(i);
	return out;
}

/**
 * Build real Mushaf units:
 * - quarter: group by hizbQuarter (ربع الحزب / نصف / ثلاثة أرباع / نهاية)
 * - page: group by Mushaf page number
 */
function buildUnits(ayahBank, mode, t, isAr) {
	if (!ayahBank?.length) return [];

	if (mode === 'page') {
		const byPage = new Map();
		ayahBank.forEach(a => {
			const page = a.page || 0;
			if (!page) return;
			if (!byPage.has(page)) byPage.set(page, []);
			byPage.get(page).push(a);
		});
		return Array.from(byPage.entries())
			.sort((a, b) => a[0] - b[0])
			.map(([page, ayahs], index) => {
				const from = ayahs[0].n;
				const to = ayahs[ayahs.length - 1].n;
				return {
					id: index + 1,
					from,
					to,
					page,
					labelAr: `صفحة ${page}`,
					labelEn: `Page ${page}`,
					subLabelAr: `آيات ${from}–${to}`,
					subLabelEn: `Ayahs ${from}–${to}`,
				};
			});
	}

	// Real rub' (hizbQuarter 1–240)
	const byRub = new Map();
	ayahBank.forEach(a => {
		const hq = a.hizbQuarter;
		if (!hq) return;
		if (!byRub.has(hq)) byRub.set(hq, []);
		byRub.get(hq).push(a);
	});

	return Array.from(byRub.entries())
		.sort((a, b) => a[0] - b[0])
		.map(([hq, ayahs], index) => {
			const from = ayahs[0].n;
			const to = ayahs[ayahs.length - 1].n;
			const hizb = hizbNumber(hq);
			const pos = rubPosition(hq);
			const part = rubPartLabel(pos, t);
			return {
				id: index + 1,
				from,
				to,
				hizbQuarter: hq,
				hizb,
				rubPos: pos,
				labelAr: `${t.hizb} ${hizb} · ${part}`,
				labelEn: `${t.hizb} ${hizb} · ${part}`,
				subLabelAr: `آيات ${from}–${to}`,
				subLabelEn: `Ayahs ${from}–${to}`,
			};
		});
}

/** Hide selected thirds of ayah words for memorization (multi-select). */
function maskText(text, hideParts) {
	const parts = new Set(Array.isArray(hideParts) ? hideParts : hideParts ? [hideParts] : []);
	if (!parts.size) return text;
	const words = String(text || '').trim().split(/\s+/).filter(Boolean);
	if (!words.length) return text;
	if (words.length === 1) return parts.size ? '••••' : text;
	const n = words.length;
	return words.map((w, i) => {
		const bucket = Math.min(2, Math.floor((i * 3) / n));
		const zone = bucket === 0 ? 'start' : bucket === 1 ? 'middle' : 'end';
		return parts.has(zone) ? '••••' : w;
	}).join(' ');
}

function normalizeHideParts(raw, legacyHideMode) {
	if (Array.isArray(raw) && raw.length) {
		return raw.filter(p => p === 'start' || p === 'middle' || p === 'end');
	}
	if (['start', 'middle', 'end'].includes(legacyHideMode)) return [legacyHideMode];
	if (typeof legacyHideMode === 'number') {
		return legacyHideMode >= 3 ? ['end'] : legacyHideMode === 2 ? ['middle'] : ['start'];
	}
	return ['middle'];
}

async function fetchSurahAyahs(surahId) {
	const res = await fetch(
		`https://api.alquran.cloud/v1/surah/${surahId}/editions/quran-uthmani,quran-tajweed`,
	);
	if (!res.ok) throw new Error('fetch failed');
	const json = await res.json();
	const editions = Array.isArray(json?.data) ? json.data : [];
	const uthmani = editions.find(e => e?.edition?.identifier === 'quran-uthmani') || editions[0];
	const tajweedEd = editions.find(e => e?.edition?.identifier === 'quran-tajweed');
	const ayahs = uthmani?.ayahs || [];
	const tajweedAyahs = tajweedEd?.ayahs || [];
	return ayahs.map((a, i) => ({
		n: a.numberInSurah,
		text: String(a.text || '').replace(/^\uFEFF/, ''),
		tajweed: String(tajweedAyahs[i]?.text || '').replace(/^\uFEFF/, ''),
		hizbQuarter: a.hizbQuarter,
		page: a.page,
		juz: a.juz,
	}));
}

function ytThumb(videoId) {
	if (!videoId) return null;
	return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

export default function QuranRevisionStudio({
	quranFontFamily = 'var(--font-qr-uthmani), var(--font-qr-amiri), serif',
} = {}) {
	const locale = useLocale();
	const isAr = locale === 'ar';
	const t = COPY[isAr ? 'ar' : 'en'];
	const d = useCallback(v => dig(v, isAr), [isAr]);

	const [hydrated, setHydrated] = useState(false);
	const [selectedSurahId, setSelectedSurahId] = useState(DEFAULT_PREFS.selectedSurahId);
	const [mode, setMode] = useState(DEFAULT_PREFS.mode);
	const [selectedUnitIds, setSelectedUnitIds] = useState([]);
	const [unitSelections, setUnitSelections] = useState(DEFAULT_PREFS.unitSelections);
	const [repeatCount, setRepeatCount] = useState(DEFAULT_PREFS.repeatCount);
	const [repeatScope, setRepeatScope] = useState(DEFAULT_PREFS.repeatScope);
	const [repeatMenuOpen, setRepeatMenuOpen] = useState(false);
	const [dockBox, setDockBox] = useState({ left: null, width: null });
	const repeatMenuRef = useRef(null);
	const [sourceTab, setSourceTab] = useState(DEFAULT_PREFS.sourceTab);
	const [selectedReciterId, setSelectedReciterId] = useState(DEFAULT_PREFS.selectedReciterId);
	const [selectedFavId, setSelectedFavId] = useState(null);
	const [favorites, setFavorites] = useState([]);
	const [ytFolders, setYtFolders] = useState([]);
	const [folderFilter, setFolderFilter] = useState(FOLDER_FILTER_ALL);
	const [addFolderId, setAddFolderId] = useState('');
	const [folderPickerOpen, setFolderPickerOpen] = useState(false);
	const [folderCreating, setFolderCreating] = useState(false);
	const [newFolderName, setNewFolderName] = useState('');
	const [renameFolderId, setRenameFolderId] = useState('');
	const [renameFolderName, setRenameFolderName] = useState('');
	const folderPickerRef = useRef(null);
	const [favUrl, setFavUrl] = useState('');
	const [resolvedFavTitle, setResolvedFavTitle] = useState('');
	const [favTitleLoading, setFavTitleLoading] = useState(false);
	const [favFlash, setFavFlash] = useState('');
	const [history, setHistory] = useState([]);
	const [historyOpen, setHistoryOpen] = useState(false);
	const [favsOpen, setFavsOpen] = useState(false);
	const [portalReady, setPortalReady] = useState(false);
	const [sessionSettingsOpen, setSessionSettingsOpen] = useState(true);
	const [unitsOpen, setUnitsOpen] = useState(true);

	const [followAlong, setFollowAlong] = useState(true);
	const [showTajweed, setShowTajweed] = useState(DEFAULT_PREFS.showTajweed);
	const [tajweedLegendOpen, setTajweedLegendOpen] = useState(false);
	const [errorMode, setErrorMode] = useState(false);
	/** `${ayahIdx}:${wordIdx}` -> 'tashkeel' | 'forgot' */
	const [wordErrors, setWordErrors] = useState({});
	const [isMemorizationMode, setIsMemorizationMode] = useState(false);
	const [hideParts, setHideParts] = useState(DEFAULT_PREFS.hideParts);
	const [mushafExpanded, setMushafExpanded] = useState(false);
	const [mushafCollapsing, setMushafCollapsing] = useState(false);
	const mushafPanelRef = useRef(null);
	const mushafScrollRef = useRef(null);

	const [ayahBank, setAyahBank] = useState([]);
	const [ayahLoading, setAyahLoading] = useState(false);

	const [sessionPhase, setSessionPhase] = useState('setup');
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
	const [currentVerseRepeat, setCurrentVerseRepeat] = useState(1);
	const [completedVerses, setCompletedVerses] = useState(0);
	const [completedRepeats, setCompletedRepeats] = useState(0);
	const [elapsedSec, setElapsedSec] = useState(0);
	const [verseProgress, setVerseProgress] = useState(0);
	const [audioDuration, setAudioDuration] = useState(0);
	const [volume, setVolume] = useState(0.85);
	const [muted, setMuted] = useState(false);
	const [speed, setSpeed] = useState(1);
	const [ytPlayMode, setYtPlayMode] = useState('audio');
	const [audioError, setAudioError] = useState('');
	const [finalStats, setFinalStats] = useState(null);

	const audioRef = useRef(null);
	const elapsedRef = useRef(null);
	const elapsedSecRef = useRef(0);
	const skipRangeReset = useRef(true);
	const sessionRef = useRef({});
	const sessionPhaseRef = useRef('setup');
	const [settingsPendingApply, setSettingsPendingApply] = useState(false);
	const pendingReciterSwap = useRef(false);
	const pendingSessionRestore = useRef(null);
	const sessionRestoreDone = useRef(false);
	const sessionPersistRef = useRef({});
	const cloudReadyRef = useRef(false);
	const cloudPutRef = useRef(createDebouncedPutter(750));
	const speedRef = useRef(speed);
	const prevSurahModeRef = useRef({ surahId: null, mode: null });
	const unitSelectionsRef = useRef(unitSelections);
	unitSelectionsRef.current = unitSelections;
	speedRef.current = speed;

	useEffect(() => {
		let cancelled = false;

		const applySessionRestore = (savedSession, fallbackSurahId, fallbackMode) => {
			if (savedSession) {
				skipRangeReset.current = true;
				setSelectedSurahId(savedSession.selectedSurahId);
				setMode(savedSession.mode);
				setSelectedUnitIds(savedSession.selectedUnitIds);
				setRepeatCount(savedSession.repeatCount);
				setRepeatScope(savedSession.repeatScope);
				setSourceTab(savedSession.sourceTab);
				setSelectedReciterId(savedSession.selectedReciterId);
				setSelectedFavId(
					savedSession.sourceTab === 'youtube' ? savedSession.selectedFavId : null,
				);
				setMuted(savedSession.muted);
				prevSurahModeRef.current = {
					surahId: savedSession.selectedSurahId,
					mode: savedSession.mode,
				};
				pendingSessionRestore.current = savedSession;
				return;
			}
			prevSurahModeRef.current = { surahId: fallbackSurahId, mode: fallbackMode };
			window.setTimeout(() => { skipRangeReset.current = false; }, 0);
		};

		(async () => {
			const prefs = { ...DEFAULT_PREFS, ...loadJson(LS_PREFS, {}) };
			const surahId = prefs.selectedSurahId;
			const nextMode = prefs.mode;
			setSelectedSurahId(surahId);
			setMode(nextMode);
			const map = prefs.unitSelections && typeof prefs.unitSelections === 'object'
				? prefs.unitSelections
				: {};
			const key = unitSelectionKey(surahId, nextMode);
			const fromMap = Array.isArray(map[key]) ? map[key] : null;
			const legacySelected = Array.isArray(prefs.selectedUnitIds) ? prefs.selectedUnitIds : [];
			const migratedIds = fromMap?.length
				? fromMap
				: (legacySelected.length
					? legacySelected
					: (prefs.rangeFrom != null || prefs.rangeTo != null
						? idsFromRange(prefs.rangeFrom || 1, prefs.rangeTo || 1)
						: []));
			setUnitSelections(map);
			setSelectedUnitIds(normalizeUnitIds(migratedIds));
			setRepeatCount(prefs.repeatCount);
			setRepeatScope(prefs.repeatScope === 'selection' ? 'selection' : 'ayah');
			setSelectedReciterId(prefs.selectedReciterId);
			setFollowAlong(prefs.followAlong);
			setShowTajweed(prefs.showTajweed === true);
			setIsMemorizationMode(prefs.isMemorizationMode);
			setHideParts(normalizeHideParts(prefs.hideParts, prefs.hideMode ?? prefs.memoLevel));
			setVolume(prefs.volume);
			setSpeed(prefs.speed);
			setYtPlayMode(prefs.ytPlayMode === 'video' ? 'video' : 'audio');

			const lsFavs = loadJson(LS_FAVS, []);
			const lsFolders = loadJson(LS_FOLDERS, []);
			const lsHistory = loadJson(LS_HISTORY, []);
			const lsErrors = normalizeWordErrors(loadJson(LS_WORD_ERRORS, {}));
			const lsSession = normalizeSavedSession(loadJson(LS_SESSION, null));
			const localBundle = {
				folders: Array.isArray(lsFolders) ? lsFolders : [],
				favorites: Array.isArray(lsFavs) ? lsFavs.map(f => ({
					...f,
					folderId: f.folderId || null,
				})) : [],
				history: Array.isArray(lsHistory) ? lsHistory : [],
				wordErrors: lsErrors,
				activeSession: lsSession,
			};

			// Offline-first paint from local cache
			setFavorites(localBundle.favorites);
			setYtFolders(localBundle.folders);
			setHistory(localBundle.history);
			setWordErrors(localBundle.wordErrors);
			const prefFav = localBundle.favorites.find(f => f.id === prefs.selectedFavId);
			setSelectedFavId(prefFav?.id || null);
			setSourceTab(prefFav?.videoId ? 'youtube' : 'builtin');

			let cloudSession = null;
			try {
				let cloud = await fetchQuranRevisionState();
				if (cancelled) return;
				if (cloudStateIsEmpty(cloud) && !cloudStateIsEmpty(localBundle)) {
					cloud = await importQuranRevisionState(localBundle);
				}
				if (cancelled) return;
				setFavorites(Array.isArray(cloud.favorites) ? cloud.favorites.map(f => ({
					...f,
					folderId: f.folderId || null,
				})) : []);
				setYtFolders(Array.isArray(cloud.folders) ? cloud.folders : []);
				setHistory(Array.isArray(cloud.history) ? cloud.history : []);
				setWordErrors(normalizeWordErrors(cloud.wordErrors));
				saveJson(LS_FAVS, cloud.favorites || []);
				saveJson(LS_FOLDERS, cloud.folders || []);
				saveJson(LS_HISTORY, cloud.history || []);
				saveJson(LS_WORD_ERRORS, cloud.wordErrors || {});
				cloudSession = normalizeSavedSession(cloud.activeSession);
				if (cloudSession) saveJson(LS_SESSION, cloudSession);
			} catch {
				/* keep local cache when API unavailable */
			}

			if (cancelled) return;
			cloudReadyRef.current = true;
			applySessionRestore(cloudSession || lsSession, surahId, nextMode);
			setHydrated(true);
			setPortalReady(true);
		})();

		return () => {
			cancelled = true;
			cloudPutRef.current.flush();
		};
	}, []);

	useEffect(() => {
		if (!hydrated) return;
		saveJson(LS_PREFS, {
			selectedSurahId, mode, selectedUnitIds, unitSelections,
			repeatCount, repeatScope, sourceTab,
			selectedReciterId, selectedFavId, followAlong, showTajweed, isMemorizationMode,
			hideParts, volume, speed, ytPlayMode,
		});
	}, [
		hydrated, selectedSurahId, mode, selectedUnitIds, unitSelections,
		repeatCount, repeatScope, sourceTab,
		selectedReciterId, selectedFavId, followAlong, showTajweed, isMemorizationMode,
		hideParts, volume, speed, ytPlayMode,
	]);

	useEffect(() => {
		if (!hydrated) return;
		saveJson(LS_FAVS, favorites);
		if (!cloudReadyRef.current) return;
		cloudPutRef.current.schedule('favorites', () => ({ favorites }));
	}, [hydrated, favorites]);

	useEffect(() => {
		if (!hydrated) return;
		saveJson(LS_FOLDERS, ytFolders);
		if (!cloudReadyRef.current) return;
		cloudPutRef.current.schedule('folders', () => ({ folders: ytFolders }));
	}, [hydrated, ytFolders]);

	useEffect(() => {
		if (!hydrated) return;
		saveJson(LS_HISTORY, history);
		if (!cloudReadyRef.current) return;
		cloudPutRef.current.schedule('history', () => ({ history }));
	}, [hydrated, history]);

	useEffect(() => {
		if (!hydrated) return;
		saveJson(LS_WORD_ERRORS, wordErrors);
		if (!cloudReadyRef.current) return;
		cloudPutRef.current.schedule('wordErrors', () => ({ wordErrors }));
	}, [hydrated, wordErrors]);

	const selectedSurah = useMemo(
		() => SURAHS.find(s => s.id === selectedSurahId) || SURAHS[0],
		[selectedSurahId],
	);

	const units = useMemo(
		() => buildUnits(ayahBank, mode, t, isAr),
		[ayahBank, mode, t, isAr],
	);
	const selectedReciter = useMemo(
		() => BUILTIN_RECITERS.find(r => r.id === selectedReciterId) || BUILTIN_RECITERS[0],
		[selectedReciterId],
	);
	const selectedFav = favorites.find(f => f.id === selectedFavId) || null;

	const folderById = useMemo(() => {
		const map = new Map();
		ytFolders.forEach(f => map.set(f.id, f));
		return map;
	}, [ytFolders]);

	const filteredFavorites = useMemo(() => {
		if (folderFilter === FOLDER_FILTER_ALL) return favorites;
		return favorites.filter(f => f.folderId === folderFilter);
	}, [favorites, folderFilter]);

	const folderCounts = useMemo(() => {
		const counts = { [FOLDER_FILTER_ALL]: favorites.length };
		ytFolders.forEach(f => { counts[f.id] = 0; });
		favorites.forEach(f => {
			if (f.folderId && counts[f.folderId] != null) counts[f.folderId] += 1;
		});
		return counts;
	}, [favorites, ytFolders]);

	const selectedAddFolder = addFolderId && folderById.get(addFolderId)
		? folderById.get(addFolderId)
		: null;

	// Clamp / restore unit picks when surah or mode changes — wait for hydrate
	// so the default [1] never races ahead of the user's saved selection.
	useEffect(() => {
		if (!hydrated || !units.length) return;
		const maxId = units[units.length - 1].id;
		const key = unitSelectionKey(selectedSurahId, mode);
		const prev = prevSurahModeRef.current;
		const surahOrModeChanged = prev.surahId != null
			&& (prev.surahId !== selectedSurahId || prev.mode !== mode);
		prevSurahModeRef.current = { surahId: selectedSurahId, mode };

		if (surahOrModeChanged && !skipRangeReset.current) {
			const saved = unitSelectionsRef.current[key];
			const next = normalizeUnitIds(saved, maxId);
			// Default to first unit only when this surah/mode has no saved pick
			setSelectedUnitIds(next.length ? next : [1]);
			return;
		}

		setSelectedUnitIds(prevIds => {
			const next = normalizeUnitIds(prevIds, maxId);
			if (next.length) return next;
			const saved = normalizeUnitIds(unitSelectionsRef.current[key], maxId);
			if (saved.length) return saved;
			// First visit / nothing chosen → default first unit
			return [1];
		});
	}, [hydrated, selectedSurahId, mode, units.length]); // eslint-disable-line react-hooks/exhaustive-deps

	// Persist current multi-select under surah+mode key
	useEffect(() => {
		if (!hydrated) return;
		const key = unitSelectionKey(selectedSurahId, mode);
		setUnitSelections(prev => {
			const same = Array.isArray(prev[key])
				&& prev[key].length === selectedUnitIds.length
				&& prev[key].every((id, i) => id === selectedUnitIds[i]);
			if (same) return prev;
			// Allow persisting [] so a cleared selection isn't revived as [1] via stale map
			return { ...prev, [key]: selectedUnitIds };
		});
	}, [hydrated, selectedSurahId, mode, selectedUnitIds]);

	useEffect(() => {
		if (!repeatMenuOpen) return undefined;
		const onDoc = e => {
			if (repeatMenuRef.current && !repeatMenuRef.current.contains(e.target)) {
				setRepeatMenuOpen(false);
			}
		};
		const onKey = e => { if (e.key === 'Escape') setRepeatMenuOpen(false); };
		document.addEventListener('mousedown', onDoc);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDoc);
			document.removeEventListener('keydown', onKey);
		};
	}, [repeatMenuOpen]);

	// Center floating dock in the main content area (exclude sidebar)
	useEffect(() => {
		if (sessionPhase !== 'active' || !portalReady) return undefined;
		const host = document.querySelector('[data-dashboard-content]');
		if (!host) return undefined;

		const update = () => {
			/* Phone: CSS centers the dock full-bleed — skip measured box (avoids RTL scrollbar offset) */
			if (window.matchMedia('(max-width: 640px)').matches) {
				setDockBox({ left: null, width: null });
				return;
			}
			const r = host.getBoundingClientRect();
			const pad = 12;
			const width = Math.min(760, Math.max(280, r.width - pad * 2));
			setDockBox({
				left: r.left + r.width / 2,
				width,
			});
		};

		update();
		const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
		ro?.observe(host);
		window.addEventListener('resize', update);
		window.addEventListener('orientationchange', update);
		return () => {
			ro?.disconnect();
			window.removeEventListener('resize', update);
			window.removeEventListener('orientationchange', update);
		};
	}, [sessionPhase, portalReady]);

	/* Clear any leftover reading-lock from older builds */
	useEffect(() => {
		delete document.documentElement.dataset.qrReading;
	}, []);

	// Load real ayah text + hizbQuarter + page from Mushaf API
	useEffect(() => {
		let cancelled = false;
		setAyahLoading(true);
		setAyahBank([]);
		fetchSurahAyahs(selectedSurahId)
			.then(list => { if (!cancelled) setAyahBank(list); })
			.catch(() => {
				if (!cancelled) {
					setAyahBank(
						Array.from({ length: selectedSurah.versesCount }, (_, i) => ({
							n: i + 1,
							text: isAr ? `﴿ آية ${i + 1} ﴾` : `[Ayah ${i + 1}]`,
							tajweed: '',
							hizbQuarter: null,
							page: null,
						})),
					);
				}
			})
			.finally(() => { if (!cancelled) setAyahLoading(false); });
		return () => { cancelled = true; };
	}, [selectedSurahId, selectedSurah.versesCount, isAr]);

	const selectedUnits = useMemo(
		() => normalizeUnitIds(selectedUnitIds)
			.map(id => units.find(u => u.id === id))
			.filter(Boolean),
		[selectedUnitIds, units],
	);
	const fromUnit = selectedUnits[0] || null;
	const toUnit = selectedUnits[selectedUnits.length - 1] || null;
	const ayahFrom = fromUnit?.from || 1;
	const ayahTo = toUnit?.to || 1;

	const verses = useMemo(() => {
		const list = [];
		selectedUnits.forEach(unit => {
			const chunk = ayahBank.filter(v => v.n >= unit.from && v.n <= unit.to);
			if (chunk.length) {
				list.push(...chunk);
				return;
			}
			for (let n = unit.from; n <= unit.to; n += 1) {
				list.push({ n, text: isAr ? `﴿ آية ${n} ﴾` : `[Ayah ${n}]` });
			}
		});
		return list;
	}, [ayahBank, selectedUnits, isAr]);

	const targetRepeats = verses.length * repeatCount;

	const displayReciter = useMemo(() => {
		if (sourceTab === 'youtube' && selectedFav) return selectedFav.title;
		return isAr ? selectedReciter.nameAr : selectedReciter.nameEn;
	}, [sourceTab, selectedFav, selectedReciter, isAr]);

	const usingYoutube = sourceTab !== 'builtin' && !!selectedFav?.videoId;
	const canStart = units.length > 0 && selectedUnits.length > 0 && (
		(sourceTab === 'builtin' && !!selectedReciterId)
		|| usingYoutube
	);

	const surahOptions = useMemo(
		() => SURAHS.map(s => ({
			id: s.id,
			label: `${dig(s.id, isAr)}. ${isAr ? s.nameAr : s.nameEn}`,
		})),
		[isAr],
	);

	sessionPhaseRef.current = sessionPhase;

	/** Mark live settings dirty — do NOT auto-restart until Apply/Start. */
	const markSettingsDirty = useCallback(() => {
		if (sessionPhaseRef.current !== 'active') return;
		setSettingsPendingApply(true);
		const el = audioRef.current;
		if (el) {
			try { el.pause(); } catch { /* */ }
		}
		setIsPlaying(false);
	}, []);

	const toggleUnit = id => {
		setSelectedUnitIds(prev => {
			if (prev.includes(id)) {
				const next = prev.filter(x => x !== id);
				return next.length ? normalizeUnitIds(next) : [];
			}
			return normalizeUnitIds([...prev, id]);
		});
		markSettingsDirty();
	};

	const removeUnit = (e, id) => {
		e.stopPropagation();
		setSelectedUnitIds(prev => prev.filter(x => x !== id));
		markSettingsDirty();
	};

	const stopElapsed = useCallback(() => {
		if (elapsedRef.current) clearInterval(elapsedRef.current);
		elapsedRef.current = null;
	}, []);

	const stopAudio = useCallback(() => {
		const el = audioRef.current;
		if (el) {
			el.onended = null;
			el.ontimeupdate = null;
			el.onloadedmetadata = null;
			el.onerror = null;
			try { el.pause(); } catch { /* */ }
			el.removeAttribute('src');
			try { el.load(); } catch { /* */ }
		}
		stopQuranBg();
		stopElapsed();
	}, [stopElapsed]);

	const pushHistory = useCallback((entry) => {
		setHistory(prev => [entry, ...prev].slice(0, HISTORY_MAX));
	}, []);

	useEffect(() => {
		elapsedSecRef.current = elapsedSec;
	}, [elapsedSec]);

	const finishSession = useCallback((totalRepeats) => {
		stopAudio();
		setIsPlaying(false);
		setMushafExpanded(false);
		setMushafCollapsing(false);
		setSessionPhase('completed');
		const duration = elapsedSecRef.current;
		const reciter = BUILTIN_RECITERS.find(r => r.id === selectedReciterId);
		const reciterLabel = sourceTab === 'builtin'
			? (isAr ? reciter?.nameAr : reciter?.nameEn)
			: (favorites.find(f => f.id === selectedFavId)?.title || 'YouTube');
		setFinalStats({
			surah: selectedSurah,
			from: ayahFrom,
			to: ayahTo,
			repeats: totalRepeats,
			duration,
		});
		pushHistory({
			id: `sess_${Date.now()}`,
			at: Date.now(),
			surahId: selectedSurah.id,
			surahNameAr: selectedSurah.nameAr,
			surahNameEn: selectedSurah.nameEn,
			mode,
			selectedUnitIds: selectedUnits.map(u => u.id),
			rangeFrom: selectedUnits[0]?.id || 1,
			rangeTo: selectedUnits[selectedUnits.length - 1]?.id || 1,
			ayahFrom,
			ayahTo,
			repeatCount,
			sourceTab,
			reciterId: selectedReciterId,
			reciterLabel: reciterLabel || '',
			favId: selectedFavId,
			repeats: totalRepeats,
			duration,
		});
	}, [
		stopAudio, selectedSurah, ayahFrom, ayahTo, pushHistory,
		mode, selectedUnits, repeatCount, sourceTab, selectedReciterId,
		selectedFavId, favorites, isAr,
	]);

	// Keep session ref fresh for audio callbacks + bg handoff
	sessionRef.current = {
		verses,
		repeatCount,
		repeatScope,
		currentVerseIndex,
		currentVerseRepeat,
		completedRepeats,
		finishSession,
		selectedSurahId,
		selectedSurah,
		selectedReciter,
		usingYoutube,
		volume,
		muted,
	};

	const playCurrentAyah = useCallback((verseIndex, verseRepeat, repeatsDone, opts = {}) => {
		const {
			verses: vs,
			selectedSurahId: sid,
			selectedReciter: rec,
			usingYoutube: yt,
			repeatCount: reps,
			repeatScope: scope,
		} = sessionRef.current;
		if (yt || !vs[verseIndex]) return;

		const ayah = vs[verseIndex];
		const url = ayahAudioUrl(rec.folder, sid, ayah.n);
		const el = audioRef.current;
		if (!el) return;

		const seekRatio = typeof opts.seekRatio === 'number' ? opts.seekRatio : 0;
		const shouldPlay = opts.autoplay !== false;

		setAudioError('');
		el.pause();
		el.src = url;
		el.volume = muted ? 0 : volume;
		el.load();

		const applyRate = () => {
			try { el.playbackRate = speedRef.current; } catch { /* ignore */ }
		};

		el.onloadedmetadata = () => {
			applyRate();
			setAudioDuration(el.duration || 0);
			if (seekRatio > 0.02 && seekRatio < 0.98 && el.duration) {
				try { el.currentTime = el.duration * seekRatio; } catch { /* ignore */ }
			}
		};
		el.oncanplay = () => applyRate();
		el.ontimeupdate = () => {
			if (!el.duration) return;
			setVerseProgress((el.currentTime / el.duration) * 100);
		};
		el.onerror = () => setAudioError(t.audioError);
		el.onended = () => {
			const nextRepeats = repeatsDone + 1;
			setCompletedRepeats(nextRepeats);
			const totalVerses = sessionRef.current.verses.length;

			// Whole selection: A1→A2→… then restart the range
			if (scope === 'selection') {
				const nextIndex = verseIndex + 1;
				if (nextIndex < totalVerses) {
					setCompletedVerses(c => Math.max(c, nextIndex));
					setCurrentVerseIndex(nextIndex);
					setVerseProgress(0);
					playCurrentAyah(nextIndex, verseRepeat, nextRepeats);
					return;
				}
				if (verseRepeat < reps) {
					const nextPass = verseRepeat + 1;
					setCurrentVerseRepeat(nextPass);
					setCurrentVerseIndex(0);
					setCompletedVerses(0);
					setVerseProgress(0);
					playCurrentAyah(0, nextPass, nextRepeats);
					return;
				}
				setCompletedVerses(totalVerses);
				sessionRef.current.finishSession(nextRepeats);
				return;
			}

			// Each ayah: A1 A1 A1 → A2 A2 A2 …
			if (verseRepeat < reps) {
				const nr = verseRepeat + 1;
				setCurrentVerseRepeat(nr);
				playCurrentAyah(verseIndex, nr, nextRepeats);
				return;
			}

			const nextIndex = verseIndex + 1;
			if (nextIndex < totalVerses) {
				setCompletedVerses(c => Math.max(c, nextIndex));
				setCurrentVerseIndex(nextIndex);
				setCurrentVerseRepeat(1);
				setVerseProgress(0);
				playCurrentAyah(nextIndex, 1, nextRepeats);
				return;
			}

			setCompletedVerses(totalVerses);
			sessionRef.current.finishSession(nextRepeats);
		};

		applyRate();
		if (shouldPlay) {
			const p = el.play();
			if (p?.catch) p.catch(() => setAudioError(t.audioError));
			setIsPlaying(true);
		} else {
			setIsPlaying(false);
		}
	}, [muted, volume, t.audioError]);

	useEffect(() => {
		const el = audioRef.current;
		if (!el) return;
		el.volume = muted ? 0 : volume;
		try { el.playbackRate = speed; } catch { /* ignore */ }
	}, [volume, muted, speed]);

	// Mounted on revision page → hide mini bar. On leave, hand off builtin audio to bg player.
	useEffect(() => {
		setQuranStudioMounted(true);
		reclaimQuranBg();
		return () => {
			setQuranStudioMounted(false);
			const el = audioRef.current;
			const sess = sessionRef.current || {};
			const shouldHandoff =
				sessionPhaseRef.current === 'active' &&
				!sess.usingYoutube &&
				el &&
				el.src &&
				!el.paused;
			if (shouldHandoff) {
				handoffQuranBg(el, {
					surahId: sess.selectedSurahId,
					surahNameAr: sess.selectedSurah?.nameAr,
					surahNameEn: sess.selectedSurah?.nameEn,
					verses: sess.verses || [],
					verseIndex: sess.currentVerseIndex ?? 0,
					verseRepeat: sess.currentVerseRepeat ?? 1,
					completedRepeats: sess.completedRepeats ?? 0,
					repeatCount: sess.repeatCount,
					repeatScope: sess.repeatScope,
					reciterId: sess.selectedReciter?.id,
					volume: sess.volume,
					muted: sess.muted,
					ayahN: (sess.verses || [])[sess.currentVerseIndex ?? 0]?.n,
				});
				return;
			}
			stopAudio();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps -- handoff only on unmount
	}, []);

	useEffect(() => {
		if (!historyOpen && !favsOpen) return undefined;
		const onKey = e => {
			if (e.key === 'Escape') {
				setHistoryOpen(false);
				setFavsOpen(false);
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [historyOpen, favsOpen]);

	const startSession = () => {
		if (!canStart) return;
		setSettingsPendingApply(false);
		stopAudio();
		setSessionPhase('active');
		/* Collapse session settings so reading stays in focus */
		setSessionSettingsOpen(false);
		setCurrentVerseIndex(0);
		setCurrentVerseRepeat(1);
		setCompletedVerses(0);
		setCompletedRepeats(0);
		setElapsedSec(0);
		setVerseProgress(0);
		setAudioDuration(0);
		setFinalStats(null);
		setAudioError('');
		setErrorMode(false);
		stopElapsed();
		elapsedRef.current = setInterval(() => setElapsedSec(s => s + 1), 1000);

		if (usingYoutube) {
			setIsPlaying(true);
			return;
		}
		playCurrentAyah(0, 1, 0);
	};

	/** Apply edited live settings and (re)start playback — only on explicit click. */
	const applyLiveSettings = () => {
		if (!canStart || !verses.length) return;
		if (ayahLoading) return;
		setSettingsPendingApply(false);
		stopAudio();
		setCurrentVerseIndex(0);
		setCurrentVerseRepeat(1);
		setCompletedVerses(0);
		setCompletedRepeats(0);
		setVerseProgress(0);
		setAudioError('');
		if (!elapsedRef.current) {
			elapsedRef.current = setInterval(() => setElapsedSec(s => s + 1), 1000);
		}
		if (usingYoutube) {
			setIsPlaying(true);
			return;
		}
		playCurrentAyah(0, 1, 0);
	};

	// Resume a saved session after refresh / leaving the page (not on New Session)
	useEffect(() => {
		if (!hydrated || sessionRestoreDone.current) return;
		const saved = pendingSessionRestore.current;
		if (!saved) {
			sessionRestoreDone.current = true;
			return;
		}
		if (ayahLoading || !units.length) return;

		if (!canStart || !verses.length) {
			pendingSessionRestore.current = null;
			sessionRestoreDone.current = true;
			clearSavedSession();
			skipRangeReset.current = false;
			return;
		}

		pendingSessionRestore.current = null;
		sessionRestoreDone.current = true;
		setSettingsPendingApply(false);
		pendingReciterSwap.current = false;

		const maxIdx = Math.max(0, verses.length - 1);
		const idx = Math.min(Math.max(0, saved.currentVerseIndex), maxIdx);
		const verseRepeat = saved.currentVerseRepeat;
		const doneRepeats = saved.completedRepeats;
		const progress = saved.verseProgress;
		const elapsed = saved.elapsedSec;

		setCurrentVerseIndex(idx);
		setCurrentVerseRepeat(verseRepeat);
		setCompletedVerses(Math.min(saved.completedVerses, verses.length));
		setCompletedRepeats(doneRepeats);
		setVerseProgress(progress);
		setElapsedSec(elapsed);
		setAudioError('');
		setErrorMode(false);
		setIsPlaying(false);
		setSessionSettingsOpen(false);
		setMushafExpanded(false);
		setMushafCollapsing(false);

		if (saved.sessionPhase === 'completed') {
			setFinalStats(saved.finalStats);
			setSessionPhase('completed');
			skipRangeReset.current = false;
			return;
		}

		setFinalStats(null);
		setSessionPhase('active');
		stopAudio();
		setElapsedSec(elapsed);
		elapsedRef.current = setInterval(() => setElapsedSec(s => s + 1), 1000);

		if (!usingYoutube) {
			playCurrentAyah(idx, verseRepeat, doneRepeats, {
				seekRatio: progress / 100,
				autoplay: false,
			});
		}

		requestAnimationFrame(() => { skipRangeReset.current = false; });
	}, [
		hydrated, ayahLoading, units.length, canStart, verses, usingYoutube,
		playCurrentAyah, stopAudio,
	]);

	// Keep active/completed session snapshot so refresh restores progress
	sessionPersistRef.current = {
		sessionPhase,
		selectedSurahId,
		mode,
		selectedUnitIds,
		repeatCount,
		repeatScope,
		sourceTab,
		selectedReciterId,
		selectedFavId,
		currentVerseIndex,
		currentVerseRepeat,
		completedVerses,
		completedRepeats,
		elapsedSec,
		verseProgress,
		muted,
		finalStats,
		audioRef,
	};

	useEffect(() => {
		if (!hydrated || !sessionRestoreDone.current) return;
		if (sessionPhase !== 'active' && sessionPhase !== 'completed') return;

		const el = audioRef.current;
		let progress = verseProgress;
		if (sessionPhase === 'active' && el?.duration > 0) {
			progress = (el.currentTime / el.duration) * 100;
		}

		const blob = {
			v: 1,
			updatedAt: Date.now(),
			sessionPhase,
			selectedSurahId,
			mode,
			selectedUnitIds,
			repeatCount,
			repeatScope,
			sourceTab,
			selectedReciterId,
			selectedFavId,
			currentVerseIndex,
			currentVerseRepeat,
			completedVerses,
			completedRepeats,
			elapsedSec,
			verseProgress: progress,
			muted,
			finalStats: sessionPhase === 'completed' ? finalStats : null,
		};
		saveJson(LS_SESSION, blob);
		if (cloudReadyRef.current) {
			cloudPutRef.current.schedule('activeSession', () => ({ activeSession: blob }));
		}
	}, [
		hydrated, sessionPhase, selectedSurahId, mode, selectedUnitIds,
		repeatCount, repeatScope, sourceTab, selectedReciterId, selectedFavId,
		currentVerseIndex, currentVerseRepeat, completedVerses, completedRepeats,
		elapsedSec, verseProgress, muted, finalStats,
	]);

	useEffect(() => {
		const flush = () => {
			if (!sessionRestoreDone.current) return;
			const s = sessionPersistRef.current;
			if (s.sessionPhase !== 'active' && s.sessionPhase !== 'completed') return;
			const el = s.audioRef?.current;
			let progress = s.verseProgress;
			if (s.sessionPhase === 'active' && el?.duration > 0) {
				progress = (el.currentTime / el.duration) * 100;
			}
			const blob = {
				v: 1,
				updatedAt: Date.now(),
				sessionPhase: s.sessionPhase,
				selectedSurahId: s.selectedSurahId,
				mode: s.mode,
				selectedUnitIds: s.selectedUnitIds,
				repeatCount: s.repeatCount,
				repeatScope: s.repeatScope,
				sourceTab: s.sourceTab,
				selectedReciterId: s.selectedReciterId,
				selectedFavId: s.selectedFavId,
				currentVerseIndex: s.currentVerseIndex,
				currentVerseRepeat: s.currentVerseRepeat,
				completedVerses: s.completedVerses,
				completedRepeats: s.completedRepeats,
				elapsedSec: s.elapsedSec,
				verseProgress: progress,
				muted: s.muted,
				finalStats: s.sessionPhase === 'completed' ? s.finalStats : null,
			};
			saveJson(LS_SESSION, blob);
			cloudPutRef.current.schedule('activeSession', () => ({ activeSession: blob }));
			cloudPutRef.current.flush();
		};
		window.addEventListener('pagehide', flush);
		window.addEventListener('beforeunload', flush);
		return () => {
			window.removeEventListener('pagehide', flush);
			window.removeEventListener('beforeunload', flush);
		};
	}, []);

	const errorLabels = useMemo(() => ({
		title: t.errorPickTitle,
		tashkeel: t.errorTashkeel,
		forgot: t.errorForgot,
		remove: t.errorRemove,
		cancel: t.errorCancel,
	}), [t.errorPickTitle, t.errorTashkeel, t.errorForgot, t.errorRemove, t.errorCancel]);

	const marksByAyahNumber = useMemo(() => {
		const map = {};
		const prefix = `${selectedSurahId}:`;
		Object.entries(wordErrors).forEach(([key, type]) => {
			if (!key.startsWith(prefix)) return;
			const rest = key.slice(prefix.length);
			const sep = rest.indexOf(':');
			if (sep < 0) return;
			const ayahNumber = Number(rest.slice(0, sep));
			const wordIdx = Number(rest.slice(sep + 1));
			if (!Number.isInteger(ayahNumber) || !Number.isInteger(wordIdx)) return;
			if (!map[ayahNumber]) map[ayahNumber] = {};
			map[ayahNumber][wordIdx] = type;
		});
		return map;
	}, [wordErrors, selectedSurahId]);

	const errorCountInView = useMemo(() => {
		if (!verses.length) return 0;
		const ayahNums = new Set(verses.map(v => v.n));
		const prefix = `${selectedSurahId}:`;
		let count = 0;
		Object.keys(wordErrors).forEach((key) => {
			if (!key.startsWith(prefix)) return;
			const rest = key.slice(prefix.length);
			const sep = rest.indexOf(':');
			if (sep < 0) return;
			const ayahNumber = Number(rest.slice(0, sep));
			if (ayahNums.has(ayahNumber)) count += 1;
		});
		return count;
	}, [wordErrors, verses, selectedSurahId]);

	const setMarksForAyah = useCallback((ayahNumber, wordIndexes, type) => {
		setWordErrors((prev) => {
			const next = { ...prev };
			wordIndexes.forEach((wordIdx) => {
				const key = wordErrorKey(selectedSurahId, ayahNumber, wordIdx);
				if (type) next[key] = type;
				else delete next[key];
			});
			return next;
		});
	}, [selectedSurahId]);

	const changeSurahLive = id => {
		if (id == null) return;
		setSelectedSurahId(Number(id));
		markSettingsDirty();
	};

	const changeModeLive = id => {
		if (id == null) return;
		setMode(id);
		markSettingsDirty();
	};

	const changeReciterLive = id => {
		if (id == null) return;
		setSelectedReciterId(id);
		if (sourceTab !== 'builtin') {
			setSelectedFavId(null);
			setSourceTab('builtin');
		}
		// Keep current ayah / progress — do not restart the rub'
		if (sessionPhaseRef.current === 'active') {
			pendingReciterSwap.current = true;
		}
	};

	const toggleHidePart = part => {
		setHideParts(prev => (
			prev.includes(part) ? prev.filter(p => p !== part) : [...prev, part]
		));
	};

	// Soft-swap reciter audio at the same verse (+ approximate timestamp)
	useEffect(() => {
		if (!pendingReciterSwap.current) return;
		if (sessionPhase !== 'active' || usingYoutube) {
			pendingReciterSwap.current = false;
			return;
		}
		pendingReciterSwap.current = false;
		const el = audioRef.current;
		const ratio = el?.duration > 0
			? el.currentTime / el.duration
			: (verseProgress / 100);
		const wasPlaying = Boolean(isPlaying);
		playCurrentAyah(currentVerseIndex, currentVerseRepeat, completedRepeats, {
			seekRatio: ratio,
			autoplay: wasPlaying,
		});
	}, [
		selectedReciterId, sessionPhase, usingYoutube,
		currentVerseIndex, currentVerseRepeat, completedRepeats,
		verseProgress, isPlaying, playCurrentAyah,
	]);

	const changeRepeatScope = scope => {
		if (scope !== 'ayah' && scope !== 'selection') return;
		setRepeatScope(scope);
		markSettingsDirty();
	};

	const resetSetup = () => {
		stopAudio();
		clearSavedSession();
		pendingSessionRestore.current = null;
		sessionRestoreDone.current = true;
		setSettingsPendingApply(false);
		if (cloudReadyRef.current) {
			cloudPutRef.current.schedule('activeSession', () => ({ activeSession: null }));
		}
		setSessionPhase('setup');
		setIsPlaying(false);
		setMushafExpanded(false);
		setMushafCollapsing(false);
		setCurrentVerseIndex(0);
		setCurrentVerseRepeat(1);
		setCompletedVerses(0);
		setCompletedRepeats(0);
		setElapsedSec(0);
		setVerseProgress(0);
		setFinalStats(null);
		setAudioError('');
		setErrorMode(false);
	};

	const openMushafExpanded = useCallback(() => {
		setMushafCollapsing(false);
		setMushafExpanded(true);
	}, []);

	const closeMushafExpanded = useCallback((immediate = false) => {
		if (!mushafExpanded) {
			setMushafCollapsing(false);
			return;
		}
		if (immediate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			setMushafExpanded(false);
			setMushafCollapsing(false);
			return;
		}
		setMushafCollapsing(true);
	}, [mushafExpanded]);

	const toggleMushafExpanded = useCallback(() => {
		if (mushafExpanded && !mushafCollapsing) closeMushafExpanded();
		else if (!mushafExpanded) openMushafExpanded();
	}, [mushafExpanded, mushafCollapsing, closeMushafExpanded, openMushafExpanded]);

	const onMushafExpandAnimEnd = useCallback((e) => {
		if (e.target !== mushafPanelRef.current) return;
		if (e.animationName !== 'qrMushafExpandOut') return;
		setMushafExpanded(false);
		setMushafCollapsing(false);
	}, []);

	useEffect(() => {
		if (!mushafExpanded) return undefined;
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		const onKey = (e) => {
			if (e.key === 'Escape') closeMushafExpanded();
		};
		window.addEventListener('keydown', onKey);
		return () => {
			document.body.style.overflow = prev;
			window.removeEventListener('keydown', onKey);
		};
	}, [mushafExpanded, closeMushafExpanded]);

	/* Follow-along: keep the active ayah in view (page/#body scroll) */
	useEffect(() => {
		if (!followAlong || sessionPhase !== 'active') return;
		const root = mushafScrollRef.current;
		if (!root) return;
		const ayah = root.querySelector(`[data-ayah-idx="${currentVerseIndex}"]`);
		if (!ayah) return;
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const id = window.requestAnimationFrame(() => {
			ayah.scrollIntoView({
				block: 'center',
				inline: 'nearest',
				behavior: reduce ? 'auto' : 'smooth',
			});
		});
		return () => window.cancelAnimationFrame(id);
	}, [currentVerseIndex, followAlong, sessionPhase, mushafExpanded, verses.length]);

	const togglePlay = () => {
		if (usingYoutube) {
			setIsPlaying(p => !p);
			return;
		}
		const el = audioRef.current;
		if (!el?.src) {
			playCurrentAyah(currentVerseIndex, currentVerseRepeat, completedRepeats);
			return;
		}
		if (el.paused) {
			el.play()?.catch(() => setAudioError(t.audioError));
			setIsPlaying(true);
		} else {
			el.pause();
			setIsPlaying(false);
		}
	};

	const goPrev = () => {
		if (usingYoutube) return;
		const idx = Math.max(0, currentVerseIndex - 1);
		const pass = repeatScope === 'selection' ? currentVerseRepeat : 1;
		setCurrentVerseIndex(idx);
		setCurrentVerseRepeat(pass);
		setVerseProgress(0);
		playCurrentAyah(idx, pass, completedRepeats);
	};

	const goNext = () => {
		if (usingYoutube) return;
		if (currentVerseIndex >= verses.length - 1) {
			if (repeatScope === 'selection' && currentVerseRepeat < repeatCount) {
				const nextPass = currentVerseRepeat + 1;
				setCurrentVerseRepeat(nextPass);
				setCurrentVerseIndex(0);
				setCompletedVerses(0);
				setVerseProgress(0);
				playCurrentAyah(0, nextPass, completedRepeats);
				return;
			}
			finishSession(completedRepeats + 1);
			return;
		}
		const idx = currentVerseIndex + 1;
		const pass = repeatScope === 'selection' ? currentVerseRepeat : 1;
		setCompletedVerses(c => Math.max(c, idx));
		setCurrentVerseIndex(idx);
		setCurrentVerseRepeat(pass);
		setVerseProgress(0);
		playCurrentAyah(idx, pass, completedRepeats);
	};

	// Auto-resolve YouTube title when URL is pasted
	useEffect(() => {
		const videoId = extractYoutubeId(favUrl);
		if (!videoId) {
			setResolvedFavTitle('');
			setFavTitleLoading(false);
			return undefined;
		}
		let cancelled = false;
		setFavTitleLoading(true);
		const timer = window.setTimeout(() => {
			fetchYoutubeTitle(videoId)
				.then(title => {
					if (cancelled) return;
					setResolvedFavTitle(title || (isAr ? `تلاوة ${videoId}` : `Recitation ${videoId}`));
				})
				.finally(() => {
					if (!cancelled) setFavTitleLoading(false);
				});
		}, 350);
		return () => {
			cancelled = true;
			window.clearTimeout(timer);
		};
	}, [favUrl, isAr]);

	const createFolder = () => {
		const name = newFolderName.trim();
		if (!name) return;
		const folder = {
			id: `folder_${Date.now()}`,
			name: name.slice(0, 48),
			createdAt: Date.now(),
		};
		setYtFolders(prev => [folder, ...prev]);
		setNewFolderName('');
		setFolderCreating(false);
		setAddFolderId(folder.id);
		setFolderFilter(folder.id);
		setFolderPickerOpen(false);
	};

	useEffect(() => {
		if (!folderPickerOpen) return undefined;
		const onDoc = e => {
			if (folderPickerRef.current && !folderPickerRef.current.contains(e.target)) {
				setFolderPickerOpen(false);
				setFolderCreating(false);
				setNewFolderName('');
			}
		};
		document.addEventListener('mousedown', onDoc);
		return () => document.removeEventListener('mousedown', onDoc);
	}, [folderPickerOpen]);

	const deleteFolder = folderId => {
		setYtFolders(prev => prev.filter(f => f.id !== folderId));
		setFavorites(prev => prev.filter(f => f.folderId !== folderId));
		if (folderFilter === folderId) setFolderFilter(FOLDER_FILTER_ALL);
		if (addFolderId === folderId) setAddFolderId('');
		if (renameFolderId === folderId) {
			setRenameFolderId('');
			setRenameFolderName('');
		}
	};

	const startRenameFolder = folder => {
		setRenameFolderId(folder.id);
		setRenameFolderName(folder.name);
		setFolderFilter(folder.id);
	};

	const commitRenameFolder = () => {
		const name = renameFolderName.trim().slice(0, 48);
		if (!renameFolderId || !name) {
			setRenameFolderId('');
			setRenameFolderName('');
			return;
		}
		setYtFolders(prev => prev.map(f => (f.id === renameFolderId ? { ...f, name } : f)));
		setRenameFolderId('');
		setRenameFolderName('');
	};

	useEffect(() => {
		if (!selectedFavId) return;
		if (!favorites.some(f => f.id === selectedFavId)) setSelectedFavId(null);
	}, [favorites, selectedFavId]);

	const addFavorite = async (url, title) => {
		const videoId = extractYoutubeId(url);
		if (!videoId) return false;
		if (!addFolderId || !folderById.get(addFolderId)) {
			setFavFlash(t.folderNeed);
			window.setTimeout(() => setFavFlash(''), 1800);
			setFolderPickerOpen(true);
			return false;
		}
		const exists = favorites.some(f => f.videoId === videoId);
		if (exists) {
			setFavFlash(t.favSaved);
			window.setTimeout(() => setFavFlash(''), 1600);
			return true;
		}
		let finalTitle = title?.trim();
		if (!finalTitle) {
			finalTitle = await fetchYoutubeTitle(videoId);
		}
		if (!finalTitle) finalTitle = isAr ? `تلاوة ${videoId}` : `Recitation ${videoId}`;
		const folderId = addFolderId;
		const item = {
			id: `fav_${Date.now()}`,
			videoId,
			url: `https://www.youtube.com/watch?v=${videoId}`,
			title: finalTitle,
			folderId,
			savedAt: Date.now(),
		};
		setFavorites(prev => [item, ...prev]);
		setSelectedFavId(item.id);
		setSourceTab('youtube');
		setFolderFilter(folderId);
		setFavFlash(t.favSaved);
		window.setTimeout(() => setFavFlash(''), 1600);
		return true;
	};

	const saveFavFromForm = async () => {
		const ok = await addFavorite(favUrl, resolvedFavTitle);
		if (ok) {
			setFavUrl('');
			setResolvedFavTitle('');
		}
	};

	const removeFav = id => {
		setFavorites(prev => prev.filter(f => f.id !== id));
		if (selectedFavId === id) setSelectedFavId(null);
	};

	const loadHistorySession = (item, andStart = false) => {
		clearSavedSession();
		pendingSessionRestore.current = null;
		sessionRestoreDone.current = true;
		if (cloudReadyRef.current) {
			cloudPutRef.current.schedule('activeSession', () => ({ activeSession: null }));
		}
		skipRangeReset.current = true;
		setSelectedSurahId(item.surahId);
		setMode(item.mode || 'quarter');
		setSelectedUnitIds(
			item.selectedUnitIds?.length
				? normalizeUnitIds(item.selectedUnitIds)
				: idsFromRange(item.rangeFrom || 1, item.rangeTo || 1),
		);
		setRepeatCount(item.repeatCount || 3);
		setSourceTab(item.sourceTab === 'favorites' ? 'youtube' : (item.sourceTab || 'builtin'));
		if (item.reciterId) setSelectedReciterId(item.reciterId);
		if (item.favId) setSelectedFavId(item.favId);
		setHistoryOpen(false);
		setSessionPhase('setup');
		requestAnimationFrame(() => {
			skipRangeReset.current = false;
			if (andStart) {
				window.setTimeout(() => {
					// start after units/ayahs settle
					const btn = document.querySelector('.qr-studio .qr-cta');
					if (btn && !btn.disabled) btn.click();
				}, 350);
			}
		});
	};

	const removeHistoryItem = id => {
		setHistory(prev => prev.filter(h => h.id !== id));
	};

	const clearHistory = () => setHistory([]);

	const openHistory = () => {
		setFavsOpen(false);
		setHistoryOpen(true);
	};

	const openFavs = () => {
		setHistoryOpen(false);
		setFavsOpen(true);
		setFolderPickerOpen(false);
		setFolderCreating(false);
	};

	const useFavorite = item => {
		clearSavedSession();
		pendingSessionRestore.current = null;
		sessionRestoreDone.current = true;
		if (cloudReadyRef.current) {
			cloudPutRef.current.schedule('activeSession', () => ({ activeSession: null }));
		}
		setSelectedFavId(item.id);
		if (item.session) {
			skipRangeReset.current = true;
			setSelectedSurahId(item.session.surahId);
			setMode(item.session.mode || 'quarter');
			setSelectedUnitIds(
				item.session.selectedUnitIds?.length
					? normalizeUnitIds(item.session.selectedUnitIds)
					: idsFromRange(item.session.rangeFrom || 1, item.session.rangeTo || 1),
			);
			setRepeatCount(item.session.repeatCount || 3);
			if (item.session.reciterId) setSelectedReciterId(item.session.reciterId);
			setSourceTab(item.videoId ? 'youtube' : 'builtin');
			requestAnimationFrame(() => { skipRangeReset.current = false; });
		} else {
			setSourceTab(item.videoId ? 'youtube' : 'builtin');
		}
		setFavsOpen(false);
		setSessionPhase('setup');
	};

	const clearYoutubeSource = () => {
		setSelectedFavId(null);
		setSourceTab('builtin');
	};

	/** Stop YouTube session so user can switch to a reciter / other source */
	const dismissYoutubeSession = () => {
		setIsPlaying(false);
		clearYoutubeSource();
		resetSetup();
	};

	const saveSessionAsFavorite = async (item, { openPanel = true } = {}) => {
		const flash = () => {
			setFavFlash(t.favSaved);
			window.setTimeout(() => setFavFlash(''), 1600);
		};
		if (item.favId && favorites.some(f => f.id === item.favId)) {
			setSelectedFavId(item.favId);
			if (item.videoId) setSourceTab('youtube');
			flash();
			setHistoryOpen(false);
			if (openPanel) setFavsOpen(true);
			return;
		}
		const title = `${isAr ? item.surahNameAr : item.surahNameEn} · ${item.ayahFrom}-${item.ayahTo} · ${item.reciterLabel}`;
		const unitKey = (item.selectedUnitIds || []).join('-') || `${item.rangeFrom}-${item.rangeTo}`;
		const sessionKey = `session_${item.surahId}_${unitKey}_${item.reciterId || item.videoId || 'yt'}`;
		const exists = favorites.some(f => f.sessionKey === sessionKey);
		if (exists) {
			flash();
			setHistoryOpen(false);
			if (openPanel) setFavsOpen(true);
			return;
		}
		const entry = {
			id: `fav_${Date.now()}`,
			videoId: item.videoId || null,
			url: item.url || null,
			title,
			folderId: addFolderId && folderById.get(addFolderId) ? addFolderId : (ytFolders[0]?.id || null),
			sessionKey,
			session: {
				surahId: item.surahId,
				mode: item.mode,
				selectedUnitIds: item.selectedUnitIds || idsFromRange(item.rangeFrom || 1, item.rangeTo || 1),
				rangeFrom: item.rangeFrom,
				rangeTo: item.rangeTo,
				repeatCount: item.repeatCount,
				sourceTab: item.sourceTab,
				reciterId: item.reciterId,
			},
			savedAt: Date.now(),
		};
		setFavorites(prev => [entry, ...prev]);
		setSelectedFavId(entry.id);
		if (entry.videoId) setSourceTab('youtube');
		flash();
		setHistoryOpen(false);
		if (openPanel) setFavsOpen(true);
	};

	const saveCurrentReading = () => {
		saveSessionAsFavorite({
			surahId: selectedSurah.id,
			surahNameAr: selectedSurah.nameAr,
			surahNameEn: selectedSurah.nameEn,
			ayahFrom,
			ayahTo,
			mode,
			selectedUnitIds: selectedUnits.map(u => u.id),
			rangeFrom: selectedUnits[0]?.id || 1,
			rangeTo: selectedUnits[selectedUnits.length - 1]?.id || 1,
			repeatCount,
			sourceTab,
			reciterId: selectedReciterId,
			reciterLabel: displayReciter,
			favId: selectedFav?.videoId ? selectedFavId : null,
			videoId: selectedFav?.videoId || null,
			url: selectedFav?.url || null,
		}, { openPanel: false });
	};

	const unitWord = mode === 'quarter' ? t.quarter : t.page;
	const surahName = isAr ? selectedSurah.nameAr : selectedSurah.nameEn;
	const currentVerse = verses[currentVerseIndex];
	const fromLabel = fromUnit ? (isAr ? fromUnit.labelAr : fromUnit.labelEn) : unitWord;
	const toLabel = toUnit && selectedUnits.length > 1 ? (isAr ? toUnit.labelAr : toUnit.labelEn) : '';
	const unitsSummary = selectedUnits.length > 1
		? `${fromLabel} → ${toLabel} (${d(selectedUnits.length)} ${unitWord})`
		: fromLabel;
	const repeatScopeLabel = repeatScope === 'selection' ? t.repeatSelection : t.repeatAyah;
	const summary = `${surahName} · ${unitsSummary} · ${t.verses} ${d(ayahFrom)}–${d(ayahTo)} · ${d(repeatCount)}${t.times} (${repeatScopeLabel}) · ${displayReciter}`;

	const drawers = portalReady && (historyOpen || favsOpen)
		? createPortal(
			<>
				<button
					type="button"
					className="qr-drawer-backdrop"
					aria-label="close"
					onClick={() => { setHistoryOpen(false); setFavsOpen(false); }}
				/>

				{historyOpen ? (
					<aside className="qr-drawer" role="dialog" aria-modal="true" aria-label={t.historyTitle} dir={isAr ? 'rtl' : 'ltr'}>
						<div className="qr-drawer-head">
							<div>
								<p className="qr-drawer-title">{t.historyTitle}</p>
								<p className="qr-drawer-sub">{d(history.length)}</p>
							</div>
							<div className="flex items-center gap-1.5">
								{history.length > 0 ? (
									<button type="button" className="qr-btn !min-h-8 !px-2.5 !text-[11px]" onClick={clearHistory}>
										{t.historyClear}
									</button>
								) : null}
								<button type="button" className="qr-ctrl !h-8 !w-8" onClick={() => setHistoryOpen(false)} aria-label="close">
									<X size={14} />
								</button>
							</div>
						</div>
						<div className="qr-drawer-body">
							{history.length === 0 ? (
								<p className="py-10 text-center text-xs font-semibold text-slate-400">{t.historyEmpty}</p>
							) : (
								history.map(item => (
									<article key={item.id} className="qr-hist-item">
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm font-black text-slate-900">
												{isAr ? item.surahNameAr : item.surahNameEn}
											</p>
											<p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
												{t.verses} {d(item.ayahFrom)}–{d(item.ayahTo)}
												{' · '}
												{d(item.repeatCount)}{t.times}
												{' · '}
												{item.reciterLabel}
											</p>
											<p className="mt-1 text-[10px] font-bold text-slate-400">
												{relativeTime(item.at, t, isAr)}
												{' · '}
												{d(item.repeats)} {t.repeat}
												{' · '}
												<span dir="ltr">{formatTime(item.duration || 0)}</span>
											</p>
										</div>
										<div className="flex shrink-0 flex-col gap-1">
											<button type="button" className="qr-btn !min-h-7 !px-2 !text-[10px]" onClick={() => loadHistorySession(item, true)}>
												<RotateCw size={11} />
												{t.historyReplay}
											</button>
											<button type="button" className="qr-btn !min-h-7 !px-2 !text-[10px]" onClick={() => loadHistorySession(item, false)}>
												{t.historyLoad}
											</button>
											<button type="button" className="qr-btn !min-h-7 !px-2 !text-[10px]" onClick={() => saveSessionAsFavorite(item)}>
												<Youtube size={11} />
												{t.favFromSession}
											</button>
											<button type="button" className="qr-btn !min-h-7 !px-2 !text-[10px] !text-rose-600" onClick={() => removeHistoryItem(item.id)}>
												<Trash2 size={11} />
											</button>
										</div>
									</article>
								))
							)}
						</div>
					</aside>
				) : null}

				{favsOpen ? (
					<aside className="qr-drawer qr-drawer-yt" role="dialog" aria-modal="true" aria-label={t.favPanelTitle} dir={isAr ? 'rtl' : 'ltr'}>
						<div className="qr-drawer-head">
							<div>
								<p className="qr-drawer-title">{t.favPanelTitle}</p>
								<p className="qr-drawer-sub">{d(favorites.length)}</p>
							</div>
							<button type="button" className="qr-ctrl !h-8 !w-8" onClick={() => setFavsOpen(false)} aria-label="close">
								<X size={14} />
							</button>
						</div>
						<div className="qr-drawer-body">
							<p className="text-[11px] font-bold text-slate-500">{t.favAddYoutube}</p>
							<div className="qr-fav-add-bar">
								<input
									className="qr-input"
									value={favUrl}
									onChange={e => setFavUrl(e.target.value)}
									placeholder={t.favUrl}
									onKeyDown={e => e.key === 'Enter' && saveFavFromForm()}
								/>
								<div className="qr-folder-picker" ref={folderPickerRef}>
									<button
										type="button"
										className={cx(
											'qr-folder-trigger',
											folderPickerOpen && 'is-open',
											!selectedAddFolder && 'is-empty',
										)}
										onClick={() => {
											setFolderPickerOpen(v => !v);
											setFolderCreating(false);
											setNewFolderName('');
										}}
										aria-haspopup="listbox"
										aria-expanded={folderPickerOpen}
										title={selectedAddFolder?.name || t.folderPick}
									>
										<Folder size={13} />
										<span className="truncate">
											{selectedAddFolder?.name || t.folderPick}
										</span>
										<ChevronDown size={13} className={cx('qr-folder-chevron', folderPickerOpen && 'is-open')} />
									</button>
									{folderPickerOpen ? (
										<div className="qr-folder-menu" role="listbox">
											{ytFolders.length === 0 && !folderCreating ? (
												<p className="qr-folder-empty-hint">{t.folderNeed}</p>
											) : null}
											{ytFolders.map(f => (
												<button
													key={f.id}
													type="button"
													role="option"
													aria-selected={addFolderId === f.id}
													className={cx('qr-folder-opt', addFolderId === f.id && 'is-on')}
													onClick={() => {
														setAddFolderId(f.id);
														setFolderPickerOpen(false);
														setFolderCreating(false);
													}}
												>
													<span className="truncate">{f.name}</span>
													{addFolderId === f.id ? <Check size={13} /> : null}
												</button>
											))}
											<div className="qr-folder-menu-foot">
												{folderCreating ? (
													<div className="qr-folder-create-inline">
														<input
															className="qr-folder-create-input"
															value={newFolderName}
															onChange={e => setNewFolderName(e.target.value)}
															placeholder={t.folderNamePh}
															autoFocus
															onKeyDown={e => {
																if (e.key === 'Enter') createFolder();
																if (e.key === 'Escape') {
																	setFolderCreating(false);
																	setNewFolderName('');
																}
															}}
														/>
														<button
															type="button"
															className="qr-folder-create-ok"
															onClick={createFolder}
															disabled={!newFolderName.trim()}
															aria-label={t.folderAdd}
															title={t.folderAdd}
														>
															<Check size={14} />
														</button>
													</div>
												) : (
													<button
														type="button"
														className="qr-folder-opt-add"
														onClick={() => setFolderCreating(true)}
													>
														<FolderPlus size={13} />
														{t.folderAdd}
													</button>
												)}
											</div>
										</div>
									) : null}
								</div>
								<button
									type="button"
									className="qr-btn shrink-0"
									onClick={saveFavFromForm}
									disabled={!extractYoutubeId(favUrl) || favTitleLoading || !selectedAddFolder}
									title={!selectedAddFolder ? t.folderNeed : t.addFav}
								>
									{favTitleLoading ? <LoaderCircle size={13} className="animate-spin" /> : <Plus size={13} />}
									{t.addFav}
								</button>
							</div>
							{extractYoutubeId(favUrl) ? (
								<p className="truncate text-[11px] font-bold text-[var(--color-primary-700)]">
									{favTitleLoading ? t.favLoadingTitle : `${t.favDetected}: ${resolvedFavTitle || '…'}`}
								</p>
							) : null}
							{favFlash ? <p className="text-[11px] font-bold text-emerald-600">{favFlash}</p> : null}

							<div className="qr-folder-chips" role="tablist" aria-label={t.favorites}>
								<button
									type="button"
									role="tab"
									aria-selected={folderFilter === FOLDER_FILTER_ALL}
									className={cx('qr-folder-chip', folderFilter === FOLDER_FILTER_ALL && 'is-on')}
									onClick={() => {
										setFolderFilter(FOLDER_FILTER_ALL);
										setRenameFolderId('');
										setRenameFolderName('');
									}}
								>
									{t.folderAll}
									<span>{d(folderCounts[FOLDER_FILTER_ALL] || 0)}</span>
								</button>
								{ytFolders.map(f => (
									<button
										key={f.id}
										type="button"
										role="tab"
										aria-selected={folderFilter === f.id}
										className={cx('qr-folder-chip', folderFilter === f.id && 'is-on')}
										onClick={() => {
											setFolderFilter(f.id);
											setRenameFolderId('');
											setRenameFolderName('');
										}}
									>
										{folderFilter === f.id ? <FolderOpen size={11} /> : <Folder size={11} />}
										{f.name}
										<span>{d(folderCounts[f.id] || 0)}</span>
									</button>
								))}
							</div>

							{folderFilter !== FOLDER_FILTER_ALL && folderById.get(folderFilter) ? (
								<div className="qr-folder-actions">
									{renameFolderId === folderFilter ? (
										<div className="qr-folder-rename">
											<input
												className="qr-folder-rename-input"
												value={renameFolderName}
												onChange={e => setRenameFolderName(e.target.value)}
												autoFocus
												onKeyDown={e => {
													if (e.key === 'Enter') commitRenameFolder();
													if (e.key === 'Escape') {
														setRenameFolderId('');
														setRenameFolderName('');
													}
												}}
												aria-label={t.folderRename}
											/>
											<button
												type="button"
												className="qr-folder-rename-ok"
												onClick={commitRenameFolder}
												disabled={!renameFolderName.trim()}
												title={t.folderRename}
												aria-label={t.folderRename}
											>
												<Check size={13} />
											</button>
										</div>
									) : (
										<button
											type="button"
											className="qr-folder-action"
											onClick={() => startRenameFolder(folderById.get(folderFilter))}
											title={t.folderRename}
										>
											<Pencil size={12} />
											{t.folderRename}
										</button>
									)}
									<button
										type="button"
										className="qr-folder-action is-danger"
										onClick={() => deleteFolder(folderFilter)}
									>
										<Trash2 size={12} />
										{t.folderDelete}
									</button>
								</div>
							) : null}

							{favorites.length === 0 ? (
								<p className="py-8 text-center text-xs font-semibold text-slate-400">{t.favEmpty}</p>
							) : filteredFavorites.length === 0 ? (
								<p className="py-8 text-center text-xs font-semibold text-slate-400">{t.folderEmpty}</p>
							) : (
								filteredFavorites.map(item => {
									const folderName = item.folderId ? folderById.get(item.folderId)?.name : null;
									const thumb = ytThumb(item.videoId);
									return (
										<article key={item.id} className={cx('qr-fav-card', selectedFavId === item.id && 'is-active')}>
											{thumb ? (
												<button
													type="button"
													className="qr-fav-thumb"
													onClick={() => useFavorite(item)}
													title={t.useFav}
													aria-label={t.useFav}
												>
													{/* eslint-disable-next-line @next/next/no-img-element */}
													<img src={thumb} alt="" loading="lazy" />
													<span className="qr-fav-thumb-play"><Play size={14} /></span>
												</button>
											) : null}
											<div className="qr-fav-card-top">
													<p className="qr-fav-card-title">{item.title}</p>
												 
												<div className="qr-fav-actions">
													<button
														type="button"
														className="qr-fav-act is-primary"
														onClick={() => useFavorite(item)}
														title={t.useFav}
														aria-label={t.useFav}
													>
														{selectedFavId === item.id ? <Check size={14} /> : <Play size={14} />}
													</button>
													{item.url ? (
														<a
															className="qr-fav-act"
															href={item.url}
															target="_blank"
															rel="noreferrer"
															title={t.openYt}
															aria-label={t.openYt}
														>
															<ExternalLink size={14} />
														</a>
													) : null}
													<button
														type="button"
														className="qr-fav-act is-danger"
														onClick={() => removeFav(item.id)}
														title={t.remove}
														aria-label={t.remove}
													>
														<Trash2 size={14} />
													</button>
												</div>
											</div>
										</article>
									);
								})
							)}
						</div>
					</aside>
				) : null}
			</>,
			document.body,
		)
		: null;

	const unitsPicker = (
		<>
			<div className="mb-1.5 flex items-center justify-between gap-2">
				<span className="qr-lbl !mb-0">{t.pick} {unitWord}</span>
				<span className="qr-units-toggle-wrap">
					{selectedUnits.length > 0 ? (
						<span className="qr-units-count">
							{d(selectedUnits.length)} {t.selectedCount}
						</span>
					) : null}
					<button
						type="button"
						className={cx('qr-units-toggle', unitsOpen && 'is-open')}
						onClick={() => setUnitsOpen(v => !v)}
						aria-expanded={unitsOpen}
						title={unitsOpen ? t.unitsCollapse : t.unitsExpand}
						aria-label={unitsOpen ? t.unitsCollapse : t.unitsExpand}
					>
						<ChevronDown size={14} strokeWidth={2.4} />
					</button>
				</span>
			</div>
			{unitsOpen ? (
				<>
					<p className="mb-1.5 text-[10px] font-semibold text-slate-400">{t.pickUnits}</p>
					{ayahLoading && !units.length ? (
						<p className="py-3 text-center text-xs font-semibold text-slate-400">{t.unitsLoading}</p>
					) : (
						<div className="qr-units">
							{units.map(unit => {
								const order = selectedUnitIds.indexOf(unit.id);
								const on = order >= 0;
								const firstAyah = ayahBank.find(a => a.n === unit.from);
								const preview = firstAyah?.text
									? firstAyah.text.replace(/^\uFEFF/, '').trim()
									: '';
								const hizbBit = mode === 'quarter'
									? `${t.hizb} ${d(unit.hizb)}`
									: (isAr ? unit.labelAr : unit.labelEn);
								const partBit = mode === 'quarter'
									? rubPartLabel(unit.rubPos, t)
									: '';
								return (
									<button
										key={`${mode}-${unit.id}-${unit.hizbQuarter || unit.page || unit.from}`}
										type="button"
										className={cx('qr-unit', on && 'is-on')}
										onClick={() => toggleUnit(unit.id)}
										title={firstAyah?.text || undefined}
										aria-pressed={on}
									>
										{on ? (
											<span className="qr-unit-ord" aria-hidden="true">{d(order + 1)}</span>
										) : null}
										<div className="qr-unit-line">
											<strong>{hizbBit}</strong>
											{partBit ? <span className="qr-unit-dot">·</span> : null}
											{partBit ? <span className="qr-unit-part">{partBit}</span> : null}
											{preview ? <span className="qr-unit-dot">·</span> : null}
											{preview ? (
												<em
													className="qr-unit-ayah"
													dir="rtl"
													style={{ fontFamily: quranFontFamily }}
												>
													{preview}
												</em>
											) : null}
										</div>
										{on ? (
											<span
												role="button"
												tabIndex={0}
												className="qr-unit-x"
												title={t.deselectUnit}
												aria-label={t.deselectUnit}
												onClick={e => removeUnit(e, unit.id)}
												onKeyDown={e => {
													if (e.key === 'Enter' || e.key === ' ') {
														e.preventDefault();
														removeUnit(e, unit.id);
													}
												}}
											>
												<X size={11} />
											</span>
										) : null}
									</button>
								);
							})}
						</div>
					)}
				</>
			) : null}
		</>
	);

	const repeatTriggerLabel = `${repeatScope === 'selection' ? t.repeatSelection : t.repeatAyah} · ${d(repeatCount)}${t.times}`;

	const topSelects = (live = false) => (
		<div className="qr-row qr-row-top">
			<div className="qr-field qr-field-surah">
				<Select
					label={t.surah}
					options={surahOptions}
					value={selectedSurahId}
					onChange={live ? changeSurahLive : (id => id != null && setSelectedSurahId(Number(id)))}
					searchable
					clearable={false}
					placeholder={t.surah}
					cnLabel="qr-lbl !mb-1 !normal-case !tracking-normal"
					cnInputParent={QR_SELECT_CN}
				/>
			</div>
			<div className="qr-field">
				<Select
					label={t.mode}
					options={[
						{ id: 'quarter', label: t.quarter },
						{ id: 'page', label: t.page },
					]}
					value={mode}
					onChange={live ? changeModeLive : (id => id != null && setMode(id))}
					searchable={false}
					clearable={false}
					cnLabel="qr-lbl !mb-1 !normal-case !tracking-normal"
					cnInputParent={QR_SELECT_CN}
				/>
			</div>
			<div className="qr-field qr-field-repeat" ref={repeatMenuRef}>
				<span className="qr-lbl">{t.repeat}</span>
				<button
					type="button"
					className={cx('qr-repeat-trigger', repeatMenuOpen && 'is-open')}
					onClick={() => setRepeatMenuOpen(o => !o)}
					aria-expanded={repeatMenuOpen}
				>
					<span className="truncate">{repeatTriggerLabel}</span>
					<ChevronDown size={14} className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${repeatMenuOpen ? 'rotate-180' : ''}`} />
				</button>
				{repeatMenuOpen ? (
					<div className="qr-repeat-menu" role="listbox">
						<p className="qr-repeat-heading">{t.repeatScope}</p>
						<button
							type="button"
							className={cx('qr-repeat-opt', repeatScope === 'ayah' && 'is-on')}
							onClick={() => changeRepeatScope('ayah')}
						>
							<span>
								<strong>{t.repeatAyah}</strong>
								<small>{t.repeatAyahHint}</small>
							</span>
							{repeatScope === 'ayah' ? <Check size={13} /> : null}
						</button>
						<button
							type="button"
							className={cx('qr-repeat-opt', repeatScope === 'selection' && 'is-on')}
							onClick={() => changeRepeatScope('selection')}
						>
							<span>
								<strong>{t.repeatSelection}</strong>
								<small>{t.repeatSelectionHint}</small>
							</span>
							{repeatScope === 'selection' ? <Check size={13} /> : null}
						</button>
						<p className="qr-repeat-heading">{t.repeat}</p>
						<div className="qr-repeat-counts">
							{REPEAT_OPTIONS.map(n => (
								<button
									key={n}
									type="button"
									className={cx('qr-repeat-count', repeatCount === n && 'is-on')}
									onClick={() => {
										setRepeatCount(n);
										setRepeatMenuOpen(false);
										markSettingsDirty();
									}}
								>
									{d(n)}{t.times}
								</button>
							))}
						</div>
					</div>
				) : null}
			</div>
			<div className="qr-field qr-field-reciter">
				<Select
					label={t.reciter}
					options={BUILTIN_RECITERS.map(r => ({
						id: r.id,
						label: isAr ? r.nameAr : r.nameEn,
					}))}
					value={selectedReciterId}
					onChange={live ? changeReciterLive : (id => {
						if (id == null) return;
						setSelectedReciterId(id);
						clearYoutubeSource();
					})}
					searchable
					clearable={false}
					cnLabel="qr-lbl !mb-1 !normal-case !tracking-normal"
					cnInputParent={QR_SELECT_CN}
				/>
			</div>
		</div>
	);

	const headerActions = (
		<div className="flex items-center gap-2">
			<button
				type="button"
				onClick={openHistory}
				className="gsh-btn relative inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/[0.24] bg-white/[0.14] text-white backdrop-blur-xl"
				aria-label={t.history}
				title={t.history}
			>
				<History size={16} />
				{history.length > 0 ? (
					<span className="absolute -end-1 -top-1 grid min-w-[1.05rem] place-items-center rounded-full bg-white px-1 text-[9px] font-black text-[var(--color-primary-700)]">
						{d(Math.min(history.length, 99))}
					</span>
				) : null}
			</button>
			<button
				type="button"
				onClick={openFavs}
				className="gsh-btn relative inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/[0.24] bg-white/[0.14] text-white backdrop-blur-xl"
				aria-label={t.favorites}
				title={t.favorites}
			>
				<Youtube size={17} />
				{favorites.length > 0 ? (
					<span className="absolute -end-1 -top-1 grid min-w-[1.05rem] place-items-center rounded-full bg-white px-1 text-[9px] font-black text-[var(--color-primary-700)]">
						{d(Math.min(favorites.length, 99))}
					</span>
				) : null}
			</button>
		</div>
	);

	return (
		<div
			className={cx(
				'qr-studio mx-auto w-full max-w-[920px]',
				sessionPhase === 'active' ? 'is-session-active' : 'space-y-3 pb-8',
			)}
			dir={isAr ? 'rtl' : 'ltr'}
		>
			<audio ref={audioRef} preload="none" />

			<div className={cx('qr-studio-head', sessionPhase === 'active' && 'is-compact')}>
				<GradientStatsHeader
					hiddenStats
					icon={BookMarked}
					title={t.title}
					desc={sessionPhase === 'active' ? undefined : t.desc}
					actions={headerActions}
					btnName={sessionPhase !== 'setup' ? t.newSession : undefined}
					onClick={sessionPhase !== 'setup' ? resetSetup : undefined}
				/>
			</div>

			{drawers}

			{sessionPhase === 'completed' && finalStats ? (
				<section className="qr-done">
					<div className="qr-done-badge"><CheckCircle2 size={22} /></div>
					<h2 className="text-lg font-black text-slate-900">{t.completed}</h2>
					<p className="mt-1 text-sm font-bold text-slate-600">
						{isAr ? finalStats.surah.nameAr : finalStats.surah.nameEn} · {d(finalStats.from)}–{d(finalStats.to)}
					</p>
					<div className="mx-auto mt-4 grid max-w-xs grid-cols-2 gap-2">
						<div className="qr-stat"><strong>{d(finalStats.repeats)}</strong><span>{t.repeat}</span></div>
						<div className="qr-stat"><strong dir="ltr">{formatTime(finalStats.duration)}</strong><span>{t.duration}</span></div>
					</div>
					<div className="mt-4 flex flex-wrap justify-center gap-2">
						<button type="button" className="qr-cta" onClick={startSession}><RotateCcw size={14} />{t.restart}</button>
						<button type="button" className="qr-btn" onClick={() => { setIsMemorizationMode(true); setHideParts(['middle']); startSession(); }}>
							<Brain size={14} />{t.testMemo}
						</button>
						<button type="button" className="qr-btn" onClick={resetSetup}>{t.newSession}</button>
					</div>
				</section>
			) : null}

			{sessionPhase === 'active' ? (
				<div className="qr-active has-dock">
					<section className="qr-panel qr-live-settings">
						<div className="qr-live-settings-row">
							<button
								type="button"
								className="qr-live-settings-toggle"
								onClick={() => setSessionSettingsOpen(v => !v)}
								aria-expanded={sessionSettingsOpen}
							>
								<span className="inline-flex items-center gap-1.5">
									<Settings2 size={14} />
									{t.sessionSettings}
								</span>
								<ChevronDown size={14} className={cx('qr-chevron', sessionSettingsOpen && 'is-open')} />
							</button>
							<div className="qr-session-chrome" aria-label={t.title}>
								<button type="button" className="qr-chrome-btn" onClick={openHistory} aria-label={t.history} title={t.history}>
									<History size={14} />
								</button>
								<button type="button" className="qr-chrome-btn" onClick={openFavs} aria-label={t.favorites} title={t.favorites}>
									<Youtube size={15} />
								</button>
								<button type="button" className="qr-chrome-new" onClick={resetSetup}>
									{t.newSession}
								</button>
							</div>
						</div>
						{sessionSettingsOpen ? (
							<div className="qr-live-settings-body">
								<p className="mb-2 text-[10px] font-semibold text-slate-400">{t.changeWhilePlaying}</p>
								{topSelects(true)}
								<div className="qr-divider" />
								{unitsPicker}
								{settingsPendingApply ? (
									<div className="qr-live-apply">
										<p className="qr-live-apply-hint">{t.settingsPending}</p>
										<button
											type="button"
											className="qr-cta"
											disabled={!canStart || ayahLoading}
											onClick={applyLiveSettings}
										>
											<Play size={14} />
											{t.applySettings}
										</button>
									</div>
								) : null}
							</div>
						) : null}
					</section>

					{usingYoutube && selectedFav ? (
						<section className="qr-panel space-y-2">
							<div className="qr-seg">
								<button type="button" className={cx(ytPlayMode === 'audio' && 'is-on')} onClick={() => setYtPlayMode('audio')}>
									<SignalLow size={12} />{t.ytAudio}
								</button>
								<button type="button" className={cx(ytPlayMode === 'video' && 'is-on')} onClick={() => setYtPlayMode('video')}>
									<Film size={12} />{t.ytVideo}
								</button>
							</div>
							{ytPlayMode === 'audio' ? (
								<p className="qr-yt-quality-hint">
									<SignalLow size={12} />
									{t.ytAudio} · 144p
								</p>
							) : null}
							<div className="overflow-hidden rounded-lg border border-slate-200 bg-black">
								<YoutubeResumePlayer
									key={`${selectedFav.videoId}:${ytPlayMode}`}
									videoId={selectedFav.videoId}
									playing={isPlaying}
									lowQuality={ytPlayMode === 'audio'}
									volume={volume}
									muted={muted}
									title={selectedFav.title}
									className="aspect-video w-full"
								/>
							</div>
						</section>
					) : null}

					{!usingYoutube ? (
						<section
							ref={mushafPanelRef}
							className={cx(
								'qr-preview qr-preview-mushaf',
								mushafExpanded && 'is-expanded',
								mushafExpanded && !mushafCollapsing && 'is-expanding',
								mushafCollapsing && 'is-collapsing',
							)}
							onAnimationEnd={onMushafExpandAnimEnd}
						>
							<div className="qr-preview-tools">
								<div className="qr-tools-meta min-w-0">
									<p className="qr-tools-title">{surahName}</p>
									<p className="qr-tools-sub">
										{t.readingFrom} {d(ayahFrom)} {t.readingTo} {d(ayahTo)}
										{errorCountInView > 0 ? (
											<span className="qr-tools-errors">
												{' '}({d(errorCountInView)}{' '}
												{errorCountInView === 1 ? t.errorCountOne : t.errorCountMany})
											</span>
										) : null}
										{currentVerse ? ` · ${t.ayah} ${d(currentVerse.n)}` : ''}
									</p>
								</div>

								<div className="qr-tools-bar" dir={isAr ? 'rtl' : 'ltr'}>
									<button
										type="button"
										className={cx('qr-tool-icon', mushafExpanded && !mushafCollapsing && 'is-on')}
										onClick={toggleMushafExpanded}
										title={mushafExpanded && !mushafCollapsing ? t.collapseMushaf : t.expandMushaf}
										aria-label={mushafExpanded && !mushafCollapsing ? t.collapseMushaf : t.expandMushaf}
										aria-pressed={mushafExpanded && !mushafCollapsing}
									>
										{mushafExpanded && !mushafCollapsing
											? <Minimize2 size={15} strokeWidth={2.25} />
											: <Maximize2 size={15} strokeWidth={2.25} />}
									</button>

									<span className="qr-tools-sep" aria-hidden />

									<label className={cx('qr-tool', showTajweed && 'is-on')} title={t.tajweedHint}>
										<BookOpenText size={13} strokeWidth={2.25} aria-hidden />
										<span>{t.tajweed}</span>
										<button
											type="button"
											className={cx('qr-switch', showTajweed && 'is-on')}
											onClick={() => setShowTajweed(v => !v)}
											aria-label={t.tajweed}
											aria-pressed={showTajweed}
											title={t.tajweedHint}
										/>
									</label>
									<button
										type="button"
										className={cx('qr-tool-link', tajweedLegendOpen && 'is-on')}
										onClick={() => setTajweedLegendOpen(true)}
										title={t.tajweedLegend}
										aria-label={t.tajweedLegend}
										aria-haspopup="dialog"
										aria-expanded={tajweedLegendOpen}
									>
										<Info size={12} strokeWidth={2.4} />
										{t.tajweedGuide}
									</button>

									<span className="qr-tools-sep" aria-hidden />

									<label className={cx('qr-tool', followAlong && 'is-on')}>
										<span>{t.follow}</span>
										<button
											type="button"
											className={cx('qr-switch', followAlong && 'is-on')}
											onClick={() => setFollowAlong(v => !v)}
											aria-label={t.follow}
										/>
									</label>

									<span className="qr-tools-sep" aria-hidden />

									<label className={cx('qr-tool', errorMode && 'is-on')} title={t.errorModeHint}>
										<CircleAlert size={13} strokeWidth={2.25} aria-hidden />
										<span>{t.errorMode}</span>
										<button
											type="button"
											className={cx('qr-switch', errorMode && 'is-on')}
											onClick={() => setErrorMode(v => !v)}
											aria-label={t.errorMode}
											aria-pressed={errorMode}
											title={t.errorModeHint}
										/>
									</label>

									<span className="qr-tools-sep" aria-hidden />

									<label className={cx('qr-tool', isMemorizationMode && 'is-on')}>
										<span>{t.memo}</span>
										<button
											type="button"
											className={cx('qr-switch', isMemorizationMode && 'is-on')}
											onClick={() => setIsMemorizationMode(v => !v)}
											aria-label={t.memo}
										/>
									</label>

									{isMemorizationMode ? (
										<div className="qr-hide-pills" role="group" aria-label={t.hidePartsLabel} title={t.hidePartsHint}>
											{[
												{ id: 'start', label: t.hideStart },
												{ id: 'middle', label: t.hideMiddle },
												{ id: 'end', label: t.hideEnd },
											].map(opt => (
												<button
													key={opt.id}
													type="button"
													className={cx('qr-hide-pill', hideParts.includes(opt.id) && 'is-on')}
													aria-pressed={hideParts.includes(opt.id)}
													onClick={() => toggleHidePart(opt.id)}
												>
													{opt.label}
												</button>
											))}
										</div>
									) : null}
								</div>
							</div>

							{favFlash ? <p className="text-[10px] font-bold text-emerald-600">{favFlash}</p> : null}

							<div className="qr-mushaf-scroll" ref={mushafScrollRef}>
								<div
									className={cx('qr-mushaf', 'has-tajweed', errorMode && 'is-error-mode')}
									dir="rtl"
									lang="ar"
									style={{ fontFamily: quranFontFamily }}
								>
									{verses.map((verse, index) => {
										const isOn = index === currentVerseIndex;
										const hide = isMemorizationMode ? hideParts : [];
										return (
											<span
												key={`${verse.n}-${index}`}
												data-ayah-idx={index}
												className={cx(
													'qr-ayah',
													followAlong && isOn && 'is-on',
													followAlong && index < currentVerseIndex && 'is-past',
													followAlong && index === currentVerseIndex + 1 && 'is-next',
													!followAlong && 'is-on',
												)}
											>
												<TajweedText
													tajweed={verse.tajweed}
													plain={verse.text}
													hideParts={hide}
													enabled
													interactive={showTajweed && !errorMode}
													errorMode={errorMode}
													marks={marksByAyahNumber[verse.n] || EMPTY_WORD_MARKS}
													onSetMarks={(wordIndexes, type) => setMarksForAyah(verse.n, wordIndexes, type)}
													errorLabels={errorLabels}
													isAr={isAr}
												/>
												<span className="qr-ayah-num" aria-hidden="true">
													<span className="qr-ayah-num-ring" />
													<span className="qr-ayah-num-val">{d(verse.n)}</span>
												</span>
											</span>
										);
									})}
								</div>
							</div>
						</section>
					) : null}

				</div>
			) : null}

			{portalReady && sessionPhase === 'active'
				? createPortal(
					<div
						className={cx(
							'qr-dock',
							isPlaying && 'is-playing',
							mushafExpanded && !mushafCollapsing && 'is-centered',
						)}
						dir="ltr"
						style={!mushafExpanded || mushafCollapsing
							? (dockBox.left != null ? { left: dockBox.left, width: dockBox.width } : undefined)
							: undefined}
					>
						<div className="qr-dock-main is-compact-row">
							{!usingYoutube ? (
								<div className="qr-dock-reciter" dir={isAr ? 'rtl' : 'ltr'}>
									<Select
										options={BUILTIN_RECITERS.map(r => ({
											id: r.id,
											label: isAr ? r.nameAr : r.nameEn,
										}))}
										value={selectedReciterId}
										onChange={changeReciterLive}
										searchable={false}
										clearable={false}
										cnInputParent="!h-8 !rounded-lg !text-[11px] !font-bold !bg-white/90 !border-slate-200"
									/>
								</div>
							) : (
								<p className="qr-dock-title qr-dock-yt-label">{displayReciter}</p>
							)}

							<div className="qr-dock-center">
								{!usingYoutube ? (
									<button type="button" className="qr-dock-btn" onClick={goPrev} aria-label="previous" title="Previous">
										<SkipBack size={16} />
									</button>
								) : null}
								<button type="button" className="qr-dock-btn is-main" onClick={togglePlay} aria-label="play">
									{isPlaying ? <Pause size={17} /> : <Play size={17} className="ms-0.5" />}
								</button>
								{!usingYoutube ? (
									<button type="button" className="qr-dock-btn" onClick={goNext} aria-label="next" title="Next">
										<SkipForward size={16} />
									</button>
								) : null}
							</div>

							<div className="qr-dock-right">
								<div className="qr-dock-vol" title="Volume">
									<button type="button" className="qr-dock-btn is-ghost" onClick={() => setMuted(m => !m)} aria-label="mute">
										{muted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
									</button>
									<input
										type="range"
										className="qr-dock-range qr-dock-vol-range"
										min={0}
										max={1}
										step={0.01}
										value={muted ? 0 : volume}
										onChange={e => { const v = Number(e.target.value); setVolume(v); setMuted(v === 0); }}
										style={{ '--qr-fill': `${(muted ? 0 : volume) * 100}%` }}
										dir="ltr"
									/>
								</div>
								{!usingYoutube ? (
									<div className="qr-dock-speed" role="group" aria-label="speed">
										{SPEED_OPTIONS.map(s => (
											<button
												key={s}
												type="button"
												className={cx('qr-dock-speed-btn', speed === s && 'is-on')}
												onClick={() => setSpeed(s)}
											>
												{s}×
											</button>
										))}
									</div>
								) : (
									<button
										type="button"
										className="qr-dock-btn is-ghost qr-dock-close"
										onClick={dismissYoutubeSession}
										aria-label={t.ytClear}
										title={t.ytClear}
									>
										<X size={16} />
									</button>
								)}
							</div>
						</div>

						{!usingYoutube ? (
							<div className="qr-dock-seek">
								<span>{formatTime((verseProgress / 100) * (audioDuration || 0))}</span>
								<input
									type="range"
									className="qr-dock-range"
									min={0}
									max={100}
									value={verseProgress}
									onChange={e => {
										const el = audioRef.current;
										const pct = Number(e.target.value);
										setVerseProgress(pct);
										if (el?.duration) el.currentTime = (pct / 100) * el.duration;
									}}
									style={{ '--qr-fill': `${verseProgress}%` }}
									dir="ltr"
								/>
								<span>{formatTime(audioDuration || 0)}</span>
							</div>
						) : null}

						{audioError ? <p className="qr-dock-error">{audioError}</p> : null}
					</div>,
					document.body,
				)
				: null}

			{sessionPhase === 'setup' ? (
				<section className="qr-panel">
					{topSelects(false)}

					<div className="qr-divider" />

					{unitsPicker}

					{sourceTab === 'youtube' && selectedFav?.videoId ? (
						<>
							<div className="qr-divider" />
							<div className="qr-yt-pick">
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-black text-slate-900">{selectedFav.title}</p>
									<p className="mt-0.5 text-[11px] font-bold text-slate-500">{t.ytAskMode}</p>
								</div>
								<button type="button" className="qr-btn !min-h-8 !px-2 !text-[10px]" onClick={clearYoutubeSource} title={t.ytClear}>
									{t.ytClear}
								</button>
								<div className="qr-seg qr-seg-yt">
									<button type="button" className={cx(ytPlayMode === 'audio' && 'is-on')} onClick={() => setYtPlayMode('audio')}>
										<SignalLow size={12} />{t.ytAudio}
									</button>
									<button type="button" className={cx(ytPlayMode === 'video' && 'is-on')} onClick={() => setYtPlayMode('video')}>
										<Film size={12} />{t.ytVideo}
									</button>
								</div>
								<p className="w-full text-[10px] font-semibold text-slate-400">{t.ytModeHint}</p>
							</div>
						</>
					) : null}

					<div className="qr-bar">
						<p className="qr-sum">
							{summary}
							<span className="ms-2 text-[10px] font-semibold text-slate-400">· {t.saved}</span>
						</p>
						<button type="button" className="qr-cta" disabled={!canStart} onClick={startSession}>
							<Play size={15} />
							{t.start}
						</button>
					</div>
				</section>
			) : null}

			<TajweedGuideModal
				open={tajweedLegendOpen}
				onClose={() => setTajweedLegendOpen(false)}
				isAr={isAr}
				labels={{
					title: t.tajweedLegend,
					intro: t.tajweedIntro,
					howTitle: t.tajweedHowTitle,
					howBody: t.tajweedHowBody,
					meaning: t.tajweedMeaning,
					why: t.tajweedWhy,
					tip: t.tajweedTip,
					example: t.tajweedExample,
					footer: t.tajweedFooter,
					close: t.tajweedLegendClose,
				}}
			/>
		</div>
	);
}
