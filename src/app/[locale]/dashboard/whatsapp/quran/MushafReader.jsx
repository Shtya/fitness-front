'use client';

/**
 * Madinah-mushaf page reader for the WhatsApp Quran tab.
 * One page fills the screen; swipe sideways to turn pages (only the page and its neighbours
 * are rendered). A tap shows / hides the controls so the page gets the whole screen.
 * Index (surahs, juz, page number) jumps anywhere. Long-press a word — or turn on
 * "Mark" and tap — to log a mistake straight into "My mistakes". Recitation follows
 * the page and turns it for you.
 */

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Bookmark, BookOpenText, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, List, Pause, Play, Repeat, Search, Settings2, TextSelect, Trash2, X } from 'lucide-react';
import { playableAyahUrl, prefetchAyahAudio } from '../../quran-revision/ayah-audio-cache';
import { SURAHS, BUILTIN_RECITERS, ayahAudioUrl } from '../../quran-revision/quran-data';
import {
	BASMALA,
	JUZ_START_PAGES,
	PAGE_COUNT,
	SURAH_START_PAGES,
	cachedPage,
	clampPage,
	juzOfPage,
	loadPage,
	prefetchAround,
	surahAtPage,
} from './mushaf-pages';
import { spotForWord, isActive } from './quran-mistakes';
import { NOTEBOOK_EVENT, readMistakes, saveNewMistake, deleteMistake } from './quran-notebook-store';
import { loadSurahText, logIndexForPosition, positionForLogIndex } from './quran-text';
import { RUB_STARTS } from './rub-starts';
import { DEFAULT_REVISE, ayahList, inSpan, isVeiled, nextStep, pageRange, quarterRange, surahRange, upcomingKeys } from './revise-engine';
import ReviseSheet from './ReviseSheet';
import './mushaf.css';
import './mushaf-range.css';
import './mushaf-revise.css';

/** Quarters (rub' al-hizb) that begin inside each surah: { n (1…240), a, page, words }. */
const RUBS_BY_SURAH = new Map();
RUB_STARTS.forEach(([s, a, page, words], i) => {
	if (!RUBS_BY_SURAH.has(s)) RUBS_BY_SURAH.set(s, []);
	RUBS_BY_SURAH.get(s).push({ n: i + 1, a, page, words });
});
/** Quarter n → "Hizb 12", "¼ Hizb 12", "½ Hizb 12", "¾ Hizb 12" (juz in brackets). */
function quarterLabel(n, t, fmt) {
	const hizb = Math.floor((n - 1) / 4) + 1;
	const part = (n - 1) % 4;
	const juz = Math.floor((n - 1) / 8) + 1;
	return `${t.quarterParts[part]} ${t.hizb} ${fmt(hizb)} · ${t.juz} ${fmt(juz)}`.trim();
}

const LS_PAGE = 'so7ba:quran-revision:mushaf-page:v1';
const LS_RATIO = 'so7ba:quran-revision:mushaf-ratio:v1';
const LS_STUDIO_PREFS = 'so7ba:quran-revision:prefs:v2';
const LS_REVISE = 'so7ba:quran-revision:wa-revise:v1';
const SURAH_BY_ID = new Map(SURAHS.map(s => [s.id, s]));
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const cx = (...p) => p.filter(Boolean).join(' ');
/** Widest mushaf line ÷ font size in the Hafs face (refined on the device after the first page). */
const DEFAULT_RATIO = 13.6;

const L = {
	ar: {
		back: 'رجوع',
		index: 'الفهرس',
		studio: 'مراجعة بالتكرار',
		notes: 'أخطائي',
		juz: 'الجزء',
		page: 'صفحة',
		surahs: 'السور',
		juzs: 'الأجزاء',
		search: 'ابحث عن سورة',
		goPage: 'اذهب لصفحة',
		go: 'اذهب',
		ayat: 'آية',
		mark: 'تمييز الأخطاء',
		pageWord: 'الصفحة',
		markOn: 'اضغط على الكلمة اللي غلطت فيها',
		selectRange: 'حدّد من كلمة لكلمة',
		reviseThis: 'راجع الجزء ده بالتكرار',
		revising: 'مراجعة',
		backToMushaf: 'رجوع للمصحف',
		ayahSpan: (a, b) => `آية ${a} – ${b}`,
		repeatShort: (n, f) => `التكرار ×${f(n)}`,
		round: 'الدورة',
		nextAyahBtn: 'الآية اللي بعدها',
		prevAyahBtn: 'الآية اللي قبلها',
		reviseDone: 'خلصت المراجعة، ما شاء الله',
		again: 'تاني',
		pickEnd: 'اضغط على آخر كلمة · تقدر تقلب الصفحة',
		sameSurah: 'اختار آخر كلمة في نفس السورة',
		cancel: 'إلغاء',
		repick: 'غيّر التحديد',
		rangeTitle: 'الجزء المحدد',
		fromTo: (a, b) => `من آية ${a} إلى آية ${b}`,
		wordsCount: (n, f) => (n === 1 ? 'كلمة' : n === 2 ? 'كلمتين' : `${f(n)} ${n <= 10 ? 'كلمات' : 'كلمة'}`),
		rangeSplit: (n, f) => `سجّلها غلطة (هتتسجل في ${f(n)} آيات، كل آية لوحدها):`,
		savedMany: (n, f) => `اتسجلت ${f(n)} غلطات في أخطائي`,
		rangeKinds: [
			{ id: 'forgot', label: 'نسيت الجزء ده / وقفت فيه', hint: 'الآيات اللي نسيتها كلها بتتراجع من الآية اللي قبلها' },
			{ id: 'swap', label: 'قلت كلام بدله' },
			{ id: 'add', label: 'زوّدت كلام هنا' },
			{ id: 'tashkeel', label: 'تشكيل غلط فيه' },
		],
		play: 'تشغيل',
		pause: 'إيقاف',
		playFrom: 'شغّل من هنا',
		quarters: 'أرباع',
		showQuarters: 'أرباع السورة',
		hizb: 'الحزب',
		quarterParts: ['', 'ربع', 'نصف', 'ثلاثة أرباع'],
		tafsir: 'التفسير',
		tafsirSource: 'التفسير الميسر',
		logAs: 'سجّلها غلطة:',
		ayah: 'آية',
		saved: 'اتسجلت في أخطائي',
		view: 'عرض',
		undo: 'تراجع',
		loading: 'بيحمّل الصفحة…',
		offline: 'الصفحة مش متاحة دلوقتي',
		retry: 'حاول تاني',
		removeMark: 'إزالة الغلطة',
		prev: 'الصفحة السابقة',
		next: 'الصفحة التالية',
		kinds: [
			{ id: 'ayah', label: 'نسيت الآية كلها', hint: 'في المراجعة تبدأ من الآية اللي قبلها، وتسمّع دي' },
			{ id: 'forgot', label: 'وقفت عند الكلمة دي', hint: 'نسيت الكلمة أو اللي بعدها', wordOnly: true },
			{ id: 'swap', label: 'قلت كلمة بدلها', wordOnly: true },
			{ id: 'add', label: 'زوّدت كلمة هنا', wordOnly: true },
			{ id: 'tashkeel', label: 'تشكيل غلط', wordOnly: true },
			{ id: 'link', label: 'نسيت الربط بالآية الجاية', hint: 'أول الآية اللي بعدها' },
		],
	},
	en: {
		back: 'Back',
		index: 'Index',
		studio: 'Repeat revision',
		notes: 'My mistakes',
		juz: 'Juz',
		page: 'Page',
		surahs: 'Surahs',
		juzs: 'Juz',
		search: 'Search a surah',
		goPage: 'Go to page',
		go: 'Go',
		ayat: 'ayat',
		mark: 'Mark mistakes',
		pageWord: 'Page',
		markOn: 'Tap the word you got wrong',
		selectRange: 'Select from word to word',
		reviseThis: 'Revise this part with repeats',
		revising: 'Revising',
		backToMushaf: 'Back to the mushaf',
		ayahSpan: (a, b) => `ayah ${a} – ${b}`,
		repeatShort: (n, f) => `Repeat ×${f(n)}`,
		round: 'round',
		nextAyahBtn: 'Next ayah',
		prevAyahBtn: 'Previous ayah',
		reviseDone: 'Revision finished',
		again: 'Again',
		pickEnd: 'Tap the last word · you can turn the page',
		sameSurah: 'Pick the last word in the same surah',
		cancel: 'Cancel',
		repick: 'Change selection',
		rangeTitle: 'Selected part',
		fromTo: (a, b) => `ayah ${a} to ${b}`,
		wordsCount: (n, f) => `${f(n)} ${n === 1 ? 'word' : 'words'}`,
		rangeSplit: (n, f) => `Log a mistake (saved as ${f(n)} entries, one per ayah):`,
		savedMany: (n, f) => `${f(n)} mistakes saved to My mistakes`,
		rangeKinds: [
			{ id: 'forgot', label: 'Forgot this part / got stuck', hint: 'Fully forgotten ayat are reviewed from the ayah before' },
			{ id: 'swap', label: 'Said something else' },
			{ id: 'add', label: 'Added words here' },
			{ id: 'tashkeel', label: 'Wrong harakat in it' },
		],
		play: 'Play',
		pause: 'Pause',
		playFrom: 'Play from here',
		quarters: 'quarters',
		showQuarters: 'Quarters of this surah',
		hizb: 'Hizb',
		quarterParts: ['', '¼', '½', '¾'],
		tafsir: 'Tafsir',
		tafsirSource: 'Al-Muyassar tafsir',
		logAs: 'Log a mistake:',
		ayah: 'Ayah',
		saved: 'Saved to My mistakes',
		view: 'View',
		undo: 'Undo',
		loading: 'Loading the page…',
		offline: 'This page is not available right now',
		retry: 'Retry',
		removeMark: 'Remove mistake',
		prev: 'Previous page',
		next: 'Next page',
		kinds: [
			{ id: 'ayah', label: 'Forgot the whole ayah', hint: 'Review starts from the ayah before it' },
			{ id: 'forgot', label: 'Got stuck at this word', hint: 'Forgot it or what follows', wordOnly: true },
			{ id: 'swap', label: 'Said another word', wordOnly: true },
			{ id: 'add', label: 'Added a word here', wordOnly: true },
			{ id: 'tashkeel', label: 'Wrong harakat', wordOnly: true },
			{ id: 'link', label: 'Lost the link to the next ayah', hint: 'Start of the next ayah' },
		],
	},
};

function readJson(key, fallback) {
	try {
		const raw = localStorage.getItem(key);
		return raw == null ? fallback : JSON.parse(raw);
	} catch {
		return fallback;
	}
}
function writeJson(key, value) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		/* ignore */
	}
}

const surahName = (id, ar) => {
	const s = SURAH_BY_ID.get(id);
	return s ? (ar ? s.nameAr : s.nameEn) : '';
};

/* ───────── range selection helpers ───────── */

/** Mushaf order of two word refs { s, a, p } (the ayah-end mark sorts after its words). */
const cmpRef = (x, y) => x.s - y.s || x.a - y.a || x.p - y.p;
function inRange(w, range) {
	if (!range?.start) return false;
	if (!range.end) return cmpRef(w, range.start) === 0;
	return cmpRef(w, range.start) >= 0 && cmpRef(w, range.end) <= 0;
}

/* ───────── one page ───────── */

const MushafPage = memo(function MushafPage({ page, data, error, onRetry, t, fmt, ar, playingKey, marks, selectedKey, onMeasure, labelNumber, fsKey, range, veil }) {
	const ref = useRef(null);
	const [fit, setFit] = useState(null); // { short: 'n,n', squeeze: { n: scale } }

	/*
	 * Fit each line like a printed page: text is sized for a typical full line, the odd
	 * extra-long line is scaled down a touch, and a surah's short closing line is centred
	 * instead of stretched. Widths are measured in em so they do not depend on font size.
	 */
	useIsoLayoutEffect(() => {
		if (!data || !ref.current) return undefined;
		let alive = true;
		const run = () => {
			if (!alive || !ref.current) return;
			const root = ref.current;
			const fs = parseFloat(getComputedStyle(root).fontSize) || 16;
			const availEm = (root.querySelector('.mr-lines')?.clientWidth || 1) / fs;
			const short = [];
			const squeeze = {};
			const full = [];
			root.querySelectorAll('.mr-line.is-text').forEach(line => {
				const lineFs = parseFloat(getComputedStyle(line).fontSize) || fs;
				let w = 0;
				line.querySelectorAll(':scope > span').forEach(sp => {
					w += sp.getBoundingClientRect().width;
				});
				const em = w / lineFs + (line.children.length - 1) * 0.1;
				if (em < availEm * 0.72) short.push(line.dataset.n);
				else full.push(em);
				if (em > availEm * 0.995) squeeze[line.dataset.n] = Number(((availEm * 0.99) / em).toFixed(4));
			});
			if (!data.compact && full.length >= 4) {
				full.sort((a, b) => a - b);
				onMeasure?.(full[Math.floor(full.length * 0.8)]);
			}
			const next = { short: short.join(','), squeeze };
			setFit(prev => (prev && prev.short === next.short && JSON.stringify(prev.squeeze) === JSON.stringify(squeeze) ? prev : next));
		};
		// Measure with the mushaf face itself, not the fallback shown while it downloads.
		const fontPx = parseFloat(getComputedStyle(ref.current).fontSize) || 20;
		Promise.resolve(document.fonts?.load?.(`${fontPx}px WaQuranHafs`, 'بسم'))
			.then(() => document.fonts?.ready)
			.then(run, run);
		return () => {
			alive = false;
		};
	}, [data, onMeasure, fsKey]);

	if (!data) {
		return (
			<div className="mr-page wa-quran-face is-empty" aria-busy={!error}>
				{error ? (
					<p className="mr-page-msg">
						{t.offline}{' '}
						<button type="button" className="mr-link" onClick={() => onRetry(page)}>
							{t.retry}
						</button>
					</p>
				) : (
					<div className="mr-skel" aria-label={t.loading}>
						{Array.from({ length: 15 }, (_, i) => (
							<span key={i} style={{ inlineSize: `${i % 5 === 4 ? 62 : 100}%` }} />
						))}
					</div>
				)}
				<span className="mr-pno">{fmt(page)}</span>
			</div>
		);
	}

	const shortSet = new Set((fit?.short || '').split(',').filter(Boolean));
	const squeeze = fit?.squeeze || {};

	return (
		<div ref={ref} className={cx('mr-page', 'wa-quran-face', data.compact && 'is-compact')} lang="ar" dir="rtl">
			<div className="mr-lines">
				{data.lines.map(line => {
					if (line.kind === 'blank') return <div key={line.n} className="mr-line is-blank" />;
					if (line.kind === 'header') {
						return (
							<div key={line.n} className={cx('mr-line', 'is-header', line.basmala && 'with-basmala')}>
								<span className="mr-frame">
									<span className="mr-frame-name">سُورَةُ {surahName(line.s, true)}</span>
								</span>
							</div>
						);
					}
					if (line.kind === 'basmala') {
						return (
							<div key={line.n} className="mr-line is-basmala">
								<span>{BASMALA}</span>
							</div>
						);
					}
					return (
						<div
							key={line.n}
							data-n={line.n}
							className={cx('mr-line', 'is-text', shortSet.has(String(line.n)) && 'is-short')}
							style={squeeze[line.n] ? { fontSize: `${squeeze[line.n]}em` } : undefined}
						>
							{line.words.map(w => {
								const key = `${w.s}:${w.a}`;
								const wk = `${key}:${w.p}`;
								if (w.end) {
									return (
										<span
											key={wk}
											className={cx('mr-end', playingKey === key && 'is-playing', marks?.has(`${key}:end`) && 'is-marked', range?.end && inRange(w, range) && 'is-range')}
											data-s={w.s}
											data-a={w.a}
											data-end="1"
										>
											<span>{w.t}</span>
										</span>
									);
								}
								return (
									<span
										key={wk}
										className={cx(
											'mr-w',
											playingKey === key && 'is-playing',
											marks?.has(wk) && 'is-marked',
											marks?.has(`${key}:ayah`) && 'is-forgot-ayah',
											selectedKey === wk && 'is-selected',
											range && inRange(w, range) && 'is-range',
											range && range.start && cmpRef(w, range.start) === 0 && 'is-range-start',
											veil && inSpan(w.s, w.a, veil.from, veil.to) && !veil.revealed.has(key) && isVeiled(veil.hide, w.p, veil.counts.get(key)) && 'is-veiled',
										)}
										data-s={w.s}
										data-a={w.a}
										data-p={w.p}
									>
										{w.t}
									</span>
								);
							})}
						</div>
					);
				})}
			</div>
			<span className="mr-pno">{labelNumber}</span>
		</div>
	);
});

/* ───────── page strip (only re-renders when a page's own inputs change) ───────── */

const RENDER_SPAN = 2;

const PageStrip = memo(function PageStrip({ page, pages, errors, ready, t, fmt, ar, playing, marks, selectedKey, onMeasure, onRetry, fsKey, range, veil }) {
	const slots = [];
	for (let i = 1; i <= PAGE_COUNT; i += 1) {
		const live = ready && Math.abs(i - page) <= RENDER_SPAN;
		const d = pages[i];
		slots.push(
			<section key={i} className="mr-slot" aria-label={`${t.page} ${i}`}>
				{live ? (
					<MushafPage
						page={i}
						data={d}
						error={errors[i]}
						onRetry={onRetry}
						t={t}
						fmt={fmt}
						ar={ar}
						playingKey={d && playing && d.keys.includes(playing) ? playing : null}
						marks={i === page ? marks : null}
						selectedKey={i === page ? selectedKey : null}
						onMeasure={onMeasure}
						labelNumber={fmt(i)}
						fsKey={fsKey}
						range={range}
						veil={veil}
					/>
				) : null}
			</section>,
		);
	}
	return slots;
});

/* ───────── tafsir ───────── */

const tafsirCache = new Map();
function loadTafsir(s, a, ar) {
	const key = `${s}:${a}:${ar ? 'ar' : 'en'}`;
	if (!tafsirCache.has(key)) {
		const editions = ar ? 'quran-uthmani,ar.muyassar' : 'quran-uthmani,ar.muyassar,en.sahih';
		tafsirCache.set(
			key,
			fetch(`https://api.alquran.cloud/v1/ayah/${s}:${a}/editions/${editions}`)
				.then(res => {
					if (!res.ok) throw new Error(String(res.status));
					return res.json();
				})
				.then(json => {
					const list = Array.isArray(json?.data) ? json.data : [];
					const pick = id => String(list.find(e => e?.edition?.identifier === id)?.text || '').replace(/^﻿/, '');
					return { text: pick('quran-uthmani'), tafsir: pick('ar.muyassar'), translation: pick('en.sahih') };
				})
				.catch(err => {
					tafsirCache.delete(key);
					throw err;
				}),
		);
	}
	return tafsirCache.get(key);
}

function TafsirSheet({ s, a, t, ar, fmt, onClose, onPlay }) {
	const [state, setState] = useState({ loading: true });
	const [attempt, setAttempt] = useState(0);
	useEffect(() => {
		let alive = true;
		setState({ loading: true });
		loadTafsir(s, a, ar)
			.then(d => alive && setState({ data: d }))
			.catch(() => alive && setState({ error: true }));
		return () => {
			alive = false;
		};
	}, [s, a, ar, attempt]);
	return (
		<div className="mr-sheet-wrap" dir={ar ? 'rtl' : 'ltr'}>
			<button type="button" className="mr-sheet-scrim" aria-label="close" onClick={onClose} />
			<section className="mr-sheet is-tafsir" role="dialog" aria-modal="true" aria-label={t.tafsir}>
				<header className="mr-sheet-head">
					<span className="mr-grabber" aria-hidden="true" />
					<h2 className="mr-sheet-title">
						{t.tafsir} · {surahName(s, ar)} {fmt(a)}
					</h2>
					<button type="button" className="mr-ic" onClick={onPlay} aria-label={t.playFrom}>
						<Play size={19} />
					</button>
					<button type="button" className="mr-ic" onClick={onClose} aria-label="close">
						<X size={20} />
					</button>
				</header>
				<div className="mr-sheet-list mr-tafsir">
					{state.loading ? (
						<div className="mr-skel is-text">
							<span />
							<span />
							<span />
						</div>
					) : state.error ? (
						<p className="mr-page-msg">
							{t.offline}{' '}
							<button type="button" className="mr-link" onClick={() => setAttempt(n => n + 1)}>
								{t.retry}
							</button>
						</p>
					) : (
						<>
							<p className="mr-tafsir-ayah wa-quran-face" dir="rtl" lang="ar">
								{state.data.text}
							</p>
							<p className="mr-tafsir-src">{t.tafsirSource}</p>
							<p className="mr-tafsir-body" dir="rtl" lang="ar">
								{state.data.tafsir}
							</p>
							{state.data.translation ? (
								<p className="mr-tafsir-body is-en" dir="ltr" lang="en">
									{state.data.translation}
								</p>
							) : null}
						</>
					)}
				</div>
			</section>
		</div>
	);
}

/* ───────── reader ───────── */

export default function MushafReader({ locale = 'ar', onExit, onOpen, due = 0, active = true, mode = 'read', onMode }) {
	const ar = String(locale).toLowerCase().startsWith('ar');
	const t = ar ? L.ar : L.en;
	const nf = useMemo(() => new Intl.NumberFormat(ar ? 'ar-EG' : 'en-US'), [ar]);
	const fmt = useCallback(n => nf.format(n), [nf]);

	const [page, setPage] = useState(() => clampPage(readJson(LS_PAGE, 1)));
	const [pages, setPages] = useState(() => ({}));
	const [errors, setErrors] = useState(() => ({}));
	const [chrome, setChrome] = useState(true);
	const [indexOpen, setIndexOpen] = useState(false);
	const [tafsirFor, setTafsirFor] = useState(null);
	const [markMode, setMarkMode] = useState(false);
	// Range: { start, end?, picking } — start word chosen from the action sheet, end word tapped next.
	const [range, setRange] = useState(null);
	const [rangeMsg, setRangeMsg] = useState('');
	/* revision mode: span, repeats, rounds, speed, hide-to-memorise (kept between visits) */
	const revising = mode === 'revise';
	const [cfg, setCfg] = useState(() => ({ ...DEFAULT_REVISE, ...(typeof window !== 'undefined' ? readJson(LS_REVISE, {}) : {}) }));
	useEffect(() => writeJson(LS_REVISE, cfg), [cfg]);
	const [reviseOpen, setReviseOpen] = useState(false);
	const [pos, setPos] = useState({ i: 0, rep: 1, round: 1 });
	const posRef = useRef(pos);
	const [revealed, setRevealed] = useState(() => new Set());
	const [reciterId, setReciterId] = useState(() => (typeof window !== 'undefined' && readJson(LS_STUDIO_PREFS, {})?.selectedReciterId) || BUILTIN_RECITERS[0].id);
	const versesOf = useCallback(id => SURAH_BY_ID.get(id)?.versesCount || 1, []);
	const reviseList = useMemo(() => ayahList(cfg.from, cfg.to, versesOf), [cfg.from, cfg.to, versesOf]);
	const cfgRef = useRef(cfg);
	cfgRef.current = cfg;
	const listRef = useRef(reviseList);
	listRef.current = reviseList;
	useEffect(() => setRevealed(new Set()), [cfg.hide, cfg.from, cfg.to]);
	const changeReciter = id => {
		setReciterId(id);
		writeJson(LS_STUDIO_PREFS, { ...(readJson(LS_STUDIO_PREFS, {}) || {}), selectedReciterId: id });
	};
	const [menu, setMenu] = useState(null);
	const [toast, setToast] = useState(null);
	const [scrub, setScrub] = useState(null);
	const [box, setBox] = useState({ w: 0, h: 0 });
	const [ratio, setRatio] = useState(() => {
		const r = Number(readJson(LS_RATIO, DEFAULT_RATIO));
		return r > 8 && r < 30 ? r : DEFAULT_RATIO;
	});
	const [mistakes, setMistakes] = useState(() => (typeof window === 'undefined' ? [] : readMistakes().filter(isActive)));
	const rootRef = useRef(null);
	const pagerRef = useRef(null);
	const pageRef = useRef(page);
	pageRef.current = page;

	/* size of the reading area → font size that fits 15 lines and a typical full line */
	useIsoLayoutEffect(() => {
		const el = rootRef.current;
		if (!el) return undefined;
		const update = () => {
			// Hidden (another section is showing): keep the last size so nothing re-lays out.
			if (!el.clientWidth || !el.clientHeight) return;
			setBox(prev => (prev.w === el.clientWidth && prev.h === el.clientHeight ? prev : { w: el.clientWidth, h: el.clientHeight }));
		};
		update();
		const ro = new ResizeObserver(update);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);
	const sizing = useMemo(() => {
		const { w, h } = box;
		if (!w || !h) return null;
		const padTop = 14;
		const padBottom = 30; // page number
		const lineH = Math.max(18, (h - padTop - padBottom) / 15.2);
		const pageW = Math.min(w - 20, Math.max(280, (h - padTop - padBottom) * 0.7));
		const fs = Math.min(lineH * 0.6, (pageW - 4) / ratio);
		return { lineH, pageW, fs };
	}, [box, ratio]);
	// The first measured page sets the text size for the session (steady while reading; long
	// lines on other pages are scaled one by one).
	const measured = useRef(false);
	const onMeasure = useCallback(r => {
		if (measured.current || !(r > 8 && r < 30)) return;
		measured.current = true;
		writeJson(LS_RATIO, Number(r.toFixed(3)));
		setRatio(prev => (Math.abs(r - prev) < prev * 0.005 ? prev : r));
	}, []);

	/* page data */
	const ensure = useCallback(p => {
		if (p < 1 || p > PAGE_COUNT) return;
		const cached = cachedPage(p);
		if (cached) {
			setPages(prev => (prev[p] === cached ? prev : { ...prev, [p]: cached }));
			return;
		}
		loadPage(p)
			.then(d => {
				setPages(prev => (prev[p] === d ? prev : { ...prev, [p]: d }));
				setErrors(prev => (prev[p] ? { ...prev, [p]: false } : prev));
			})
			.catch(() => setErrors(prev => ({ ...prev, [p]: true })));
	}, []);
	useEffect(() => {
		for (let d = -RENDER_SPAN; d <= RENDER_SPAN; d += 1) ensure(page + d);
		prefetchAround(page, RENDER_SPAN + 2);
		const id = window.setTimeout(() => writeJson(LS_PAGE, page), 300);
		// Far pages leave React state; they stay in the memory / IndexedDB caches.
		setPages(prev => {
			const keys = Object.keys(prev);
			if (keys.length <= RENDER_SPAN * 2 + 4) return prev;
			const next = {};
			keys.forEach(k => {
				if (Math.abs(Number(k) - page) <= RENDER_SPAN + 1) next[k] = prev[k];
			});
			return next;
		});
		return () => window.clearTimeout(id);
	}, [page, ensure]);

	/* pager: slot i holds page i+1; RTL so page 1 sits at the right like a printed mushaf */
	const scrollToPage = useCallback((p, smooth) => {
		const pager = pagerRef.current;
		if (!pager || !pager.clientWidth) return;
		// RTL scroller: 0 is the right edge (page 1), later pages are further left (negative).
		pager.scrollTo({ left: -(p - 1) * pager.clientWidth, behavior: smooth ? 'smooth' : 'instant' });
	}, []);
	useIsoLayoutEffect(() => {
		if (box.w) scrollToPage(pageRef.current, false);
	}, [box.w, scrollToPage]);
	// Coming back from another section: put the page back exactly where it was.
	useIsoLayoutEffect(() => {
		if (active) scrollToPage(pageRef.current, false);
		else audioPause();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [active]);
	// The page number changes once the swipe settles, so nothing re-renders mid-swipe.
	useEffect(() => {
		const pager = pagerRef.current;
		if (!pager) return undefined;
		let timer = 0;
		const settle = () => {
			window.clearTimeout(timer);
			const w = pager.clientWidth || 1;
			const p = clampPage(Math.round(Math.abs(pager.scrollLeft) / w) + 1);
			if (p !== pageRef.current) setPage(p);
		};
		const onScroll = () => {
			window.clearTimeout(timer);
			timer = window.setTimeout(settle, 110);
		};
		const onStart = () => setMenu(m => (m ? null : m));
		pager.addEventListener('scroll', onScroll, { passive: true });
		pager.addEventListener('scrollend', settle);
		pager.addEventListener('touchstart', onStart, { passive: true });
		return () => {
			window.clearTimeout(timer);
			pager.removeEventListener('scroll', onScroll);
			pager.removeEventListener('scrollend', settle);
			pager.removeEventListener('touchstart', onStart);
		};
	}, []);
	const goTo = useCallback(
		(p, smooth = false) => {
			const n = clampPage(p);
			setMenu(null);
			const near = Math.abs(n - pageRef.current) <= 1;
			if (!near) setPage(n);
			scrollToPage(n, smooth && near);
		},
		[scrollToPage],
	);

	// Keyboard: ← next page, → previous page (the mushaf reads right to left).
	useEffect(() => {
		if (!active) return undefined;
		const onKey = e => {
			if (e.target?.closest?.('input,textarea,select')) return;
			if (e.key === 'ArrowLeft') goTo(pageRef.current + 1, true);
			else if (e.key === 'ArrowRight') goTo(pageRef.current - 1, true);
			else if (e.key === 'Escape') {
				setMenu(null);
				setIndexOpen(false);
				setTafsirFor(null);
			}
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [goTo, active]);

	/* mistakes on the visible page */
	useEffect(() => {
		const refresh = () => setMistakes(readMistakes().filter(isActive));
		window.addEventListener(NOTEBOOK_EVENT, refresh);
		window.addEventListener('focus', refresh);
		return () => {
			window.removeEventListener(NOTEBOOK_EVENT, refresh);
			window.removeEventListener('focus', refresh);
		};
	}, []);
	const [textTick, setTextTick] = useState(0);
	const data = pages[page];
	useEffect(() => {
		if (!data) return;
		const wanted = new Set(mistakes.filter(m => data.chapters.includes(m.surahId)).map(m => m.surahId));
		wanted.forEach(s => void loadSurahText(s).then(() => setTextTick(n => n + 1)).catch(() => {}));
	}, [data, mistakes]);
	const marks = useMemo(() => {
		if (!data) return null;
		const set = new Set();
		mistakes.forEach(m => {
			if (!data.chapters.includes(m.surahId)) return;
			if (m.wordStart == null) {
				set.add(`${m.surahId}:${m.ayah}:end`);
				if (m.spot === 'whole') set.add(`${m.surahId}:${m.ayah}:ayah`);
				return;
			}
			for (let i = m.wordStart; i <= (m.wordEnd ?? m.wordStart); i += 1) {
				const pos = positionForLogIndex(m.surahId, m.ayah, i);
				if (pos) set.add(`${m.surahId}:${m.ayah}:${pos}`);
			}
		});
		return set.size ? set : null;
		// textTick: recompute once a surah's text (for word positions) has loaded.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data, mistakes, textTick]);

	/* revision: spans offered in the settings, and the words to hide on screen */
	const spans = useMemo(() => {
		const pr = data ? pageRange(data.keys) : null;
		const k = pr?.from || { s: surahAtPage(page), a: 1 };
		return { page: pr, quarter: quarterRange(k.s, k.a, RUB_STARTS, versesOf), surah: surahRange(k.s, versesOf) };
	}, [data, page, versesOf]);
	const ayahCounts = useMemo(() => {
		const m = new Map();
		Object.values(pages).forEach(d =>
			d?.lines.forEach(l => l.kind === 'text' && l.words.forEach(w => !w.end && m.set(`${w.s}:${w.a}`, Math.max(m.get(`${w.s}:${w.a}`) || 0, w.p)))),
		);
		return m;
	}, [pages]);
	const veil = useMemo(
		() => (revising && cfg.hide !== 'none' && cfg.from ? { hide: cfg.hide, from: cfg.from, to: cfg.to, revealed, counts: ayahCounts } : null),
		[revising, cfg.hide, cfg.from, cfg.to, revealed, ayahCounts],
	);
	// First time in revision mode: start from this page and open the settings.
	useEffect(() => {
		if (!revising || !active) return;
		if (!cfg.from && spans.page) {
			setCfg(c => ({ ...c, from: spans.page.from, to: spans.page.to }));
			setReviseOpen(true);
		}
	}, [revising, active, cfg.from, spans.page]);

	/* recitation: the next ayat are downloaded while one plays, so there is no pause between them */
	const audioRef = useRef(null);
	const [playing, setPlaying] = useState(null);
	const audioPause = () => {
		audioRef.current?.pause();
		setPlaying(null);
	};
	const reciterFolder = () => {
		const prefs = readJson(LS_STUDIO_PREFS, {});
		return (BUILTIN_RECITERS.find(r => r.id === prefs?.selectedReciterId) || BUILTIN_RECITERS[0]).folder;
	};
	const nextAyah = (s, a) => {
		const count = SURAH_BY_ID.get(s)?.versesCount || 0;
		if (a < count) return [s, a + 1];
		return s < 114 ? [s + 1, 1] : null;
	};
	const playAyah = useCallback((s, a, inRevise = false) => {
		if (!audioRef.current) {
			audioRef.current = new Audio();
			audioRef.current.preload = 'auto';
		}
		const el = audioRef.current;
		document.querySelectorAll('audio').forEach(other => other !== el && other.pause());
		const folder = reciterFolder();
		const url = ayahAudioUrl(folder, s, a);
		el.src = playableAyahUrl(url);
		const speed = cfgRef.current.speed || 1;
		el.defaultPlaybackRate = speed;
		el.playbackRate = speed;
		void prefetchAyahAudio(url);
		if (inRevise) {
			// The ayat this session needs next (repeats reuse the file already in memory).
			upcomingKeys(posRef.current, cfgRef.current, listRef.current).forEach(key => {
				const [ks, ka] = key.split(':').map(Number);
				void prefetchAyahAudio(ayahAudioUrl(folder, ks, ka));
			});
		} else {
			// This ayah and the next two: ready before they are needed.
			let k = [s, a];
			for (let i = 0; i < 2 && k; i += 1) {
				k = nextAyah(k[0], k[1]);
				if (k) void prefetchAyahAudio(ayahAudioUrl(folder, k[0], k[1]));
			}
		}
		el.onended = () => {
			if (inRevise) {
				const next = nextStep(posRef.current, cfgRef.current, listRef.current.length);
				if (!next) {
					setPlaying(null);
					setToast({ ids: [], msg: 'done', at: Date.now() });
					posRef.current = { i: 0, rep: 1, round: 1 };
					setPos(posRef.current);
					return;
				}
				posRef.current = next;
				setPos(next);
				const x = listRef.current[next.i];
				playAyah(x.s, x.a, true);
				return;
			}
			const n = nextAyah(s, a);
			if (n) playAyah(n[0], n[1]);
			else setPlaying(null);
		};
		el.onerror = () => setPlaying(null);
		void el.play().catch(() => setPlaying(null));
		setPlaying(`${s}:${a}`);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
	useEffect(() => () => audioRef.current?.pause(), []);
	// Recitation turns the page when the ayah moves past it.
	useEffect(() => {
		if (!playing || !data || data.keys.includes(playing)) return;
		const [s, a] = playing.split(':').map(Number);
		if (cachedPage(page + 1)?.keys.includes(playing)) goTo(page + 1, true);
		else void findPage(s, a).then(p => p && goTo(p));
	}, [playing, data, page, goTo]);
	/** Page of any ayah: from its quarter's first page, a few pages forward (all cached after). */
	async function findPage(s, a) {
		const key = `${s}:${a}`;
		const start = Math.max(quarterRange(s, a, RUB_STARTS, versesOf).from ? RUB_STARTS.reduce((p, r) => (r[0] < s || (r[0] === s && r[1] <= a) ? r[2] : p), 1) : 1, 1);
		for (let p = start; p < start + 14 && p <= PAGE_COUNT; p += 1) {
			try {
				const d = await loadPage(p);
				if (d.keys.includes(key)) return p;
			} catch {
				return null;
			}
		}
		return null;
	}
	const playStep = p => {
		const list = listRef.current;
		if (!list.length) return;
		posRef.current = p;
		setPos(p);
		const x = list[p.i];
		playAyah(x.s, x.a, true);
	};
	const stepAyah = delta => {
		const list = listRef.current;
		if (!list.length) return;
		const i = Math.min(list.length - 1, Math.max(0, posRef.current.i + delta));
		const p = { i, rep: 1, round: posRef.current.round };
		if (playing) playStep(p);
		else {
			posRef.current = p;
			setPos(p);
			const x = list[i];
			if (!data?.keys.includes(`${x.s}:${x.a}`)) void findPage(x.s, x.a).then(pg => pg && goTo(pg));
		}
	};
	const startRevise = () => {
		setReviseOpen(false);
		setChrome(false);
		playStep({ i: 0, rep: 1, round: 1 });
	};
	const togglePlay = () => {
		if (playing) {
			audioPause();
			return;
		}
		if (revising) {
			if (!reviseList.length) {
				setReviseOpen(true);
				return;
			}
			const p = posRef.current.i < reviseList.length ? posRef.current : { i: 0, rep: 1, round: 1 };
			playStep(p);
			return;
		}
		const first = data?.keys[0];
		if (!first) return;
		const [s, a] = first.split(':').map(Number);
		playAyah(s, a);
	};

	/* taps: toggle the controls · long-press (or Mark mode + tap) a word → ayah actions */
	const press = useRef(null);
	const openMenuFor = el => {
		const r = el.getBoundingClientRect();
		const s = Number(el.dataset.s);
		const a = Number(el.dataset.a);
		const p = el.dataset.end ? null : Number(el.dataset.p);
		setMenu({ s, a, p, rect: { top: r.top, bottom: r.bottom, left: r.left, width: r.width } });
		navigator.vibrate?.(12);
	};
	const onPointerDown = e => {
		const word = e.target.closest?.('.mr-w, .mr-end');
		press.current = { x: e.clientX, y: e.clientY, long: false, timer: 0 };
		if (word && !markMode && !range?.picking) {
			press.current.timer = window.setTimeout(() => {
				if (!press.current || press.current.moved) return;
				press.current.long = true;
				openMenuFor(word);
			}, 420);
		}
	};
	const onPointerMove = e => {
		const p = press.current;
		if (p && !p.moved && (Math.abs(e.clientX - p.x) > 10 || Math.abs(e.clientY - p.y) > 10)) {
			window.clearTimeout(p.timer);
			p.moved = true;
		}
	};
	const onPointerUp = () => {
		if (press.current) window.clearTimeout(press.current.timer);
	};
	const onClick = e => {
		const p = press.current;
		press.current = null;
		if (p?.long || p?.moved) return;
		if (menu) {
			setMenu(null);
			return;
		}
		const word = e.target.closest?.('.mr-w, .mr-end');
		if (word?.classList.contains('is-veiled')) {
			const key = `${word.dataset.s}:${word.dataset.a}`;
			setRevealed(prev => new Set(prev).add(key));
			return;
		}
		if (range?.picking) {
			if (!word) return;
			const ref = { s: Number(word.dataset.s), a: Number(word.dataset.a), p: word.dataset.end ? 999 : Number(word.dataset.p) };
			if (ref.s !== range.start.s) {
				setRangeMsg(t.sameSurah);
				return;
			}
			const [start, end] = cmpRef(ref, range.start) < 0 ? [ref, range.start] : [range.start, ref];
			setRange({ start, end, picking: false });
			setRangeMsg('');
			navigator.vibrate?.(12);
			return;
		}
		if (markMode && word) {
			openMenuFor(word);
			return;
		}
		setChrome(v => !v);
	};
	const startRange = () => {
		if (!menu) return;
		setRange({ start: { s: menu.s, a: menu.a, p: menu.p || 1 }, picking: true });
		setRangeMsg('');
		setMenu(null);
	};
	const cancelRange = () => {
		setRange(null);
		setRangeMsg('');
	};
	// The selected words (from the pages in memory) for the sheet preview.
	const rangeWords = useMemo(() => {
		if (!range?.end) return null;
		const out = [];
		Object.keys(pages)
			.map(Number)
			.sort((x, y) => x - y)
			.forEach(pg => pages[pg]?.lines.forEach(l => l.kind === 'text' && l.words.forEach(w => !w.end && inRange(w, range) && out.push(w))));
		return out;
	}, [range, pages]);
	/** One mistake per ayah: first ayah from the start word, middle ayat whole, last ayah up to the end word. */
	const saveRange = async kind => {
		const r = range;
		setRange(null);
		if (!r?.end) return;
		const ids = [];
		for (let a = r.start.a; a <= r.end.a; a += 1) {
			const { count } = await logIndexForPosition(r.start.s, a, 1);
			const first = a === r.start.a ? r.start.p : 1;
			const last = a === r.end.a ? Math.min(r.end.p, count || r.end.p) : count || first;
			const whole = Boolean(first <= 1 && count && last >= count);
			let fields;
			if (whole && kind === 'forgot') {
				fields = { surahId: r.start.s, ayah: a, kind: 'forgot', spot: 'whole', wordStart: null, wordEnd: null };
			} else {
				const rawFirst = (await logIndexForPosition(r.start.s, a, first)).raw ?? first - 1;
				const rawLast = (await logIndexForPosition(r.start.s, a, last)).raw ?? last - 1;
				fields = {
					surahId: r.start.s,
					ayah: a,
					kind,
					spot: whole ? 'whole' : count ? spotForWord(first - 1, count) : 'whole',
					wordStart: rawFirst,
					wordEnd: Math.max(rawFirst, rawLast),
				};
			}
			const saved = saveNewMistake(fields);
			if (saved) ids.push(saved.id);
		}
		if (ids.length) setToast({ ids, at: Date.now() });
	};

	const logMistake = async kind => {
		const m = menu;
		setMenu(null);
		if (!m) return;
		let fields = { surahId: m.s, ayah: m.a, kind: kind === 'link' || kind === 'ayah' ? 'forgot' : kind, spot: 'whole', wordStart: null, wordEnd: null };
		if (kind === 'link') fields.spot = 'link';
		// Whole ayah forgotten: no word; the review hides it all and shows the ayah before it.
		else if (kind === 'ayah') fields.spot = 'whole';
		else if (m.p) {
			const { raw, count } = await logIndexForPosition(m.s, m.a, m.p);
			fields = { ...fields, wordStart: raw ?? m.p - 1, wordEnd: raw ?? m.p - 1, spot: count ? spotForWord(m.p - 1, count) : 'whole' };
		}
		const saved = saveNewMistake(fields);
		if (saved) setToast({ ids: [saved.id], at: Date.now() });
	};
	const markedHere = menu ? mistakes.filter(x => x.surahId === menu.s && x.ayah === menu.a) : [];
	// The pressed ayah's words on this page, for the preview in the action sheet.
	const menuWords = useMemo(() => {
		if (!menu || !data) return null;
		return data.lines.flatMap(l => (l.kind === 'text' ? l.words.filter(w => !w.end && w.s === menu.s && w.a === menu.a) : []));
	}, [menu, data]);
	useEffect(() => {
		if (!toast) return undefined;
		const id = window.setTimeout(() => setToast(null), 3600);
		return () => window.clearTimeout(id);
	}, [toast]);

	/* header text */
	const chapters = data?.chapters?.length ? data.chapters : [surahAtPage(page)];
	const title = chapters.map(id => surahName(id, ar)).join(ar ? '، ' : ', ');
	const shownPage = scrub ?? page;
	const selectedKey = menu && menu.p ? `${menu.s}:${menu.a}:${menu.p}` : null;

	return (
		<div
			className={cx('mr', chrome && 'is-chrome', markMode && 'is-marking')}
			ref={rootRef}
			dir={ar ? 'rtl' : 'ltr'}
			style={sizing ? { '--mr-fs': `${sizing.fs}px`, '--mr-lh': `${sizing.lineH}px`, '--mr-pw': `${sizing.pageW}px` } : undefined}
		>
			<div
				className="mr-pager"
				ref={pagerRef}
				dir="rtl"
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerCancel={onPointerUp}
				onClick={onClick}
				onContextMenu={e => e.target.closest?.('.mr-w, .mr-end') && e.preventDefault()}
			>
				<PageStrip
					page={page}
					pages={pages}
					errors={errors}
					ready={Boolean(sizing)}
					t={t}
					fmt={fmt}
					ar={ar}
					playing={playing}
					marks={marks}
					selectedKey={selectedKey}
					onMeasure={onMeasure}
					onRetry={ensure}
					fsKey={sizing?.fs}
					range={range}
					veil={veil}
				/>
			</div>

			{/* top controls */}
			<header className="mr-top" aria-hidden={!chrome}>
				<div className="mr-top-row">
					{onExit ? (
						<button type="button" className="mr-ic" onClick={onExit} aria-label={t.back} tabIndex={chrome ? 0 : -1}>
							<ArrowRight size={24} strokeWidth={2} className="mr-flip" />
						</button>
					) : null}
					<button type="button" className="mr-ic" onClick={() => setIndexOpen(true)} aria-label={t.index} tabIndex={chrome ? 0 : -1}>
						<List size={24} strokeWidth={2} />
					</button>
					<span className="mr-div" aria-hidden="true" />
					<button type="button" className="mr-title" onClick={() => setIndexOpen(true)} tabIndex={chrome ? 0 : -1}>
						<b>{title}</b>
						{revising && cfg.from ? (
							<span>
								{t.revising}
								<i aria-hidden="true" />
								{cfg.from.s === cfg.to.s ? t.ayahSpan(fmt(cfg.from.a), fmt(cfg.to.a)) : `${surahName(cfg.from.s, ar)} → ${surahName(cfg.to.s, ar)}`}
							</span>
						) : (
							<span>
								{t.juz} {fmt(juzOfPage(page))}
								<i aria-hidden="true" />
								{t.pageWord} {fmt(page)}
							</span>
						)}
					</button>
					<span className="mr-div" aria-hidden="true" />
					<button
						type="button"
						className={cx('mr-ic', revising && 'is-on')}
						onClick={() => (onMode ? onMode(revising ? 'read' : 'revise') : onOpen?.('revise'))}
						aria-label={revising ? t.backToMushaf : t.studio}
						title={revising ? t.backToMushaf : t.studio}
						aria-pressed={revising}
						tabIndex={chrome ? 0 : -1}
					>
						<Repeat size={23} strokeWidth={2} />
					</button>
					<button type="button" className="mr-ic" onClick={() => onOpen?.('notes')} aria-label={t.notes} title={t.notes} tabIndex={chrome ? 0 : -1}>
						<Bookmark size={23} strokeWidth={2} />
						{due ? <span className="mr-badge">{fmt(due)}</span> : null}
					</button>
				</div>
			</header>

			{markMode && !range ? <p className="mr-mark-hint">{t.markOn}</p> : null}
			{range?.picking ? (
				<div className="mr-range-hint" role="status">
					<span>{rangeMsg || t.pickEnd}</span>
					<button type="button" onClick={cancelRange}>
						{t.cancel}
					</button>
				</div>
			) : null}
			{range?.end ? (
				<RangeSheet
					range={range}
					words={rangeWords}
					t={t}
					ar={ar}
					fmt={fmt}
					onPick={saveRange}
					onPlay={() => {
						playAyah(range.start.s, range.start.a);
						cancelRange();
					}}
					onRepick={() => setRange(r => ({ start: r.start, picking: true }))}
					onRevise={() => {
						setCfg(c => ({ ...c, from: { s: range.start.s, a: range.start.a }, to: { s: range.end.s, a: range.end.a } }));
						posRef.current = { i: 0, rep: 1, round: 1 };
						setPos(posRef.current);
						cancelRange();
						onMode?.('revise');
						setReviseOpen(true);
					}}
					onClose={cancelRange}
				/>
			) : null}

			{/* bottom controls */}
			<footer className="mr-bottom" aria-hidden={!chrome}>
				<div className="mr-scrub">
					<input
						type="range"
						min={1}
						max={PAGE_COUNT}
						value={shownPage}
						dir="rtl"
						style={{ '--fill': `${((shownPage - 1) / (PAGE_COUNT - 1)) * 100}%` }}
						aria-label={t.goPage}
						tabIndex={chrome ? 0 : -1}
						onChange={e => setScrub(Number(e.target.value))}
						onPointerUp={() => {
							if (scrub != null) goTo(scrub);
							setScrub(null);
						}}
						onKeyUp={() => {
							if (scrub != null) goTo(scrub);
							setScrub(null);
						}}
					/>
					{scrub != null ? (
						<span className="mr-scrub-bubble">
							{fmt(scrub)} · {surahName(surahAtPage(scrub), ar)}
						</span>
					) : null}
				</div>
				<div className="mr-bar">
					{revising ? (
						<button type="button" className="mr-pill is-rv" onClick={() => setReviseOpen(true)} tabIndex={chrome ? 0 : -1}>
							<Settings2 size={20} strokeWidth={2} />
							<span>{t.repeatShort(cfg.perAyah, fmt)}</span>
						</button>
					) : (
						<button
							type="button"
							className={cx('mr-pill', markMode && 'is-on')}
							onClick={() => setMarkMode(v => !v)}
							aria-pressed={markMode}
							tabIndex={chrome ? 0 : -1}
						>
							<CircleAlert size={22} strokeWidth={2} />
							<span>{t.mark}</span>
						</button>
					)}
					<span className="mr-div" aria-hidden="true" />
					{revising && reviseList.length ? (
						<div className="mr-nav">
							<button type="button" className="mr-ic" onClick={() => stepAyah(1)} aria-label={t.nextAyahBtn} disabled={pos.i >= reviseList.length - 1} tabIndex={chrome ? 0 : -1}>
								<ChevronLeft size={20} strokeWidth={2.2} />
							</button>
							<span className="mr-pageno rv-pos">
								<b>{fmt(reviseList[Math.min(pos.i, reviseList.length - 1)].a)}</b>
								<small>
									{fmt(pos.rep)}/{fmt(cfg.perAyah)}
									{cfg.rounds !== 1 ? ` · ${t.round} ${fmt(pos.round)}` : ''}
								</small>
							</span>
							<button type="button" className="mr-ic" onClick={() => stepAyah(-1)} aria-label={t.prevAyahBtn} disabled={pos.i <= 0} tabIndex={chrome ? 0 : -1}>
								<ChevronRight size={20} strokeWidth={2.2} />
							</button>
						</div>
					) : (
					/* Left arrow = next page (the mushaf reads right to left). */
					<div className="mr-nav">
						<button type="button" className="mr-ic" onClick={() => goTo(page + 1, true)} aria-label={t.next} disabled={page >= PAGE_COUNT} tabIndex={chrome ? 0 : -1}>
							<ChevronLeft size={20} strokeWidth={2.2} />
						</button>
						<span className="mr-pageno">{fmt(page)}</span>
						<button type="button" className="mr-ic" onClick={() => goTo(page - 1, true)} aria-label={t.prev} disabled={page <= 1} tabIndex={chrome ? 0 : -1}>
							<ChevronRight size={20} strokeWidth={2.2} />
						</button>
					</div>
					)}
					<span className="mr-div" aria-hidden="true" />
					<button type="button" className={cx('mr-play', playing && 'is-on')} onClick={togglePlay} aria-label={playing ? t.pause : t.play} tabIndex={chrome ? 0 : -1}>
						{playing ? <Pause size={26} /> : <Play size={26} style={{ marginInlineStart: 3 }} />}
					</button>
				</div>
			</footer>

			{menu ? (
				<WordMenu
					menu={menu}
					t={t}
					ar={ar}
					fmt={fmt}
					marked={markedHere}
					ayahWords={menuWords}
					onPick={logMistake}
					onPlay={() => {
						playAyah(menu.s, menu.a);
						setMenu(null);
					}}
					onTafsir={() => {
						setTafsirFor({ s: menu.s, a: menu.a });
						setMenu(null);
					}}
					onRange={startRange}
					onRemove={id => {
						deleteMistake(id);
						setMenu(null);
					}}
					onClose={() => setMenu(null)}
				/>
			) : null}

			{toast ? (
				<div className="mr-toast" role="status">
					<span>{toast.msg === 'done' ? t.reviseDone : toast.ids.length > 1 ? t.savedMany(toast.ids.length, fmt) : t.saved}</span>
					{toast.ids.length ? (
						<>
							<button
								type="button"
								onClick={() => {
									toast.ids.forEach(deleteMistake);
									setToast(null);
								}}
							>
								{t.undo}
							</button>
							<button type="button" onClick={() => onOpen?.('notes')}>
								{t.view}
							</button>
						</>
					) : (
						<button type="button" onClick={() => playStep({ i: 0, rep: 1, round: 1 })}>
							{t.again}
						</button>
					)}
				</div>
			) : null}

			{tafsirFor ? (
				<TafsirSheet
					s={tafsirFor.s}
					a={tafsirFor.a}
					t={t}
					ar={ar}
					fmt={fmt}
					onClose={() => setTafsirFor(null)}
					onPlay={() => {
						playAyah(tafsirFor.s, tafsirFor.a);
						setTafsirFor(null);
					}}
				/>
			) : null}

			{reviseOpen ? (
				<ReviseSheet
					ar={ar}
					fmt={fmt}
					cfg={cfg}
					spans={spans}
					count={reviseList.length}
					reciterId={reciterId}
					onReciter={changeReciter}
					onChange={next => {
						setCfg(next);
						posRef.current = { i: 0, rep: 1, round: 1 };
						setPos(posRef.current);
					}}
					onStart={startRevise}
					onClose={() => setReviseOpen(false)}
				/>
			) : null}

			{indexOpen ? (
				<IndexSheet
					t={t}
					ar={ar}
					fmt={fmt}
					page={page}
					onClose={() => setIndexOpen(false)}
					onGo={p => {
						goTo(p);
						setIndexOpen(false);
					}}
				/>
			) : null}
		</div>
	);
}

/* ───────── ayah actions (long-press) ───────── */

function WordMenu({ menu, t, ar, fmt, marked, ayahWords, onPick, onPlay, onTafsir, onRange, onRemove, onClose }) {
	// A word was pressed (not the ayah-end rosette): word-level mistakes point at that word.
	const onWord = Boolean(menu.p);
	return (
		<div className="mr-act-wrap" dir={ar ? 'rtl' : 'ltr'}>
			<button type="button" className="mr-act-scrim" aria-label="close" onClick={onClose} />
			<section className="mr-act" role="dialog" aria-modal="true" aria-label={`${surahName(menu.s, ar)} ${menu.a}`}>
				<span className="mr-grabber" aria-hidden="true" />
				<header className="mr-act-head">
					<span className="mr-act-no">{fmt(menu.a)}</span>
					<span className="mr-act-name">
						<b>{surahName(menu.s, ar)}</b>
						<small>
							{t.ayah} {fmt(menu.a)}
						</small>
					</span>
					<button type="button" className="mr-ic" onClick={onClose} aria-label="close">
						<X size={20} />
					</button>
				</header>
				{ayahWords?.length ? (
					<p className="mr-act-ayah wa-quran-face" lang="ar" dir="rtl">
						{ayahWords.map(w => (
							<span key={w.p} className={w.p === menu.p ? 'is-picked' : undefined}>
								{w.t}{' '}
							</span>
						))}
					</p>
				) : null}
				<div className="mr-act-quick">
					<button type="button" onClick={onPlay}>
						<Play size={18} />
						<span>{t.playFrom}</span>
					</button>
					<button type="button" onClick={onTafsir}>
						<BookOpenText size={18} />
						<span>{t.tafsir}</span>
					</button>
					<button type="button" className="is-wide" onClick={onRange}>
						<TextSelect size={18} />
						<span>{t.selectRange}</span>
					</button>
				</div>
				<p className="mr-act-label">{t.logAs}</p>
				<ul className="mr-act-list">
					{t.kinds
						.filter(k => onWord || !k.wordOnly)
						.map(k => (
							<li key={k.id}>
								<button type="button" className={`mr-act-row k-${k.id}`} onClick={() => onPick(k.id)}>
									<i aria-hidden="true" />
									<span>
										<b>{k.label}</b>
										{k.hint ? <small>{k.hint}</small> : null}
									</span>
								</button>
							</li>
						))}
				</ul>
				{marked.length ? (
					<button type="button" className="mr-act-remove" onClick={() => onRemove(marked[marked.length - 1].id)}>
						<Trash2 size={16} />
						{t.removeMark}
					</button>
				) : null}
			</section>
		</div>
	);
}

/* ───────── range sheet ───────── */

function RangeSheet({ range, words, t, ar, fmt, onPick, onPlay, onRepick, onRevise, onClose }) {
	const { start, end } = range;
	const sameAyah = start.a === end.a;
	const ayahCount = end.a - start.a + 1;
	const count = words?.length || 0;
	return (
		<div className="mr-act-wrap" dir={ar ? 'rtl' : 'ltr'}>
			<button type="button" className="mr-act-scrim is-light" aria-label="close" onClick={onClose} />
			<section className="mr-act" role="dialog" aria-modal="true" aria-label={t.rangeTitle}>
				<span className="mr-grabber" aria-hidden="true" />
				<header className="mr-act-head">
					<span className="mr-act-no is-range">{fmt(count)}</span>
					<span className="mr-act-name">
						<b>{surahName(start.s, ar)}</b>
						<small>
							{sameAyah ? `${t.ayah} ${fmt(start.a)}` : t.fromTo(fmt(start.a), fmt(end.a))} · {t.wordsCount(count, fmt)}
						</small>
					</span>
					<button type="button" className="mr-ic" onClick={onClose} aria-label="close">
						<X size={20} />
					</button>
				</header>
				{count ? (
					<p className="mr-act-ayah is-range wa-quran-face" lang="ar" dir="rtl">
						{words.map(w => w.t).join(' ')}
					</p>
				) : null}
				<div className="mr-act-quick">
					<button type="button" onClick={onPlay}>
						<Play size={18} />
						<span>{t.playFrom}</span>
					</button>
					<button type="button" onClick={onRepick}>
						<TextSelect size={18} />
						<span>{t.repick}</span>
					</button>
					{onRevise ? (
						<button type="button" className="is-wide" onClick={onRevise}>
							<Repeat size={18} />
							<span>{t.reviseThis}</span>
						</button>
					) : null}
				</div>
				<p className="mr-act-label">{ayahCount > 1 ? t.rangeSplit(ayahCount, fmt) : t.logAs}</p>
				<ul className="mr-act-list">
					{t.rangeKinds.map(k => (
						<li key={k.id}>
							<button type="button" className={`mr-act-row k-${k.id}`} onClick={() => onPick(k.id)}>
								<i aria-hidden="true" />
								<span>
									<b>{k.label}</b>
									{k.hint ? <small>{k.hint}</small> : null}
								</span>
							</button>
						</li>
					))}
				</ul>
			</section>
		</div>
	);
}

/* ───────── index ───────── */

function IndexSheet({ t, ar, fmt, page, onClose, onGo }) {
	const [tab, setTab] = useState('surahs');
	const [q, setQ] = useState('');
	const [goVal, setGoVal] = useState('');
	// The surah you are reading opens with its quarters listed.
	const [openSurah, setOpenSurah] = useState(() => surahAtPage(page));
	const listRef = useRef(null);
	const current = surahAtPage(page);
	const currentJuz = juzOfPage(page);
	const norm = s => String(s).toLowerCase().replace(/[ً-ٰٟۖ-ۭ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
	const shown = useMemo(() => {
		const k = norm(q.trim());
		if (!k) return SURAHS;
		return SURAHS.filter(s => norm(s.nameAr).includes(k) || norm(s.nameEn).includes(k) || String(s.id) === k);
	}, [q]);
	useEffect(() => {
		const el = listRef.current?.querySelector('.mr-quarter.is-here') || listRef.current?.querySelector('.is-current');
		el?.scrollIntoView({ block: 'center' });
	}, [tab]);
	const go = () => {
		const n = Number(String(goVal).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
		if (n >= 1 && n <= PAGE_COUNT) onGo(n);
	};
	return (
		<div className="mr-sheet-wrap" dir={ar ? 'rtl' : 'ltr'}>
			<button type="button" className="mr-sheet-scrim" aria-label="close" onClick={onClose} />
			<section className="mr-sheet" role="dialog" aria-modal="true" aria-label={t.index}>
				<header className="mr-sheet-head">
					<span className="mr-grabber" aria-hidden="true" />
					<div className="mr-seg" role="tablist">
						{[
							['surahs', t.surahs],
							['juzs', t.juzs],
						].map(([id, label]) => (
							<button key={id} type="button" role="tab" aria-selected={tab === id} className={cx('mr-seg-btn', tab === id && 'is-on')} onClick={() => setTab(id)}>
								{label}
							</button>
						))}
					</div>
					<button type="button" className="mr-ic" onClick={onClose} aria-label="close">
						<X size={20} />
					</button>
				</header>
				<div className="mr-sheet-tools">
					{tab === 'surahs' ? (
						<label className="mr-search">
							<Search size={17} />
							<input value={q} onChange={e => setQ(e.target.value)} placeholder={t.search} />
						</label>
					) : null}
					<form
						className="mr-go"
						onSubmit={e => {
							e.preventDefault();
							go();
						}}
					>
						<input inputMode="numeric" value={goVal} onChange={e => setGoVal(e.target.value)} placeholder={t.goPage} aria-label={t.goPage} />
						<button type="submit">{t.go}</button>
					</form>
				</div>
				<div className="mr-sheet-list" ref={listRef}>
					{tab === 'surahs' ? (
						shown.map(s => {
							const quarters = RUBS_BY_SURAH.get(s.id) || [];
							const open = openSurah === s.id;
							return (
								<div key={s.id} className={cx('mr-row-wrap', open && 'is-open')}>
									<div className={cx('mr-row', s.id === current && 'is-current')}>
										<button type="button" className="mr-row-go" onClick={() => onGo(SURAH_START_PAGES[s.id - 1])}>
											<span className="mr-row-no">{fmt(s.id)}</span>
											<span className="mr-row-main">
												<b>{ar ? s.nameAr : s.nameEn}</b>
												<small>
													{fmt(s.versesCount)} {t.ayat}
													{quarters.length ? ` · ${fmt(quarters.length)} ${t.quarters}` : ''}
												</small>
											</span>
											<span className="mr-row-page">{fmt(SURAH_START_PAGES[s.id - 1])}</span>
										</button>
										{quarters.length ? (
											<button
												type="button"
												className="mr-row-more"
												aria-expanded={open}
												aria-label={t.showQuarters}
												onClick={() => setOpenSurah(open ? null : s.id)}
											>
												<ChevronDown size={18} />
											</button>
										) : (
											<span className="mr-row-more is-empty" aria-hidden="true" />
										)}
									</div>
									{open ? (
										<ol className="mr-quarters">
											{quarters.map(q => (
												<li key={q.n}>
													<button type="button" className={cx('mr-quarter', q.page === page && 'is-here')} onClick={() => onGo(q.page)}>
														<span className="mr-quarter-mark" aria-hidden="true">۞</span>
														<span className="mr-quarter-main">
															<b>{quarterLabel(q.n, t, fmt)}</b>
															<span className="mr-quarter-words wa-quran-face" lang="ar" dir="rtl">
																{q.words}
															</span>
														</span>
														<span className="mr-quarter-meta">
															<small>
																{t.ayah} {fmt(q.a)}
															</small>
															<b>{fmt(q.page)}</b>
														</span>
													</button>
												</li>
											))}
										</ol>
									) : null}
								</div>
							);
						})
					) : (
						<div className="mr-juz-grid">
							{JUZ_START_PAGES.map((p, i) => (
								<button key={p} type="button" className={cx('mr-juz', i + 1 === currentJuz && 'is-current')} onClick={() => onGo(p)}>
									<b>
										{t.juz} {fmt(i + 1)}
									</b>
									<small>{surahName(surahAtPage(p), ar)}</small>
									<span>
										{t.page} {fmt(p)}
									</span>
								</button>
							))}
						</div>
					)}
				</div>
			</section>
		</div>
	);
}
