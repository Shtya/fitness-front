'use client';

/**
 * WhatsApp "Quran" tab: a mistake notebook for revision.
 * Log a slip in seconds (surah → ayah → tap the word or the gap → what happened), then the
 * tab brings each mistake back on a spaced schedule and hides the words you must recall.
 * Before reciting a surah, "warm up" runs through all of its mistakes in mushaf order.
 * Local-first: localStorage paints instantly, the cloud copy (quran-revision state) syncs behind.
 */

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
	ArrowRight,
	BookOpenText,
	Check,
	ChevronDown,
	ChevronLeft,
	Eye,
	EyeOff,
	Flame,
	Minus,
	MoreHorizontal,
	Pause,
	Pencil,
	Plus,
	RotateCcw,
	Trash2,
	Volume2,
	X,
} from 'lucide-react';
import { SURAHS, BUILTIN_RECITERS, ayahAudioUrl } from '../../quran-revision/quran-data';
import { fetchQuranRevisionState, putQuranRevisionState } from '../../quran-revision/quran-revision-api';
import {
	AYAH_SPOTS,
	MISTAKE_KINDS,
	createMistake,
	dropUnmarked,
	dueQueue,
	gradeMistake,
	hiddenRange,
	isActive,
	markMastered,
	mergeMistakes,
	reopenMistake,
	SURAH_SORTS,
	SURAH_STATUSES,
	surahView,
	mistakesFromWordMarks,
	nextDueAt,
	normalizeMistakes,
	overallStats,
	spotForWord,
	surahPlace,
	surahSummaries,
	surahWarmup,
} from './quran-mistakes';
import { ayahWords, cachedSurah, loadSurahText } from './quran-text';
import { quranFontCss } from '../../quran-revision/quran-font-css';
import './quran-tab.css';
import './quran-shell.css';
import './quran-practice.css';
import MushafReader from './MushafReader';
import { NOTEBOOK_EVENT } from './quran-notebook-store';

const LS_SECTION = 'so7ba:quran-revision:wa-section:v1';
const SECTIONS = ['mushaf', 'revise', 'notes'];
/** Self-hosted mushaf faces from quran-tab.css (the page's next/font variables do not exist here). */
const QURAN_FONT_STACK = "'WaQuranHafs', 'WaAmiriQuran', 'UthmanicHafs', 'Amiri Quran', 'Scheherazade New', serif";
const QURAN_FONT_CSS = quranFontCss(QURAN_FONT_STACK);
const LS_MISTAKES = 'so7ba:quran-revision:mistakes:v1';
const LS_RECENT = 'so7ba:quran-revision:mistake-recent:v1';
const LS_STUDIO_PREFS = 'so7ba:quran-revision:prefs:v2';
const LS_STUDIO_MARKS = 'so7ba:quran-revision:word-errors:v1';
const SURAH_BY_ID = new Map(SURAHS.map(s => [s.id, s]));
const versesCountOf = id => SURAH_BY_ID.get(id)?.versesCount || 1;
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const cx = (...parts) => parts.filter(Boolean).join(' ');

const L = {
	ar: {
		tabTitle: 'القرآن',
		tabMushaf: 'المصحف',
		tabRevise: 'المراجعة',
		tabMistakes: 'أخطائي',
		title: 'أخطاء الحفظ',
		subtitle: 'سجّل الغلطة، وهي ترجعلك لحد ما تثبت',
		back: 'رجوع',
		studio: 'المصحف والمراجعة',
		due: 'مستحقة للمراجعة',
		dueNone: 'مفيش مراجعة دلوقتي',
		nextIn: 'المراجعة الجاية',
		startReview: 'ابدأ المراجعة',
		log: 'سجّل غلطة',
		total: 'غلطة مسجلة',
		mastered: 'ثبتت',
		today: 'اتراجعت النهارده',
		bySurah: 'حسب السورة',
		emptyTitle: 'ابدأ دفتر أخطائك',
		emptySteps: [
			'وانت بتراجع، أول ما تغلط اضغط «سجّل غلطة» وحدد المكان في ثواني.',
			'الغلطة ترجعلك بعد ساعات، ثم يوم، ٣ أيام، أسبوع… وكل ما تغلط فيها تاني ترجع من الأول.',
			'قبل ما تسمّع سورة، اعمل «تسخين» على أخطائها بالترتيب.',
		],
		surah: 'السورة',
		ayah: 'الآية',
		of: 'من',
		tapHint: 'اضغط على الكلمة اللي غلطت فيها، أو على النقطة اللي بين كلمتين',
		where: 'فين في الآية؟',
		what: 'إيه اللي حصل؟',
		said: 'قلت إيه بدلها؟',
		addedWord: 'زوّدت إيه؟',
		mixWith: 'دخلت في آية إيه؟ (مثلاً الأعراف ١٢)',
		note: 'ملاحظة (اختياري)',
		save: 'حفظ',
		saveNext: 'حفظ وسجّل غيرها',
		saved: 'اتسجلت',
		update: 'حفظ التعديل',
		editTitle: 'تعديل الغلطة',
		logTitle: 'غلطة جديدة',
		loadingText: 'بيحمّل نص السورة…',
		textError: 'النص مش متاح دلوقتي — سجّل بالمكان والنوع، والنص يظهر لما النت يرجع',
		retry: 'حاول تاني',
		warmup: 'تسخين قبل التسميع',
		warmupHint: 'كل أخطاء السورة بالترتيب',
		addHere: 'غلطة في السورة دي',
		all: 'الكل',
		reveal: 'اكشف',
		recallHint: 'سمّع من الذاكرة، وبعدين اكشف',
		forgotAyah: 'نسيت الآية',
		dueShort: 'مستحقة',
		hideAnswer: 'إخفاء',
		tapReveal: 'سمّعها من الذاكرة، وبعدين اضغط تكشف',
		missedAgain: 'غلطت تاني',
		gotIt: 'حفظتها',
		masteredTitle: 'ثبتت',
		backToReview: 'رجّعها للمراجعة',
		masteredOf: (a, b, n) => `ثبتت ${n(a)} من ${n(b)}`,
		filters: 'فلترة وترتيب',
		clearFilters: 'مسح الفلاتر',
		doneBtn: 'تم',
		statusLabel: 'الحالة',
		placeLabel: 'المكان في السورة',
		kindLabel: 'نوع الغلطة',
		sortLabel: 'الترتيب',
		statuses: { all: 'الكل', due: 'المستحقة دلوقتي', weak: 'المتكررة (غلطت فيها مرتين أو أكتر)' },
		sorts: { mushaf: 'بترتيب المصحف', missed: 'الأكتر غلطًا الأول', due: 'الأقرب موعدًا الأول' },
		answersHidden: 'الإجابات مخفية',
		answersShown: 'الإجابات ظاهرة',
		noMatch: 'مفيش أخطاء بالفلتر ده',
		allMastered: 'ما شاء الله، كل أخطاء السورة دي ثبتت',
		startFromPrev: 'ابدأ من الآية اللي قبلها، وكمّل الآية اللي نسيتها',
		again: 'غلطت',
		hard: 'بصعوبة',
		good: 'تمام',
		listen: 'اسمع',
		youSaid: 'كنت بتقول',
		mixedWith: 'كنت بتدخل في',
		nextAyah: 'أول الآية اللي بعدها',
		done: 'خلصت المراجعة',
		doneSub: 'كمّل كده كل يوم',
		home: 'الرئيسية',
		delete: 'مسح',
		deleted: 'اتمسحت',
		undo: 'تراجع',
		edit: 'تعديل',
		close: 'إغلاق',
		mistakesCount: (c, n) => arCount(c, n, 'غلطة واحدة', 'غلطتين', 'أخطاء', 'غلطة'),
		dueCount: (c, n) => `${n(c)} مستحقة`,
		lapses: (c, n) => `غلطت فيها ${arCount(c, n, 'مرة', 'مرتين', 'مرات', 'مرة')}`,
		box: b => `مستوى ${b}/6`,
		now: 'دلوقتي',
		inMinutes: 'بعد شوية',
		inHours: (h, n) => `بعد ${arCount(h, n, 'ساعة', 'ساعتين', 'ساعات', 'ساعة')}`,
		tomorrow: 'بكرة',
		inDays: (d, n) => (d === 7 ? 'بعد أسبوع' : d === 14 ? 'بعد أسبوعين' : `بعد ${arCount(d, n, 'يوم', 'يومين', 'أيام', 'يوم')}`),
		kinds: {
			forgot: 'نسيت / وقفت',
			swap: 'بدّلت كلمة',
			mix: 'دخلت في متشابه',
			skip: 'أسقطت',
			add: 'زوّدت',
			order: 'قدّمت وأخّرت',
			tashkeel: 'تشكيل',
		},
		spots: {
			start: 'أول الآية',
			middle: 'نص الآية',
			end: 'آخر الآية',
			between: 'بين كلمتين',
			link: 'الربط بالآية اللي بعدها',
			whole: 'الآية كلها',
		},
		places: { start: 'أول السورة', middle: 'نص السورة', end: 'آخر السورة' },
	},
	en: {
		tabTitle: 'Quran',
		tabMushaf: 'Mushaf',
		tabRevise: 'Revise',
		tabMistakes: 'My mistakes',
		title: 'Hifz mistakes',
		subtitle: 'Log a slip — it comes back until it sticks',
		back: 'Back',
		studio: 'Mushaf & revision',
		due: 'due for review',
		dueNone: 'Nothing due right now',
		nextIn: 'Next review',
		startReview: 'Start review',
		log: 'Log a mistake',
		total: 'logged',
		mastered: 'mastered',
		today: 'reviewed today',
		bySurah: 'By surah',
		emptyTitle: 'Start your mistake notebook',
		emptySteps: [
			'While revising, tap “Log a mistake” the moment you slip and mark the spot in seconds.',
			'It comes back in a few hours, then 1 day, 3 days, a week… a new slip sends it back to the start.',
			'Before reciting a surah, run a “warm-up” over its mistakes in order.',
		],
		surah: 'Surah',
		ayah: 'Ayah',
		of: 'of',
		tapHint: 'Tap the word you got wrong, or the dot between two words',
		where: 'Where in the ayah?',
		what: 'What happened?',
		said: 'What did you say instead?',
		addedWord: 'What did you add?',
		mixWith: 'Mixed it with which ayah? (e.g. Al-A‘raf 12)',
		note: 'Note (optional)',
		save: 'Save',
		saveNext: 'Save & log another',
		saved: 'Saved',
		update: 'Save changes',
		editTitle: 'Edit mistake',
		logTitle: 'New mistake',
		loadingText: 'Loading the surah text…',
		textError: 'Text unavailable right now — log the spot and type; the text shows when you are back online',
		retry: 'Retry',
		warmup: 'Warm-up before reciting',
		warmupHint: 'All mistakes of this surah, in order',
		addHere: 'Mistake in this surah',
		all: 'All',
		reveal: 'Reveal',
		recallHint: 'Recite from memory, then reveal',
		forgotAyah: 'Forgot the ayah',
		dueShort: 'due',
		hideAnswer: 'Hide',
		tapReveal: 'Recite it from memory, then tap to reveal',
		missedAgain: 'Missed again',
		gotIt: 'I know it',
		masteredTitle: 'Mastered',
		backToReview: 'Back to review',
		masteredOf: (a, b, n) => `${n(a)} of ${n(b)} mastered`,
		filters: 'Filter & sort',
		clearFilters: 'Clear',
		doneBtn: 'Done',
		statusLabel: 'Status',
		placeLabel: 'Place in the surah',
		kindLabel: 'Mistake type',
		sortLabel: 'Order',
		statuses: { all: 'All', due: 'Due now', weak: 'Repeated (missed twice or more)' },
		sorts: { mushaf: 'Mushaf order', missed: 'Most missed first', due: 'Due soonest first' },
		answersHidden: 'Answers hidden',
		answersShown: 'Answers shown',
		noMatch: 'No mistakes match this filter',
		allMastered: 'All mistakes in this surah are mastered',
		startFromPrev: 'Start from the ayah before, then carry on into the one you forgot',
		again: 'Missed',
		hard: 'Hard',
		good: 'Got it',
		listen: 'Listen',
		youSaid: 'You used to say',
		mixedWith: 'You used to slip into',
		nextAyah: 'Start of the next ayah',
		done: 'Review done',
		doneSub: 'A few minutes a day keeps them fixed',
		home: 'Home',
		delete: 'Delete',
		deleted: 'Deleted',
		undo: 'Undo',
		edit: 'Edit',
		close: 'Close',
		mistakesCount: (c, n) => `${n(c)} ${c === 1 ? 'mistake' : 'mistakes'}`,
		dueCount: (c, n) => `${n(c)} due`,
		lapses: (c, n) => `missed ${n(c)}×`,
		box: b => `level ${b}/6`,
		now: 'now',
		inMinutes: 'soon',
		inHours: (h, n) => `in ${n(h)} h`,
		tomorrow: 'tomorrow',
		inDays: (d, n) => (d === 7 ? 'in a week' : `in ${n(d)} days`),
		kinds: {
			forgot: 'Forgot / stuck',
			swap: 'Swapped a word',
			mix: 'Mixed with similar',
			skip: 'Skipped',
			add: 'Added',
			order: 'Wrong order',
			tashkeel: 'Harakat',
		},
		spots: {
			start: 'Start of ayah',
			middle: 'Middle of ayah',
			end: 'End of ayah',
			between: 'Between two words',
			link: 'Joining the next ayah',
			whole: 'Whole ayah',
		},
		places: { start: 'Start of surah', middle: 'Middle of surah', end: 'End of surah' },
	},
};

/** Arabic counting: 1 / 2 have their own words, 3–10 take the plural, 11+ the singular. */
function arCount(c, n, one, two, few, many) {
	if (c === 1) return one;
	if (c === 2) return two;
	return `${n(c)} ${c >= 3 && c <= 10 ? few : many}`;
}

function readJson(key, fallback) {
	try {
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) : fallback;
	} catch {
		return fallback;
	}
}
function writeJson(key, value) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		/* quota / private mode */
	}
}

function wordCountOf(surahId, ayah) {
	const text = cachedSurah(surahId)?.[ayah - 1];
	return text ? ayahWords(text, surahId, ayah).filter(w => !w.hidden).length : 0;
}

/* ───────────────────────── data ───────────────────────── */

/** Bring the log in line with the mushaf's word marks: new marks in, removed (unreviewed) ones out. */
function syncWithMarks(list, wordErrors) {
	if (!wordErrors || typeof wordErrors !== 'object') return list;
	const kept = dropUnmarked(list, wordErrors);
	const added = mistakesFromWordMarks(wordErrors, kept, wordCountOf);
	return added.length ? mergeMistakes(kept, added) : kept;
}

function useNotebook() {
	const [list, setList] = useState(null);
	const listRef = useRef([]);
	const cloudReady = useRef(false);
	const putTimer = useRef(0);

	const flush = useCallback(() => {
		window.clearTimeout(putTimer.current);
		putTimer.current = 0;
		if (!cloudReady.current) return;
		void putQuranRevisionState({ mistakes: listRef.current }).catch(() => {});
	}, []);

	const schedulePut = useCallback(() => {
		window.clearTimeout(putTimer.current);
		putTimer.current = window.setTimeout(flush, 1200);
	}, [flush]);

	// Local copy first, before paint, so the tab opens with data already there.
	useIsoLayoutEffect(() => {
		const local = normalizeMistakes(readJson(LS_MISTAKES, []));
		const all = syncWithMarks(local, readJson(LS_STUDIO_MARKS, null));
		listRef.current = all;
		setList(all);
		if (all !== local) writeJson(LS_MISTAKES, all);
	}, []);

	useEffect(() => {
		let alive = true;
		fetchQuranRevisionState()
			.then(cloud => {
				if (!alive) return;
				const cloudList = normalizeMistakes(cloud.mistakes);
				const merged = mergeMistakes(listRef.current, cloudList);
				// The mushaf writes its marks to this device first; the cloud copy can lag behind.
				const all = syncWithMarks(merged, readJson(LS_STUDIO_MARKS, null) || cloud.wordErrors);
				const cloudById = new Map(cloudList.map(m => [m.id, m.updatedAt]));
				const cloudBehind = all.some(m => cloudById.get(m.id) !== m.updatedAt);
				cloudReady.current = true;
				listRef.current = all;
				setList(all);
				writeJson(LS_MISTAKES, all);
				if (cloudBehind) schedulePut();
			})
			.catch(() => {
				/* offline or signed out: stays local, syncs next time */
			});
		const onHide = () => {
			if (document.visibilityState === 'hidden' && putTimer.current) flush();
		};
		document.addEventListener('visibilitychange', onHide);
		return () => {
			alive = false;
			document.removeEventListener('visibilitychange', onHide);
			if (putTimer.current) flush();
		};
	}, [flush, schedulePut]);

	const commit = useCallback(
		updater => {
			const next = updater(listRef.current);
			if (next === listRef.current) return;
			listRef.current = next;
			setList(next);
			writeJson(LS_MISTAKES, next);
			schedulePut();
		},
		[schedulePut],
	);

	const api = useMemo(
		() => ({
			add: m => commit(prev => [...prev, m]),
			update: (id, patch) =>
				commit(prev => prev.map(m => (m.id === id ? { ...m, ...patch, updatedAt: Date.now() } : m))),
			remove: id => commit(prev => prev.map(m => (m.id === id ? { ...m, deletedAt: Date.now(), updatedAt: Date.now() } : m))),
			restore: id => commit(prev => prev.map(m => (m.id === id ? { ...m, deletedAt: null, updatedAt: Date.now() } : m))),
			grade: (id, result) => commit(prev => prev.map(m => (m.id === id ? gradeMistake(m, result) : m))),
			master: id => commit(prev => prev.map(m => (m.id === id ? markMastered(m) : m))),
			reopen: id => commit(prev => prev.map(m => (m.id === id ? reopenMistake(m) : m))),
		}),
		[commit],
	);

	return [list, api];
}

function useSurahText(surahId) {
	const [state, setState] = useState(() => ({ id: surahId, ayahs: cachedSurah(surahId), error: false }));
	const [attempt, setAttempt] = useState(0);
	useEffect(() => {
		if (!surahId) return undefined;
		const cached = cachedSurah(surahId);
		if (cached) {
			setState(prev => (prev.id === surahId && prev.ayahs === cached ? prev : { id: surahId, ayahs: cached, error: false }));
			return undefined;
		}
		let alive = true;
		setState({ id: surahId, ayahs: null, error: false });
		loadSurahText(surahId)
			.then(ayahs => alive && setState({ id: surahId, ayahs, error: false }))
			.catch(() => alive && setState({ id: surahId, ayahs: null, error: true }));
		return () => {
			alive = false;
		};
	}, [surahId, attempt]);
	const current = state.id === surahId ? state : { ayahs: null, error: false };
	return { ayahs: current.ayahs, error: current.error, retry: () => setAttempt(a => a + 1) };
}

/* ───────────────────────── helpers ───────────────────────── */

function useFormat(ar) {
	return useMemo(() => {
		const nf = new Intl.NumberFormat(ar ? 'ar-EG' : 'en-US');
		return { n: v => nf.format(v) };
	}, [ar]);
}

function whenText(t, ms, n) {
	if (ms <= 60 * 1000) return t.now;
	const hours = ms / 3_600_000;
	if (hours < 1.5) return t.inMinutes;
	if (hours < 20) return t.inHours(Math.round(hours), n);
	const days = Math.round(hours / 24);
	return days <= 1 ? t.tomorrow : t.inDays(days, n);
}

function surahName(id, ar) {
	const s = SURAH_BY_ID.get(id);
	return s ? (ar ? s.nameAr : s.nameEn) : String(id);
}

/** The spot shown for a mistake; word-level marks from the studio get a real spot once text is known. */
function shownSpot(m, words) {
	if (m.spot !== 'whole' || m.wordStart == null || !words) return m.spot;
	const visible = words.filter(w => !w.hidden);
	const idx = visible.findIndex(w => w.i === m.wordStart);
	return idx < 0 ? m.spot : spotForWord(idx, visible.length);
}

let sharedAudio = null;
function useAyahAudio() {
	const [playing, setPlaying] = useState(null);
	useEffect(() => () => sharedAudio?.pause(), []);
	const toggle = useCallback((surahId, ayah) => {
		const key = `${surahId}:${ayah}`;
		if (!sharedAudio) sharedAudio = new Audio();
		const a = sharedAudio;
		if (playing === key && !a.paused) {
			a.pause();
			setPlaying(null);
			return;
		}
		const prefs = readJson(LS_STUDIO_PREFS, {});
		const reciter = BUILTIN_RECITERS.find(r => r.id === prefs?.selectedReciterId) || BUILTIN_RECITERS[0];
		a.src = ayahAudioUrl(reciter.folder, surahId, ayah);
		a.onended = () => setPlaying(null);
		a.onerror = () => setPlaying(null);
		void a.play().catch(() => setPlaying(null));
		setPlaying(key);
	}, [playing]);
	return [playing, toggle];
}

/* ───────────────────────── ayah text ───────────────────────── */

const AyahText = memo(function AyahText({ words, highlight, hide, revealed, onWord, onGap, selection, size = 'md' }) {
	if (!words) return null;
	const visible = words.filter(w => !w.hidden);
	const inSel = i => selection && !selection.gap && i >= selection.start && i <= selection.end;
	const inHide = i => hide && i >= hide.from && i <= hide.to;
	const inHi = i => highlight && i >= highlight.from && i <= highlight.to;
	return (
		<p className={cx('wa-qn-quran', 'wa-quran-face', `is-${size}`)} dir="rtl" lang="ar">
			{visible.map((w, k) => {
				const next = visible[k + 1];
				const gapSelected = selection?.gap && selection.start === w.i;
				const masked = inHide(w.i) && !revealed;
				const word = w.mark ? (
					<span key={w.i} className="wa-qn-mark">{w.w}</span>
				) : onWord ? (
					<button
						key={w.i}
						type="button"
						className={cx('wa-qn-word', inSel(w.i) && 'is-selected', inHi(w.i) && 'is-hi')}
						onClick={() => onWord(w.i)}
					>
						{w.w}
					</button>
				) : (
					<span
						key={w.i}
						className={cx('wa-qn-word', masked && 'is-masked', inHi(w.i) && revealed && 'is-hi', inHide(w.i) && revealed && 'is-revealed')}
						style={masked ? { '--len': Math.max(2, Math.min(9, w.w.length / 1.6)) } : undefined}
					>
						{masked ? ' ' : w.w}
					</span>
				);
				if (!next) return word;
				const gap =
					onGap && !next.mark && !w.mark ? (
						<button
							key={`g${w.i}`}
							type="button"
							className={cx('wa-qn-gap', gapSelected && 'is-selected')}
							aria-label="between"
							onClick={() => onGap(w.i, next.i)}
						>
							<span />
						</button>
					) : (
						<span key={`s${w.i}`}> </span>
					);
				return [word, gap];
			})}
		</p>
	);
});

/* ───────────────────────── logger sheet ───────────────────────── */

function Sheet({ title, onClose, children, footer, t }) {
	useEffect(() => {
		const onKey = e => e.key === 'Escape' && onClose();
		document.addEventListener('keydown', onKey);
		const prev = document.documentElement.style.overflow;
		document.documentElement.style.overflow = 'hidden';
		return () => {
			document.removeEventListener('keydown', onKey);
			document.documentElement.style.overflow = prev;
		};
	}, [onClose]);
	return (
		<div className="wa-qn-sheet-wrap" role="presentation">
			<button type="button" className="wa-qn-scrim" aria-label={t.close} onClick={onClose} />
			<section className="wa-qn-sheet" role="dialog" aria-modal="true" aria-label={title}>
				<header className="wa-qn-sheet-head">
					<span className="wa-qn-grabber" aria-hidden="true" />
					<h2>{title}</h2>
					<button type="button" className="wa-qn-icon" onClick={onClose} aria-label={t.close}>
						<X size={20} />
					</button>
				</header>
				<div className="wa-qn-sheet-body">{children}</div>
				{footer ? <footer className="wa-qn-sheet-foot">{footer}</footer> : null}
			</section>
		</div>
	);
}

function Logger({ t, ar, fmt, initial, editing, onSave, onClose }) {
	const [surahId, setSurahId] = useState(initial.surahId);
	const [ayah, setAyah] = useState(initial.ayah);
	const [selection, setSelection] = useState(editing && editing.wordStart != null ? { start: editing.wordStart, end: editing.wordEnd ?? editing.wordStart, gap: editing.spot === 'between' } : null);
	const [spot, setSpot] = useState(editing?.spot || 'whole');
	const [kind, setKind] = useState(editing?.kind || 'forgot');
	const [said, setSaid] = useState(editing?.said || '');
	const [mixRef, setMixRef] = useState(editing?.mixRef || '');
	const [note, setNote] = useState(editing?.note || '');
	const [noteOpen, setNoteOpen] = useState(Boolean(editing?.note));
	const [flash, setFlash] = useState(0);
	const [recent] = useState(() => (Array.isArray(readJson(LS_RECENT, [])) ? readJson(LS_RECENT, []) : []).filter(id => SURAH_BY_ID.has(id)).slice(0, 5));
	const { ayahs, error, retry } = useSurahText(surahId);
	const total = versesCountOf(surahId);
	const words = useMemo(() => (ayahs?.[ayah - 1] ? ayahWords(ayahs[ayah - 1], surahId, ayah) : null), [ayahs, ayah, surahId]);
	const visible = useMemo(() => words?.filter(w => !w.hidden && !w.mark) || [], [words]);

	const resetPosition = () => {
		setSelection(null);
		setSpot('whole');
	};
	const changeAyah = n => {
		const v = Math.min(total, Math.max(1, Number(n) || 1));
		if (v !== ayah) resetPosition();
		setAyah(v);
	};
	const changeSurah = id => {
		setSurahId(id);
		setAyah(1);
		resetPosition();
	};

	// Tap a word = that word; tap a second nearby word = the run between them; tap again = clear.
	const onWord = i => {
		const prev = selection;
		let next;
		if (!prev || prev.gap) next = { start: i, end: i };
		else if (prev.start === i && prev.end === i) next = null;
		else if (i >= prev.start && i <= prev.end) next = { start: i, end: i };
		else if (Math.abs(i - (i < prev.start ? prev.start : prev.end)) <= 6) next = { start: Math.min(prev.start, i), end: Math.max(prev.end, i) };
		else next = { start: i, end: i };
		setSelection(next);
		const startIdx = next ? visible.findIndex(w => w.i === next.start) : -1;
		setSpot(next && startIdx >= 0 ? spotForWord(startIdx, visible.length) : 'whole');
	};
	const onGap = (a, b) => {
		const off = selection?.gap && selection.start === a;
		setSelection(off ? null : { start: a, end: b, gap: true });
		setSpot(off ? 'whole' : 'between');
	};

	const pickSpot = s => {
		setSpot(s);
		if (s === 'link' || s === 'whole') setSelection(null);
		else if (s !== 'between' && selection?.gap) setSelection(null);
	};

	const build = () => ({
		surahId,
		ayah,
		spot,
		kind,
		wordStart: selection ? selection.start : null,
		wordEnd: selection ? selection.end : null,
		said: kind === 'swap' || kind === 'add' || kind === 'tashkeel' ? said : '',
		mixRef: kind === 'mix' ? mixRef : '',
		note,
	});

	const rememberSurah = () => writeJson(LS_RECENT, [surahId, ...recent.filter(id => id !== surahId)].slice(0, 5));

	const save = again => {
		rememberSurah();
		onSave(build(), again);
		if (again) {
			resetPosition();
			setSaid('');
			setMixRef('');
			setNote('');
			setNoteOpen(false);
			setKind('forgot');
			setFlash(Date.now());
		}
	};

	useEffect(() => {
		if (!flash) return undefined;
		const id = window.setTimeout(() => setFlash(0), 1600);
		return () => window.clearTimeout(id);
	}, [flash]);

	const needsSaid = kind === 'swap' || kind === 'add' || kind === 'tashkeel';
	const place = surahPlace(ayah, total);

	return (
		<Sheet
			t={t}
			title={editing ? t.editTitle : t.logTitle}
			onClose={onClose}
			footer={
				editing ? (
					<button type="button" className="wa-qn-btn is-primary is-wide" onClick={() => save(false)}>
						<Check size={18} /> {t.update}
					</button>
				) : (
					<>
						<button type="button" className="wa-qn-btn is-soft" onClick={() => save(false)}>
							{t.save}
						</button>
						<button type="button" className="wa-qn-btn is-primary is-grow" onClick={() => save(true)}>
							{flash ? <><Check size={18} /> {t.saved}</> : <><Plus size={18} /> {t.saveNext}</>}
						</button>
					</>
				)
			}
		>
			<div className="wa-qn-field">
				<label className="wa-qn-label" htmlFor="wa-qn-surah">{t.surah}</label>
				{recent.length ? (
					<div className="wa-qn-chips is-scroll">
						{recent.map(id => (
							<button key={id} type="button" className={cx('wa-qn-chip', id === surahId && 'is-on')} onClick={() => changeSurah(id)}>
								{surahName(id, ar)}
							</button>
						))}
					</div>
				) : null}
				<select id="wa-qn-surah" className="wa-qn-select" value={surahId} onChange={e => changeSurah(Number(e.target.value))}>
					{SURAHS.map(s => (
						<option key={s.id} value={s.id}>
							{fmt.n(s.id)}. {ar ? s.nameAr : s.nameEn}
						</option>
					))}
				</select>
			</div>

			<div className="wa-qn-field">
				<div className="wa-qn-label-row">
					<label className="wa-qn-label" htmlFor="wa-qn-ayah">{t.ayah}</label>
					<span className="wa-qn-pill">{t.places[place]}</span>
				</div>
				<div className="wa-qn-stepper">
					<button type="button" className="wa-qn-step" onClick={() => changeAyah(ayah - 1)} disabled={ayah <= 1} aria-label="-1">
						<Minus size={20} />
					</button>
					<div className="wa-qn-step-val">
						<input
							id="wa-qn-ayah"
							inputMode="numeric"
							pattern="[0-9]*"
							value={ayah}
							onFocus={e => e.target.select()}
							onChange={e => {
								const v = e.target.value.replace(/[^\d٠-٩]/g, '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
								if (v) changeAyah(v);
							}}
						/>
						<span>
							{t.of} {fmt.n(total)}
						</span>
					</div>
					<button type="button" className="wa-qn-step" onClick={() => changeAyah(ayah + 1)} disabled={ayah >= total} aria-label="+1">
						<Plus size={20} />
					</button>
				</div>
				<input
					type="range"
					className="wa-qn-range"
					min={1}
					max={total}
					value={ayah}
					onChange={e => changeAyah(e.target.value)}
					aria-label={t.ayah}
					dir={ar ? 'rtl' : 'ltr'}
				/>
			</div>

			<div className="wa-qn-ayah-box">
				{words ? (
					<>
						<AyahText words={words} selection={selection} onWord={onWord} onGap={onGap} size="lg" />
						<p className="wa-qn-hint">{t.tapHint}</p>
					</>
				) : error ? (
					<p className="wa-qn-hint">
						{t.textError}{' '}
						<button type="button" className="wa-qn-link" onClick={retry}>
							{t.retry}
						</button>
					</p>
				) : (
					<div className="wa-qn-skeleton" aria-label={t.loadingText}>
						<span />
						<span />
					</div>
				)}
			</div>

			<div className="wa-qn-field">
				<span className="wa-qn-label">{t.where}</span>
				<div className="wa-qn-chips">
					{AYAH_SPOTS.map(s => (
						<button key={s} type="button" className={cx('wa-qn-chip', spot === s && 'is-on')} onClick={() => pickSpot(s)}>
							{t.spots[s]}
						</button>
					))}
				</div>
			</div>

			<div className="wa-qn-field">
				<span className="wa-qn-label">{t.what}</span>
				<div className="wa-qn-chips">
					{MISTAKE_KINDS.map(k => (
						<button key={k} type="button" className={cx('wa-qn-chip', `kind-${k}`, kind === k && 'is-on')} onClick={() => setKind(k)}>
							{t.kinds[k]}
						</button>
					))}
				</div>
			</div>

			{needsSaid ? (
				<input className="wa-qn-input wa-qn-quran-input wa-quran-face" dir="rtl" placeholder={kind === 'add' ? t.addedWord : t.said} value={said} onChange={e => setSaid(e.target.value)} />
			) : null}
			{kind === 'mix' ? <input className="wa-qn-input" placeholder={t.mixWith} value={mixRef} onChange={e => setMixRef(e.target.value)} /> : null}
			{noteOpen ? (
				<textarea className="wa-qn-input" rows={2} placeholder={t.note} value={note} onChange={e => setNote(e.target.value)} />
			) : (
				<button type="button" className="wa-qn-link" onClick={() => setNoteOpen(true)}>
					+ {t.note}
				</button>
			)}
		</Sheet>
	);
}

/* ───────────────────────── practice card (surah view) ───────────────────────── */

const MistakeCard = memo(function MistakeCard({ m, t, ar, fmt, ayahs, hideAnswer, onEdit, onDelete, onGrade, onMaster }) {
	const words = useMemo(() => (ayahs?.[m.ayah - 1] ? ayahWords(ayahs[m.ayah - 1], m.surahId, m.ayah) : null), [ayahs, m.ayah, m.surahId]);
	const nextWords = useMemo(() => (m.spot === 'link' && ayahs?.[m.ayah] ? ayahWords(ayahs[m.ayah], m.surahId, m.ayah + 1) : null), [ayahs, m.spot, m.ayah, m.surahId]);
	const wholeAyah = m.spot === 'whole' && m.wordStart == null;
	const prevTail = useMemo(() => {
		if (!wholeAyah || !ayahs || m.ayah < 2) return null;
		return ayahWords(ayahs[m.ayah - 2], m.surahId, m.ayah - 1)
			.filter(x => !x.hidden)
			.slice(-6);
	}, [wholeAyah, ayahs, m.ayah, m.surahId]);
	// Practice: the part you got wrong stays hidden until you have recited it yourself.
	const [revealed, setRevealed] = useState(!hideAnswer);
	useEffect(() => setRevealed(!hideAnswer), [hideAnswer]);
	const [playing, toggleAudio] = useAyahAudio();
	const spot = shownSpot(m, words);
	const isLink = Boolean(m.spot === 'link' && nextWords);
	const hideMain = words && !isLink ? maskFor(m, words) : null;
	const hideNext = isLink ? maskFor(m, nextWords) : null;
	const hi = m.wordStart != null ? { from: m.wordStart, to: m.wordEnd ?? m.wordStart } : hideMain;
	const due = m.dueAt <= Date.now();
	return (
		<article className={cx('wa-qn-card', m.lapses > 1 && 'is-weak', !revealed && 'is-hidden')}>
			<header className="wa-qn-card-head">
				<span className="wa-qn-ayah-no">{fmt.n(m.ayah)}</span>
				<span className="wa-qn-card-tags">
					<span className={cx('wa-qn-pill', `kind-${m.kind}`)}>{wholeAyah && m.kind === 'forgot' ? t.forgotAyah : t.kinds[m.kind]}</span>
					{!wholeAyah ? <span className="wa-qn-pill is-muted">{t.spots[spot]}</span> : null}
					{due ? <span className="wa-qn-pill is-due">{t.dueShort}</span> : null}
				</span>
				<span className="wa-qn-card-actions">
					<button type="button" className="wa-qn-icon is-sm" onClick={() => onEdit(m)} aria-label={t.edit}>
						<Pencil size={16} />
					</button>
					<button type="button" className="wa-qn-icon is-sm" onClick={() => onDelete(m)} aria-label={t.delete}>
						<Trash2 size={16} />
					</button>
				</span>
			</header>
			{prevTail?.length ? <p className="wa-qn-quran wa-quran-face is-cue is-sm" dir="rtl">… {prevTail.map(w => w.w).join(' ')}</p> : null}
			{words ? (
				<button
					type="button"
					className="wa-qn-card-text is-open"
					onClick={() => setRevealed(v => !v)}
					aria-label={revealed ? t.hideAnswer : t.reveal}
				>
					<AyahText words={words} hide={hideMain} highlight={hi} revealed={revealed} size="sm" />
					{isLink ? (
						<>
							<span className="wa-qn-next-label">{t.nextAyah}</span>
							<AyahText words={nextWords.slice(0, Math.max(6, (hideNext?.to ?? 0) + 3))} hide={hideNext} highlight={hideNext} revealed={revealed} size="sm" />
						</>
					) : null}
				</button>
			) : (
				<div className="wa-qn-skeleton">
					<span />
				</div>
			)}
			{m.said || m.mixRef || (revealed && m.note) ? (
				<p className="wa-qn-card-note">
					{m.said ? (
						<span>
							{t.youSaid}: <b className="wa-qn-said wa-quran-face">{m.said}</b>
						</span>
					) : null}
					{m.mixRef ? (
						<span>
							{t.mixedWith}: <b>{m.mixRef}</b>
						</span>
					) : null}
					{revealed && m.note ? <span>{m.note}</span> : null}
				</p>
			) : null}
			{revealed ? (
				<div className="wa-qn-card-acts">
					<button type="button" className="wa-qn-act is-icon" onClick={() => toggleAudio(m.surahId, isLink ? m.ayah + 1 : m.ayah)} aria-label={t.listen}>
						{playing ? <Pause size={17} /> : <Volume2 size={17} />}
					</button>
					<button
						type="button"
						className="wa-qn-act is-again"
						onClick={() => {
							onGrade(m.id, 'again');
							if (hideAnswer) setRevealed(false);
						}}
					>
						<RotateCcw size={16} /> {t.missedAgain}
					</button>
					<button type="button" className="wa-qn-act is-good" onClick={() => onMaster(m.id)}>
						<Check size={17} /> {t.gotIt}
					</button>
				</div>
			) : (
				<button type="button" className="wa-qn-tap" onClick={() => setRevealed(true)}>
					<Eye size={16} /> {t.tapReveal}
				</button>
			)}
			<footer className="wa-qn-card-foot">
				<span className="wa-qn-meter" aria-label={t.box(m.box)}>
					{[1, 2, 3, 4, 5, 6].map(b => (
						<i key={b} className={b <= m.box ? 'is-on' : ''} />
					))}
				</span>
				{m.lapses ? <span className="wa-qn-muted">{t.lapses(m.lapses, fmt.n)}</span> : null}
				<span className="wa-qn-muted wa-qn-push">{whenText(t, Math.max(0, m.dueAt - Date.now()), fmt.n)}</span>
			</footer>
		</article>
	);
});

/* ───────────────────────── review ───────────────────────── */

function Review({ t, ar, fmt, session, mistakes, onGrade, onExit }) {
	const [index, setIndex] = useState(0);
	const [revealed, setRevealed] = useState(false);
	const [tally, setTally] = useState({ again: 0, hard: 0, good: 0 });
	const [playing, toggleAudio] = useAyahAudio();
	const byId = useMemo(() => new Map(mistakes.map(m => [m.id, m])), [mistakes]);
	const id = session.ids[index];
	const m = id ? byId.get(id) : null;
	const { ayahs, error, retry } = useSurahText(m?.surahId);
	const words = useMemo(() => (m && ayahs?.[m.ayah - 1] ? ayahWords(ayahs[m.ayah - 1], m.surahId, m.ayah) : null), [ayahs, m]);
	const nextWords = useMemo(() => (m && m.spot === 'link' && ayahs?.[m.ayah] ? ayahWords(ayahs[m.ayah], m.surahId, m.ayah + 1) : null), [ayahs, m]);
	// A whole ayah forgotten: you start from the ayah before it, so show all of it.
	const wholeAyah = Boolean(m && m.spot === 'whole' && m.wordStart == null);
	const prevTail = useMemo(() => {
		if (!m || !ayahs || m.ayah < 2) return null;
		const w = ayahWords(ayahs[m.ayah - 2], m.surahId, m.ayah - 1).filter(x => !x.hidden);
		return wholeAyah ? w : w.slice(-7);
	}, [ayahs, m, wholeAyah]);

	useEffect(() => {
		const onKey = e => {
			if (e.target?.closest?.('input,textarea,select')) return;
			if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
				e.preventDefault();
				setRevealed(true);
			} else if (revealed && ['1', '2', '3'].includes(e.key)) {
				grade(['again', 'hard', 'good'][Number(e.key) - 1]);
			}
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	});

	if (!m) {
		return (
			<div className="wa-qn-done">
				<div className="wa-qn-done-badge">
					<Check size={34} />
				</div>
				<h2>{t.done}</h2>
				<p className="wa-qn-muted">{t.doneSub}</p>
				<div className="wa-qn-done-stats">
					<span className="kind-again">
						<b>{fmt.n(tally.again)}</b>
						{t.again}
					</span>
					<span className="kind-hard">
						<b>{fmt.n(tally.hard)}</b>
						{t.hard}
					</span>
					<span className="kind-good">
						<b>{fmt.n(tally.good)}</b>
						{t.good}
					</span>
				</div>
				<button type="button" className="wa-qn-btn is-primary is-wide" onClick={onExit}>
					{t.home}
				</button>
			</div>
		);
	}

	function grade(result) {
		onGrade(m.id, result);
		setTally(prev => ({ ...prev, [result]: prev[result] + 1 }));
		setRevealed(false);
		setIndex(i => i + 1);
		sharedAudio?.pause();
	}

	const isLink = m.spot === 'link' && nextWords;
	const hideMain = words && !isLink ? maskFor(m, words) : null;
	const hideNext = isLink ? maskFor(m, nextWords) : null;
	const hi = m.wordStart != null ? { from: m.wordStart, to: m.wordEnd ?? m.wordStart } : hideMain;
	const now = Date.now();
	const spot = shownSpot(m, words);

	return (
		<div className="wa-qn-review">
			<div className="wa-qn-progress" aria-hidden="true">
				<i style={{ inlineSize: `${(index / session.ids.length) * 100}%` }} />
			</div>
			<div className="wa-qn-review-meta">
				<b>{surahName(m.surahId, ar)}</b>
				<span>
					{t.ayah} {fmt.n(m.ayah)}
				</span>
				<span className="wa-qn-muted wa-qn-push">
					{fmt.n(index + 1)} / {fmt.n(session.ids.length)}
				</span>
			</div>
			<div className="wa-qn-chips is-tight">
				<span className={cx('wa-qn-pill', `kind-${m.kind}`)}>{t.kinds[m.kind]}</span>
				<span className="wa-qn-pill is-muted">{t.spots[spot]}</span>
				<span className="wa-qn-pill is-muted">{t.places[surahPlace(m.ayah, versesCountOf(m.surahId))]}</span>
				{m.lapses ? <span className="wa-qn-pill is-warn">{t.lapses(m.lapses, fmt.n)}</span> : null}
			</div>

			<div className="wa-qn-stage" key={m.id}>
				{wholeAyah && prevTail?.length ? (
					<p className="wa-qn-prev-label">
						{t.startFromPrev} ({fmt.n(m.ayah - 1)})
					</p>
				) : null}
				{prevTail?.length ? (
					<p className={cx('wa-qn-quran wa-quran-face', wholeAyah ? 'is-prev' : 'is-cue')} dir="rtl">
						{wholeAyah ? '' : '… '}
						{prevTail.map(w => w.w).join(' ')}
					</p>
				) : null}
				{words ? (
					<AyahText words={words} hide={hideMain} highlight={hi} revealed={revealed} size="lg" />
				) : error ? (
					<p className="wa-qn-hint">
						{t.textError}{' '}
						<button type="button" className="wa-qn-link" onClick={retry}>
							{t.retry}
						</button>
					</p>
				) : (
					<div className="wa-qn-skeleton">
						<span />
						<span />
					</div>
				)}
				{isLink ? (
					<>
						<p className="wa-qn-next-label">{t.nextAyah}</p>
						<AyahText words={nextWords.slice(0, Math.max(6, (hideNext?.to ?? 0) + 3))} hide={hideNext} highlight={hideNext} revealed={revealed} size="lg" />
					</>
				) : null}
				{m.said && (m.kind === 'swap' || m.kind === 'add') ? (
					<p className="wa-qn-warn">
						{t.youSaid}: <b className="wa-qn-said wa-quran-face">{m.said}</b>
					</p>
				) : null}
				{m.mixRef ? (
					<p className="wa-qn-warn">
						{t.mixedWith}: <b>{m.mixRef}</b>
					</p>
				) : null}
				{revealed && m.note ? <p className="wa-qn-muted">{m.note}</p> : null}
			</div>

			<div className="wa-qn-review-bar">
				{revealed ? (
					<>
						<button type="button" className="wa-qn-icon is-ghost" onClick={() => toggleAudio(m.surahId, isLink ? m.ayah + 1 : m.ayah)} aria-label={t.listen}>
							{playing ? <Pause size={20} /> : <Volume2 size={20} />}
						</button>
						{['again', 'hard', 'good'].map(r => (
							<button key={r} type="button" className={cx('wa-qn-grade', `kind-${r}`)} onClick={() => grade(r)}>
								<b>{t[r]}</b>
								<small>{whenText(t, gradeMistake(m, r, now).dueAt - now, fmt.n)}</small>
							</button>
						))}
					</>
				) : (
					<button type="button" className="wa-qn-btn is-primary is-wide is-tall" onClick={() => setRevealed(true)}>
						<Eye size={20} /> {t.reveal}
						<small>{t.recallHint}</small>
					</button>
				)}
			</div>
		</div>
	);
}

/**
 * Words a review card hides. hiddenRange counts visible words from 0, while mistakes store
 * raw indexes (ayah 1 starts after a hidden basmala), so shift in and out by that offset.
 */
function maskFor(m, words) {
	const visible = words.filter(w => !w.hidden);
	const offset = visible[0]?.i ?? 0;
	const local =
		m.spot === 'link' || m.wordStart == null
			? m
			: { ...m, wordStart: m.wordStart - offset, wordEnd: (m.wordEnd ?? m.wordStart) - offset };
	const r = hiddenRange(local, visible.length);
	return r ? { from: r.from + offset, to: r.to + offset } : null;
}

/* ───────────────────────── surah view ───────────────────────── */

const LS_SURAH_VIEW = 'so7ba:quran-revision:surah-view:v1';
const DEFAULT_VIEW = { place: 'all', kind: 'all', status: 'all', sort: 'mushaf', hide: true };

function FilterSheet({ t, value, onChange, onClose }) {
	const group = (label, key, options) => (
		<div className="wa-qn-field">
			<span className="wa-qn-label">{label}</span>
			<div className="wa-qn-chips">
				{options.map(([id, text]) => (
					<button key={id} type="button" className={cx('wa-qn-chip', value[key] === id && 'is-on')} onClick={() => onChange({ ...value, [key]: id })}>
						{text}
					</button>
				))}
			</div>
		</div>
	);
	return (
		<Sheet
			t={t}
			title={t.filters}
			onClose={onClose}
			footer={
				<>
					<button type="button" className="wa-qn-btn is-soft" onClick={() => onChange({ ...DEFAULT_VIEW, hide: value.hide })}>
						{t.clearFilters}
					</button>
					<button type="button" className="wa-qn-btn is-primary is-grow" onClick={onClose}>
						{t.doneBtn}
					</button>
				</>
			}
		>
			{group(t.statusLabel, 'status', SURAH_STATUSES.map(s => [s, t.statuses[s]]))}
			{group(t.placeLabel, 'place', [['all', t.all], ...['start', 'middle', 'end'].map(p => [p, t.places[p]])])}
			{group(t.kindLabel, 'kind', [['all', t.all], ...MISTAKE_KINDS.map(k => [k, t.kinds[k]])])}
			{group(t.sortLabel, 'sort', SURAH_SORTS.map(s => [s, t.sorts[s]]))}
		</Sheet>
	);
}

function SurahView({ t, ar, fmt, surahId, mistakes, onEdit, onDelete, onWarmup, onLog, onGrade, onMaster, onReopen }) {
	const [opts, setOpts] = useState(() => {
		const saved = typeof window !== 'undefined' ? readJson(LS_SURAH_VIEW, null) : null;
		return saved && typeof saved === 'object' ? { ...DEFAULT_VIEW, ...saved } : DEFAULT_VIEW;
	});
	useEffect(() => writeJson(LS_SURAH_VIEW, opts), [opts]);
	const [filterOpen, setFilterOpen] = useState(false);
	const [masteredOpen, setMasteredOpen] = useState(false);
	const { ayahs } = useSurahText(surahId);
	const total = versesCountOf(surahId);
	const view = useMemo(() => surahView(mistakes, surahId, total, opts), [mistakes, surahId, total, opts]);
	const activeFilters = ['place', 'kind', 'status'].filter(k => opts[k] !== 'all').length + (opts.sort !== 'mushaf' ? 1 : 0);
	const pct = view.total ? Math.round((view.mastered.length / view.total) * 100) : 0;
	return (
		<div className="wa-qn-page">
			<section className="wa-qn-progress-card">
				<div className="wa-qn-progress-top">
					<b>{t.masteredOf(view.mastered.length, view.total, fmt.n)}</b>
					{view.due ? <span className="wa-qn-pill is-due">{t.dueCount(view.due, fmt.n)}</span> : null}
				</div>
				<div className="wa-qn-progress-bar" aria-hidden="true">
					<i style={{ inlineSize: `${pct}%` }} />
				</div>
			</section>

			<div className="wa-qn-warm-row">
				<button type="button" className="wa-qn-hero is-warm" onClick={onWarmup} disabled={!view.active.length}>
					<Flame size={22} />
					<span>
						<b>{t.warmup}</b>
						<small>
							{t.warmupHint} · {t.mistakesCount(view.active.length, fmt.n)}
						</small>
					</span>
					<ChevronLeft size={20} className={ar ? '' : 'wa-qn-flip'} />
				</button>
				<button type="button" className="wa-qn-more" onClick={() => setFilterOpen(true)} aria-label={t.filters} title={t.filters}>
					<MoreHorizontal size={22} />
					{activeFilters ? <span className="wa-qn-more-badge">{fmt.n(activeFilters)}</span> : null}
				</button>
			</div>

			<div className="wa-qn-list-bar">
				<span className="wa-qn-muted">
					{opts.sort !== 'mushaf' ? t.sorts[opts.sort] : t.sorts.mushaf}
					{opts.status !== 'all' ? ` · ${t.statuses[opts.status]}` : ''}
				</span>
				<button type="button" className={cx('wa-qn-toggle', opts.hide && 'is-on')} onClick={() => setOpts(o => ({ ...o, hide: !o.hide }))} aria-pressed={opts.hide}>
					{opts.hide ? <EyeOff size={16} /> : <Eye size={16} />}
					{opts.hide ? t.answersHidden : t.answersShown}
				</button>
			</div>

			<div className="wa-qn-list">
				{view.active.map(m => (
					<MistakeCard
						key={m.id}
						m={m}
						t={t}
						ar={ar}
						fmt={fmt}
						ayahs={ayahs}
						hideAnswer={opts.hide}
						onEdit={onEdit}
						onDelete={onDelete}
						onGrade={onGrade}
						onMaster={onMaster}
					/>
				))}
				{!view.active.length ? (
					<p className="wa-qn-empty-line">{view.total && view.mastered.length === view.total ? t.allMastered : t.noMatch}</p>
				) : null}
			</div>

			{view.mastered.length ? (
				<section className={cx('wa-qn-mastered', masteredOpen && 'is-open')}>
					<button type="button" className="wa-qn-mastered-head" onClick={() => setMasteredOpen(v => !v)} aria-expanded={masteredOpen}>
						<Check size={18} />
						<b>
							{t.masteredTitle} ({fmt.n(view.mastered.length)})
						</b>
						<ChevronDown size={18} className="wa-qn-chev-down" />
					</button>
					{masteredOpen ? (
						<ul>
							{view.mastered.map(m => {
								const w = ayahs?.[m.ayah - 1] ? ayahWords(ayahs[m.ayah - 1], m.surahId, m.ayah).filter(x => !x.hidden).slice(0, 6) : [];
								return (
									<li key={m.id}>
										<span className="wa-qn-ayah-no">{fmt.n(m.ayah)}</span>
										<span className="wa-qn-quran wa-quran-face is-line" dir="rtl">
											{w.map(x => x.w).join(' ')}…
										</span>
										<button type="button" className="wa-qn-link" onClick={() => onReopen(m.id)}>
											{t.backToReview}
										</button>
									</li>
								);
							})}
						</ul>
					) : null}
				</section>
			) : null}

			<button type="button" className="wa-qn-btn is-soft is-wide" onClick={onLog}>
				<Plus size={18} /> {t.addHere}
			</button>
			{filterOpen ? <FilterSheet t={t} value={opts} onChange={setOpts} onClose={() => setFilterOpen(false)} /> : null}
		</div>
	);
}

/* ───────────────────────── home ───────────────────────── */

function Home({ t, ar, fmt, mistakes, onReview, onOpenSurah }) {
	const now = Date.now();
	const stats = useMemo(() => overallStats(mistakes, now), [mistakes]); // eslint-disable-line react-hooks/exhaustive-deps
	const summaries = useMemo(() => surahSummaries(mistakes, versesCountOf, now), [mistakes]); // eslint-disable-line react-hooks/exhaustive-deps
	const next = stats.due ? null : nextDueAt(mistakes, now);

	if (!stats.total) {
		return (
			<div className="wa-qn-page">
				<div className="wa-qn-empty">
					<BookOpenText size={36} />
					<h2>{t.emptyTitle}</h2>
					<ol>
						{t.emptySteps.map((s, i) => (
							<li key={i}>
								<b>{fmt.n(i + 1)}</b>
								<span>{s}</span>
							</li>
						))}
					</ol>
				</div>
			</div>
		);
	}

	return (
		<div className="wa-qn-page">
			<section className={cx('wa-qn-hero', stats.due && 'is-due')}>
				<div className="wa-qn-hero-num">
					<b>{fmt.n(stats.due)}</b>
					<span>{stats.due ? t.due : t.dueNone}</span>
					{next ? (
						<small>
							{t.nextIn}: {whenText(t, next - now, fmt.n)}
						</small>
					) : null}
				</div>
				{stats.due ? (
					<button type="button" className="wa-qn-btn is-primary" onClick={onReview}>
						{t.startReview}
					</button>
				) : null}
				<div className="wa-qn-stats">
					<span>
						<b>{fmt.n(stats.total)}</b> {t.total}
					</span>
					<span>
						<b>{fmt.n(stats.mastered)}</b> {t.mastered}
					</span>
					<span>
						<b>{fmt.n(stats.reviewedToday)}</b> {t.today}
					</span>
				</div>
			</section>

			<h3 className="wa-qn-section">{t.bySurah}</h3>
			<div className="wa-qn-surahs">
				{summaries.map(s => (
					<button key={s.surahId} type="button" className="wa-qn-surah" onClick={() => onOpenSurah(s.surahId)}>
						<span className="wa-qn-surah-no">{fmt.n(s.surahId)}</span>
						<span className="wa-qn-surah-main">
							<b>{surahName(s.surahId, ar)}</b>
							<span className="wa-qn-thirds" aria-hidden="true">
								{['start', 'middle', 'end'].map(p => (
									<i key={p} style={{ '--v': s.places[p] / Math.max(1, s.total) }} />
								))}
							</span>
						</span>
						<span className="wa-qn-surah-side">
							<span>{t.mistakesCount(s.total, fmt.n)}</span>
							{s.due ? <span className="wa-qn-pill is-due">{t.dueCount(s.due, fmt.n)}</span> : null}
						</span>
						<ChevronLeft size={18} className={cx('wa-qn-chev', !ar && 'wa-qn-flip')} />
					</button>
				))}
			</div>
		</div>
	);
}

/* ───────────────────────── shell ───────────────────────── */

function MistakesNotebook({ locale = 'ar', onExit, embedded = false, onInnerChange }) {
	const ar = String(locale).toLowerCase().startsWith('ar');
	const t = ar ? L.ar : L.en;
	const fmt = useFormat(ar);
	const [list, api] = useNotebook();
	const mistakes = useMemo(() => (list || []).filter(isActive), [list]);
	const [view, setView] = useState({ name: 'home' });
	const [logger, setLogger] = useState(null);
	const [undo, setUndo] = useState(null);
	const scrollRef = useRef(null);

	const go = useCallback(next => {
		setView(next);
		requestAnimationFrame(() => {
			const el = scrollRef.current?.closest('.wa-qn')?.parentElement;
			if (el) el.scrollTop = 0;
			window.scrollTo(0, 0);
		});
	}, []);

	const lastSurah = () => {
		if (view.name === 'surah') return view.surahId;
		const recent = readJson(LS_RECENT, []);
		return (Array.isArray(recent) && SURAH_BY_ID.has(recent[0]) && recent[0]) || 6;
	};
	const openLogger = (surahId = lastSurah()) => setLogger({ initial: { surahId, ayah: 1 }, editing: null });
	const onEdit = useCallback(m => setLogger({ initial: { surahId: m.surahId, ayah: m.ayah }, editing: m }), []);
	const onDelete = useCallback(
		m => {
			api.remove(m.id);
			setUndo({ id: m.id, at: Date.now() });
		},
		[api],
	);

	useEffect(() => {
		if (!undo) return undefined;
		const id = window.setTimeout(() => setUndo(null), 5000);
		return () => window.clearTimeout(id);
	}, [undo]);

	const saveFromLogger = (fields, again) => {
		if (logger?.editing) {
			api.update(logger.editing.id, fields);
			setLogger(null);
			return;
		}
		const m = createMistake(fields);
		if (m) api.add(m);
		if (!again) setLogger(null);
	};

	const startReview = () => go({ name: 'review', ids: dueQueue(mistakes).map(m => m.id), from: { name: 'home' } });
	const startWarmup = surahId => go({ name: 'review', ids: surahWarmup(mistakes, surahId).map(m => m.id), from: { name: 'surah', surahId } });

	/*
	 * Phone back button / edge swipe steps back inside the tab (review → surah → home) before
	 * it leaves the tab: one history entry stands for "inside the tab"; it is re-armed after
	 * each in-tab step and dropped when the user goes home with the on-screen arrow.
	 */
	const viewRef = useRef(view);
	viewRef.current = view;
	const inner = view.name !== 'home';
	const ignorePop = useRef(false);
	useEffect(() => {
		const onPop = () => {
			if (ignorePop.current) {
				ignorePop.current = false;
				return;
			}
			const v = viewRef.current;
			if (v.name === 'home') return;
			const up = v.name === 'review' && v.from ? v.from : { name: 'home' };
			setView(up);
			if (up.name !== 'home') window.history.pushState({ ...(window.history.state || {}), waQuran: 1 }, '');
		};
		window.addEventListener('popstate', onPop);
		return () => window.removeEventListener('popstate', onPop);
	}, []);
	useEffect(() => {
		if (inner && !window.history.state?.waQuran) window.history.pushState({ ...(window.history.state || {}), waQuran: 1 }, '');
		if (!inner && window.history.state?.waQuran) {
			ignorePop.current = true;
			window.history.back();
		}
	}, [inner]);
	useEffect(
		() => () => {
			if (window.history.state?.waQuran) window.history.back();
		},
		[],
	);

	const back = () => {
		if (view.name === 'home') onExit?.();
		else go(view.name === 'review' && view.from ? view.from : { name: 'home' });
	};

	useEffect(() => {
		onInnerChange?.(view.name !== 'home');
	}, [view.name, onInnerChange]);

	const title = view.name === 'surah' ? surahName(view.surahId, ar) : view.name === 'review' ? t.startReview : t.title;

	return (
		<div className="wa-qn" dir={ar ? 'rtl' : 'ltr'} ref={scrollRef}>
			{embedded && view.name === 'home' ? null : (
			<header className="wa-qn-header">
				{onExit || view.name !== 'home' ? (
					<button type="button" className="wa-qn-icon" onClick={back} aria-label={t.back}>
						<ArrowRight size={22} className={ar ? '' : 'wa-qn-flip'} />
					</button>
				) : null}
				<div className="wa-qn-header-title">
					<h1>{title}</h1>
					{view.name === 'home' ? <p>{t.subtitle}</p> : null}
				</div>
				{view.name === 'home' && !embedded ? (
					<a className="wa-qn-icon" href={`/${locale}/dashboard/quran-revision`} aria-label={t.studio} title={t.studio}>
						<BookOpenText size={20} />
					</a>
				) : null}
			</header>
			)}

			{list == null ? null : view.name === 'review' ? (
				<Review key={view.ids.join(',')} t={t} ar={ar} fmt={fmt} session={view} mistakes={mistakes} onGrade={api.grade} onExit={back} />
			) : view.name === 'surah' ? (
				<SurahView
					t={t}
					ar={ar}
					fmt={fmt}
					surahId={view.surahId}
					mistakes={mistakes}
					onEdit={onEdit}
					onDelete={onDelete}
					onWarmup={() => startWarmup(view.surahId)}
					onLog={() => openLogger(view.surahId)}
					onGrade={api.grade}
					onMaster={api.master}
					onReopen={api.reopen}
				/>
			) : (
				<Home t={t} ar={ar} fmt={fmt} mistakes={mistakes} onReview={startReview} onOpenSurah={id => go({ name: 'surah', surahId: id })} />
			)}

			{view.name !== 'review' && list != null ? (
				<div className="wa-qn-fab-bar">
					<button type="button" className="wa-qn-fab" onClick={() => openLogger()}>
						<Plus size={22} /> {t.log}
					</button>
				</div>
			) : null}

			{undo ? (
				<div className="wa-qn-snack" role="status">
					<span>{t.deleted}</span>
					<button
						type="button"
						onClick={() => {
							api.restore(undo.id);
							setUndo(null);
						}}
					>
						{t.undo}
					</button>
				</div>
			) : null}

			{logger ? (
				<Logger
					key={logger.editing?.id || 'new'}
					t={t}
					ar={ar}
					fmt={fmt}
					initial={logger.initial}
					editing={logger.editing}
					onSave={saveFromLogger}
					onClose={() => setLogger(null)}
				/>
			) : null}
		</div>
	);
}

/* ───────────────────────── tab shell ───────────────────────── */


/**
 * Three sections: the mushaf (page reader, the default — it brings its own controls), the
 * repeat-revision page (reciters, repeats, word marks) and the mistakes log. The revision
 * page stays mounted once opened so its recitation keeps playing while you check the log.
 */
export default function WhatsAppQuranTab({ locale = 'ar', onExit }) {
	const ar = String(locale).toLowerCase().startsWith('ar');
	const t = ar ? L.ar : L.en;
	const fmt = useFormat(ar);
	const [section, setSection] = useState(() => {
		const saved = typeof window !== 'undefined' ? readJson(LS_SECTION, 'mushaf') : 'mushaf';
		return SECTIONS.includes(saved) ? saved : 'mushaf';
	});
	const [mushafOpened, setMushafOpened] = useState(section !== 'notes');
	const [notesInner, setNotesInner] = useState(false);
	const [due, setDue] = useState(0);

	useEffect(() => {
		writeJson(LS_SECTION, section);
		if (section !== 'notes') setMushafOpened(true);
		else setNotesInner(false);
		window.scrollTo(0, 0);
		// Count marks made in the mushaf too, before the log has turned them into entries.
		const recount = () => setDue(overallStats(syncWithMarks(normalizeMistakes(readJson(LS_MISTAKES, [])), readJson(LS_STUDIO_MARKS, null))).due);
		recount();
		const id = window.setInterval(recount, 15_000);
		window.addEventListener(NOTEBOOK_EVENT, recount);
		return () => {
			window.clearInterval(id);
			window.removeEventListener(NOTEBOOK_EVENT, recount);
		};
	}, [section]);

	const showHeader = section === 'notes' && !notesInner;

	return (
		<div className="wa-qr" dir={ar ? 'rtl' : 'ltr'} data-section={section}>
			<style>{QURAN_FONT_CSS}</style>
			{showHeader ? (
				<header className="wa-qn-header wa-qr-head">
					{onExit ? (
						<button type="button" className="wa-qn-icon" onClick={onExit} aria-label={t.back}>
							<ArrowRight size={22} className={ar ? '' : 'wa-qn-flip'} />
						</button>
					) : null}
					<h1 className="wa-qr-title">{t.tabTitle}</h1>
					<div className="wa-qr-seg" role="tablist" aria-label={t.tabTitle}>
						{[
							['mushaf', t.tabMushaf],
							['revise', t.tabRevise],
							['notes', t.tabMistakes],
						].map(([id, label]) => (
							<button
								key={id}
								type="button"
								role="tab"
								aria-selected={section === id}
								className={cx('wa-qr-seg-btn', section === id && 'is-on')}
								onClick={() => setSection(id)}
							>
								{label}
								{id === 'notes' && due ? <span className="wa-qr-badge">{fmt.n(due)}</span> : null}
							</button>
						))}
					</div>
				</header>
			) : null}
			{/*
			 * Mushaf and Revise are the same page reader (revise = repeats, rounds, hide-to-memorise).
			 * Kept mounted once opened: back from the log, the page is exactly where you left it.
			 */}
			{mushafOpened ? (
				<div className="wa-qr-mushaf" hidden={section === 'notes'}>
					<MushafReader
						locale={locale}
						onExit={onExit}
						onOpen={setSection}
						onMode={m => setSection(m === 'revise' ? 'revise' : 'mushaf')}
						mode={section === 'revise' ? 'revise' : 'read'}
						due={due}
						active={section !== 'notes'}
					/>
				</div>
			) : null}
			{section === 'notes' ? <MistakesNotebook locale={locale} onExit={() => setSection('mushaf')} embedded onInnerChange={setNotesInner} /> : null}
		</div>
	);
}
