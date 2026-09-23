'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AnimatePresence, motion } from 'framer-motion';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import '@/lib/ai-reading/reading-fonts.css';
import {
	Bookmark,
	ChevronLeft,
	ChevronRight,
	Highlighter,
	MessageSquare,
	Settings2,
	Sparkles,
	X,
	Check,
	ListTodo,
	Lightbulb,
	HelpCircle,
	Timer,
	Play,
	Pause,
	RotateCcw,
	Star,
	Quote,
	Brain,
	CheckCheck,
	Loader2,
	Languages,
	FileSearch,
	Bot,
	LayoutList,
	MoreHorizontal,
	Layers,
	Bookmark,
	Pencil,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { HIGHLIGHT_TYPES, flattenPages, computeProgressPercent } from '@/lib/ai-reading/schemas';
import {
	getPrefs,
	savePrefs,
	upsertBook,
	recordReadingActivity,
	touchBookOpen,
	listPrompts,
	ensureDefaultMemorizePrompt,
	ensureDefaultPolishPrompt,
	resolveReadingPrefs,
	bookHasCustomReadingPrefs,
	pickPrefs,
	READING_APPEARANCE_KEYS,
	READING_GLOBAL_KEYS,
} from '@/lib/ai-reading/storage';
import { enqueueReviewItems } from '@/lib/ai-reading/spaced-review';
import { aiReadingApi } from '@/lib/ai-reading/client-api';
import { uid } from '@/lib/ai-reading/schemas';
import { detectTextLang, readingFontFamily, resolveReadingLang, uiFontFamily } from '@/lib/ai-reading/fonts';
import {
	FONT_PRESET_ARABIC,
	FONT_PRESET_LATIN,
	READING_THEME_IDS,
	THEME_STYLES,
	isArabicFontPreset,
	resolveContentFont,
} from '@/lib/ai-reading/themes';
import {
	createMemorization,
	findPagesForSelection,
	resolvePageBlocks,
	toggleMemorizationView,
} from '@/lib/ai-reading/memorize';
import { enqueueFlashcardReviews, pagePlainText, bionicNodes } from '@/lib/ai-reading/reading-smart';
import {
	SmartResumeBanner,
	GlossaryStrip,
	ReadingToolsRail,
	FocusModeOverlay,
	ListenBar,
	InlineAskModal,
	FlashcardsModal,
	CoachModal,
} from '@/components/ai-reading/ReadingSmartTools';
import { DEFAULT_MEMORIZE_PROMPT_ID, DEFAULT_POLISH_PROMPT_ID } from '@/lib/ai-reading/default-prompts';
import CustomSelect from '@/components/ai-reading/CustomSelect';

/** Selection bar: memorize + important + quote (+ translate separately). */
const SELECTION_HIGHLIGHTS = HIGHLIGHT_TYPES.filter(h => h.id === 'important' || h.id === 'quote');

const HIGHLIGHT_ACTION_ICONS = {
	important: Star,
	idea: Lightbulb,
	quote: Quote,
	question: HelpCircle,
	action: ListTodo,
};

const TIMER_PRESETS = [1, 5, 10, 15, 25];

function formatTimer(sec) {
	const s = Math.max(0, Math.floor(sec));
	const m = Math.floor(s / 60);
	const r = s % 60;
	return `${m}:${String(r).padStart(2, '0')}`;
}

function clampTimerMins(n) {
	const v = Math.round(Number(n) || 0);
	return Math.min(180, Math.max(1, v));
}

/** Strip noisy page counters that sometimes land in imported body copy (e.g. 2/129, 3 من 80). */
function isPageCounterNoise(text) {
	const s = String(text || '')
		.trim()
		.replace(/\u200f|\u200e/g, '');
	if (!s || s.length > 24) return false;
	return (
		/^\d+\s*\/\s*\d+$/.test(s) ||
		/^\d+\s*من\s*\d+$/.test(s) ||
		/^(page|صفحة)\s*\d+(\s*\/\s*\d+)?$/i.test(s) ||
		/^p\.?\s*\d+$/i.test(s)
	);
}

export default function ReadingView({ book: initialBook }) {
	const t = useTranslations('aiReading');
	const locale = useLocale();
	const [book, setBook] = useState(initialBook);
	const [globalPrefs, setGlobalPrefs] = useState(getPrefs);
	const [prefsSaved, setPrefsSaved] = useState(false);
	const [panel, setPanel] = useState(null); // knowledge | ask | settings | toc
	const [selectionMenu, setSelectionMenu] = useState(null);
	const [askQ, setAskQ] = useState('');
	const [askBusy, setAskBusy] = useState(false);
	const [askResult, setAskResult] = useState(null);
	const [enrichBusy, setEnrichBusy] = useState(false);
	const [enrichResult, setEnrichResult] = useState(null);
	const [timerOpen, setTimerOpen] = useState(false);
	const [timerPick, setTimerPick] = useState(5);
	const [timerCustom, setTimerCustom] = useState('5');
	const [timerShowCustom, setTimerShowCustom] = useState(false);
	const [timerRemaining, setTimerRemaining] = useState(null); // seconds or null
	const [timerRunning, setTimerRunning] = useState(false);
	const [timerDone, setTimerDone] = useState(false);
	const [scrollPct, setScrollPct] = useState(0);
	const [memorize, setMemorize] = useState(null);
	/* memorize: { text, promptId, summary, busy, error, pageHits } */
	const [polish, setPolish] = useState(null);
	/* polish: { text, promptId, instructions, improved, audit, title, busy, error, applied } */
	const [structure, setStructure] = useState(null);
	/* structure: { text, pageTitle, notes, blocks, busy, error, applied, pageId } */
	const [translatePanel, setTranslatePanel] = useState(null);
	/* { word, context, translation, meaning, contextNote, busy, error, saved } */
	const [mobileAiOpen, setMobileAiOpen] = useState(false);
	const [focusMode, setFocusMode] = useState(false);
	const [focusIndex, setFocusIndex] = useState(0);
	const [bionicOn, setBionicOn] = useState(false);
	const [listenOn, setListenOn] = useState(false);
	const [listenPlaying, setListenPlaying] = useState(false);
	const [listenSentence, setListenSentence] = useState(-1);
	const [difficulty, setDifficulty] = useState('original');
	const [diffBusy, setDiffBusy] = useState(false);
	const [flashcardsOpen, setFlashcardsOpen] = useState(false);
	const [coachOpen, setCoachOpen] = useState(false);
	const [coachBusy, setCoachBusy] = useState(false);
	const [coachData, setCoachData] = useState(null);
	const [inlineAsk, setInlineAsk] = useState(null);
	/* { passage, question, busy, result } */
	const [showResume, setShowResume] = useState(true);
	const [headerMoreOpen, setHeaderMoreOpen] = useState(false);
	const [editMode, setEditMode] = useState(false);
	const [pinPlaceMode, setPinPlaceMode] = useState(false);
	const [pinFlash, setPinFlash] = useState(false);
	const articleRef = useRef(null);
	const articleInnerRef = useRef(null);
	const lenisRef = useRef(null);
	const readTick = useRef(null);
	const wheelLock = useRef(false);
	const selectionToolbarRef = useRef(null);
	const pinJumpDone = useRef(false);
	const prefs = useMemo(() => resolveReadingPrefs(book, globalPrefs), [book, globalPrefs]);
	const hasArticlePrefs = bookHasCustomReadingPrefs(book);
	const pageMode = prefs.pageMode === 'scroll' ? 'scroll' : 'pages';
	const wheelTurnsPage = prefs.wheelTurnsPage !== false;

	const pages = useMemo(() => flattenPages(book), [book]);
	const pageIndex = Math.max(
		0,
		pages.findIndex(p => p.page.id === book.progress?.pageId),
	);
	const current = pages[pageIndex] || pages[0];
	const theme = THEME_STYLES[prefs.theme] || THEME_STYLES.light;

	useEffect(() => {
		setDifficulty(current?.page?._difficulty || 'original');
	}, [current?.page?.id, current?.page?._difficulty]);

	useEffect(() => {
		touchBookOpen(book.id);
		readTick.current = setInterval(() => recordReadingActivity(1), 60000);
		return () => clearInterval(readTick.current);
	}, [book.id]);

	const persist = next => {
		const saved = upsertBook(next);
		setBook(saved);
		return saved;
	};

	const flashPrefsSaved = () => {
		setPrefsSaved(true);
		setTimeout(() => setPrefsSaved(false), 1800);
	};

	const updatePrefs = patch => {
		const appearancePatch = pickPrefs(patch, READING_APPEARANCE_KEYS);
		const globalPatch = pickPrefs(patch, READING_GLOBAL_KEYS);

		if (Object.keys(globalPatch).length) {
			const nextGlobal = savePrefs(globalPatch);
			setGlobalPrefs(nextGlobal);
			flashPrefsSaved();
		}

		if (Object.keys(appearancePatch).length) {
			const readingPrefs = {
				...(book.readingPrefs && typeof book.readingPrefs === 'object' ? book.readingPrefs : {}),
				...appearancePatch,
			};
			persist({ ...book, readingPrefs });
			flashPrefsSaved();
		}
	};

	const saveReadingAsGlobalDefault = () => {
		const appearance = pickPrefs(prefs, READING_APPEARANCE_KEYS);
		const nextGlobal = savePrefs(appearance);
		setGlobalPrefs(nextGlobal);
		persist({ ...book, readingPrefs: {} });
		flashPrefsSaved();
	};

	const resetArticleReadingPrefs = () => {
		const { readingPrefs: _drop, ...rest } = book;
		persist({ ...rest, readingPrefs: {} });
		flashPrefsSaved();
	};

	const goPage = idx => {
		const target = pages[idx];
		if (!target) return;
		const percent = Math.round(((idx + 1) / pages.length) * 100);
		persist({
			...book,
			progress: {
				chapterId: target.chapter.id,
				pageId: target.page.id,
				percent,
				scrollRatio: 0,
			},
		});
		articleRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' });
		lenisRef.current?.scrollTo?.(0, { immediate: false });
	};

	useEffect(() => {
		const onKey = e => {
			if (e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA') return;
			if (pageMode === 'pages') {
				if (e.key === 'ArrowRight' || e.key === 'j') goPage(pageIndex + (locale === 'ar' ? -1 : 1));
				if (e.key === 'ArrowLeft' || e.key === 'k') goPage(pageIndex + (locale === 'ar' ? 1 : -1));
			}
			if (e.key === 'Escape') {
				setPanel(null);
				setTimerOpen(false);
				setMemorize(null);
				setTranslatePanel(null);
				setSelectionMenu(null);
				setMobileAiOpen(false);
				setFocusMode(false);
				setFlashcardsOpen(false);
				setCoachOpen(false);
				setInlineAsk(null);
				setHeaderMoreOpen(false);
				if (listenOn) {
					window.speechSynthesis?.cancel();
					setListenOn(false);
					setListenPlaying(false);
				}
				if (editMode) setEditMode(false);
				if (pinPlaceMode) setPinPlaceMode(false);
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [pageIndex, pages.length, locale, pageMode]);

	useEffect(() => {
		if (!timerRunning || timerRemaining == null) return;
		if (timerRemaining <= 0) {
			setTimerRunning(false);
			setTimerDone(true);
			setTimerRemaining(0);
			return;
		}
		const id = setInterval(() => {
			setTimerRemaining(s => {
				if (s == null) return s;
				if (s <= 1) {
					setTimerRunning(false);
					setTimerDone(true);
					return 0;
				}
				return s - 1;
			});
		}, 1000);
		return () => clearInterval(id);
	}, [timerRunning, timerRemaining]);

	useEffect(() => {
		const el = articleRef.current;
		if (!el || pageMode !== 'pages' || !wheelTurnsPage) return;
		const onWheel = e => {
			if (Math.abs(e.deltaY) < 18) return;
			const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 24;
			const atTop = el.scrollTop <= 12;
			if (e.deltaY > 0 && atBottom) {
				if (wheelLock.current || pageIndex >= pages.length - 1) return;
				wheelLock.current = true;
				goPage(pageIndex + 1);
				setTimeout(() => {
					wheelLock.current = false;
				}, 550);
			} else if (e.deltaY < 0 && atTop) {
				if (wheelLock.current || pageIndex <= 0) return;
				wheelLock.current = true;
				goPage(pageIndex - 1);
				setTimeout(() => {
					wheelLock.current = false;
				}, 550);
			}
		};
		el.addEventListener('wheel', onWheel, { passive: true });
		return () => el.removeEventListener('wheel', onWheel);
	}, [pageMode, wheelTurnsPage, pageIndex, pages.length]);

	/* Lenis smooth scroll + side progress (scroll mode) */
	useEffect(() => {
		const wrapper = articleRef.current;
		const content = articleInnerRef.current;
		if (!wrapper || !content) return;

		const reduced =
			typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		const updatePct = () => {
			const max = wrapper.scrollHeight - wrapper.clientHeight;
			const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((wrapper.scrollTop / max) * 100))) : 0;
			setScrollPct(pct);
		};

		if (pageMode !== 'scroll' || reduced) {
			lenisRef.current?.destroy?.();
			lenisRef.current = null;
			wrapper.addEventListener('scroll', updatePct, { passive: true });
			updatePct();
			return () => wrapper.removeEventListener('scroll', updatePct);
		}

		const lenis = new Lenis({
			wrapper,
			content,
			autoRaf: true,
			smoothWheel: true,
			lerp: 0.085,
			wheelMultiplier: 0.92,
			touchMultiplier: 1.05,
			syncTouch: false,
		});
		lenisRef.current = lenis;
		lenis.on('scroll', updatePct);
		updatePct();

		return () => {
			lenis.off?.('scroll', updatePct);
			lenis.destroy();
			lenisRef.current = null;
		};
	}, [pageMode, pages.length, book.id]);

	const startTimer = mins => {
		const m = clampTimerMins(mins ?? timerPick);
		setTimerPick(m);
		setTimerCustom(String(m));
		setTimerRemaining(m * 60);
		setTimerRunning(true);
		setTimerDone(false);
		setTimerShowCustom(false);
		setTimerOpen(false);
	};

	const toggleTimerPause = () => {
		if (timerRemaining == null || timerRemaining <= 0) return;
		setTimerRunning(r => !r);
		setTimerDone(false);
	};

	const cancelTimer = () => {
		setTimerRunning(false);
		setTimerRemaining(null);
		setTimerDone(false);
		setTimerShowCustom(false);
		setTimerOpen(false);
	};

	const restartTimer = () => {
		startTimer(timerPick);
	};

	const resetTimer = cancelTimer;

	const onMouseUp = () => {
		const sel = window.getSelection();
		const text = sel?.toString().trim();
		if (!text || text.length < 2) {
			setSelectionMenu(null);
			return;
		}
		const range = sel.getRangeAt(0);
		const rect = range.getBoundingClientRect();
		const menuH = 56;
		const gap = 12;
		const pad = 16;
		const placeAbove = rect.top >= menuH + gap + 64;
		const edge = Math.min(140, Math.max(72, window.innerWidth * 0.28));
		const x = Math.min(Math.max(rect.left + rect.width / 2, edge), window.innerWidth - edge);
		const y = placeAbove
			? Math.max(rect.top - gap, pad)
			: Math.min(rect.bottom + gap, window.innerHeight - menuH - pad);
		const blockEl =
			range.commonAncestorContainer?.nodeType === 1
				? range.commonAncestorContainer
				: range.commonAncestorContainer?.parentElement;
		const context = String(
			blockEl?.closest?.('p, li, blockquote, h1, h2, h3, h4, div')?.textContent || text,
		)
			.trim()
			.slice(0, 420);
		const menu = {
			text,
			context,
			x,
			y,
			place: placeAbove ? 'above' : 'below',
		};
		setSelectionMenu(menu);
	};

	useEffect(() => {
		if (!selectionMenu) return;
		const onDown = e => {
			if (selectionToolbarRef.current?.contains(e.target)) return;
			setSelectionMenu(null);
		};
		// next tick so the opening mouseup doesn't immediately clear
		const t = setTimeout(() => document.addEventListener('mousedown', onDown), 0);
		return () => {
			clearTimeout(t);
			document.removeEventListener('mousedown', onDown);
		};
	}, [selectionMenu]);

	const favoritePrompts = useMemo(() => {
		const all = ensureDefaultMemorizePrompt();
		const favs = all.filter(p => p.favorite);
		const pool = favs.length ? favs : all;
		return pool;
	}, [memorize?.promptId, book.id]);

	const polishPrompts = useMemo(() => {
		const all = ensureDefaultPolishPrompt();
		const favs = all.filter(p => p.favorite);
		return favs.length ? favs : all;
	}, [polish?.promptId, book.id]);

	const openMemorize = (text = selectionMenu?.text) => {
		if (!text || text.trim().length < 20) return;
		const prompts = ensureDefaultMemorizePrompt();
		const favs = prompts.filter(p => p.favorite);
		const pool = favs.length ? favs : prompts;
		const defaultPrompt =
			pool.find(p => p.id === DEFAULT_MEMORIZE_PROMPT_ID) || pool[0] || null;
		const pageHits = findPagesForSelection(book, text);
		setMemorize({
			text: text.trim(),
			promptId: defaultPrompt?.id || '',
			summary: '',
			busy: false,
			error: '',
			pageHits,
		});
		setSelectionMenu(null);
		window.getSelection()?.removeAllRanges();
	};

	const openPolish = () => {
		const text = (current?.page.blocks || [])
			.map(b => b.text || (b.items || []).join(', '))
			.join('\n\n')
			.trim();
		if (!text || text.length < 20) {
			setEnrichResult({
				mode: 'polish',
				error: t('reading.polishEmpty'),
				language: book.language === 'ar' || book.language === 'en' ? book.language : locale === 'ar' ? 'ar' : 'en',
			});
			return;
		}
		const prompts = ensureDefaultPolishPrompt();
		const favs = prompts.filter(p => p.favorite);
		const pool = favs.length ? favs : prompts;
		const defaultPrompt =
			pool.find(p => p.id === DEFAULT_POLISH_PROMPT_ID) || pool[0] || null;
		setPolish({
			text,
			promptId: defaultPrompt?.id || '',
			instructions: defaultPrompt?.body || '',
			improved: '',
			title: '',
			audit: null,
			busy: false,
			error: '',
			applied: false,
			pageId: current?.page?.id,
		});
	};

	const openStructure = () => {
		const text = (current?.page.blocks || [])
			.map(b => b.text || (b.items || []).join('\n'))
			.join('\n\n')
			.trim();
		if (!text || text.length < 20) {
			setEnrichResult({
				mode: 'structure',
				error: t('reading.structureEmpty'),
				language: book.language === 'ar' || book.language === 'en' ? book.language : locale === 'ar' ? 'ar' : 'en',
			});
			return;
		}
		const pageId = current?.page?.id;
		const pageTitle = current?.page?.title || '';
		setStructure({
			text,
			pageTitle,
			notes: '',
			blocks: [],
			busy: true,
			error: '',
			applied: false,
			pageId,
		});
		const lang =
			detectTextLang(text) ||
			(book.language === 'ar' || book.language === 'en' ? book.language : locale === 'ar' ? 'ar' : 'en');
		aiReadingApi
			.structure({ text, title: pageTitle || book.title, language: lang })
			.then(data => {
				setStructure(s =>
					s
						? {
								...s,
								busy: false,
								pageTitle: data.pageTitle || s.pageTitle,
								notes: data.notes || '',
								blocks: Array.isArray(data.blocks) ? data.blocks : [],
							}
						: s,
				);
			})
			.catch(e => {
				setStructure(s => (s ? { ...s, busy: false, error: e.message || t('reading.structureError') } : s));
			});
	};

	const runStructure = async () => {
		if (!structure?.text) return;
		const lang =
			detectTextLang(structure.text) ||
			(book.language === 'ar' || book.language === 'en' ? book.language : locale === 'ar' ? 'ar' : 'en');
		setStructure(s => (s ? { ...s, busy: true, error: '', blocks: [], applied: false } : s));
		try {
			const data = await aiReadingApi.structure({
				text: structure.text,
				title: structure.pageTitle || book.title,
				language: lang,
			});
			setStructure(s =>
				s
					? {
							...s,
							busy: false,
							pageTitle: data.pageTitle || s.pageTitle,
							notes: data.notes || '',
							blocks: Array.isArray(data.blocks) ? data.blocks : [],
						}
					: s,
			);
		} catch (e) {
			setStructure(s => (s ? { ...s, busy: false, error: e.message || t('reading.structureError') } : s));
		}
	};

	const applyStructure = () => {
		if (!structure?.blocks?.length || !structure.pageId) return;
		const blocks = structure.blocks.map(b => ({
			...b,
			id: b.id || uid('blk'),
		}));
		const nextChapters = (book.chapters || []).map(ch => ({
			...ch,
			pages: (ch.pages || []).map(pg => {
				if (pg.id !== structure.pageId) return pg;
				return {
					...pg,
					title: structure.pageTitle || pg.title,
					blocks,
					_originalBlocks: pg._originalBlocks || structuredClone(pg.blocks || []),
					_structuredAt: new Date().toISOString(),
				};
			}),
		}));
		persist({ ...book, chapters: nextChapters });
		setStructure(s => (s ? { ...s, applied: true } : s));
	};

	const openTranslate = async (text = selectionMenu?.text) => {
		const word = String(text || '').trim();
		if (!word) return;
		const context = selectionMenu?.context || '';
		const sourceLang = detectTextLang(word) || (locale === 'ar' ? 'ar' : 'en');
		const targetLang = sourceLang === 'ar' ? 'en' : 'ar';
		setSelectionMenu(null);
		window.getSelection()?.removeAllRanges();
		setTranslatePanel({
			word,
			context,
			translation: '',
			meaning: '',
			contextNote: '',
			busy: true,
			error: '',
			saved: false,
			targetLang,
		});
		try {
			const data = await aiReadingApi.translate({
				word,
				context,
				sourceLang,
				targetLang,
			});
			setTranslatePanel(p =>
				p
					? {
							...p,
							busy: false,
							translation: data.translation || '',
							meaning: data.meaning || '',
							contextNote: data.contextNote || context,
							targetLang: data.targetLang || targetLang,
						}
					: p,
			);
		} catch (e) {
			setTranslatePanel(p => (p ? { ...p, busy: false, error: e.message || t('reading.translateError') } : p));
		}
	};

	const saveImportantWord = () => {
		if (!translatePanel?.word) return;
		const entry = {
			id: uid('word'),
			word: translatePanel.word,
			translation: translatePanel.translation,
			meaning: translatePanel.meaning,
			context: translatePanel.contextNote || translatePanel.context || '',
			pageId: current?.page?.id || null,
			createdAt: new Date().toISOString(),
		};
		persist(
			enqueueFlashcardReviews({
				...book,
				knowledge: {
					...book.knowledge,
					importantWords: [entry, ...(book.knowledge.importantWords || []).filter(w => w.word !== entry.word)],
				},
			}),
		);
		setTranslatePanel(p => (p ? { ...p, saved: true } : p));
	};

	const runMemorize = async () => {
		if (!memorize?.text) return;
		const prompts = listPrompts();
		const chosen = prompts.find(p => p.id === memorize.promptId) || prompts.find(p => p.favorite) || prompts[0];
		const lang =
			detectTextLang(memorize.text) ||
			(book.language === 'ar' || book.language === 'en' ? book.language : locale === 'ar' ? 'ar' : 'en');
		setMemorize(m => (m ? { ...m, busy: true, error: '', summary: '' } : m));
		try {
			const data = await aiReadingApi.memorize({
				text: memorize.text,
				prompt: chosen?.body || '',
				title: book.title,
				language: lang,
			});
			setMemorize(m =>
				m
					? {
							...m,
							busy: false,
							summary: data.summary || '',
							promptId: chosen?.id || m.promptId,
						}
					: m,
			);
		} catch (e) {
			setMemorize(m => (m ? { ...m, busy: false, error: e.message || t('reading.memorizeError') } : m));
		}
	};

	const applyMemorize = () => {
		if (!memorize?.summary?.trim()) return;
		const prompts = listPrompts();
		const chosen = prompts.find(p => p.id === memorize.promptId);
		const lang =
			detectTextLang(memorize.text) ||
			(book.language === 'ar' || book.language === 'en' ? book.language : locale === 'ar' ? 'ar' : 'en');
		let pageHits = memorize.pageHits?.length ? memorize.pageHits : findPagesForSelection(book, memorize.text);
		if (!pageHits.length && current) {
			pageHits = [
				{
					pageId: current.page.id,
					chapterId: current.chapter.id,
					blocks: structuredClone(current.page.blocks || []),
				},
			];
		}

		if (!pageHits.length) {
			setMemorize(m => (m ? { ...m, error: t('reading.memorizeNoPages') } : m));
			return;
		}

		const entry = createMemorization({
			selectedText: memorize.text,
			summary: memorize.summary,
			promptId: chosen?.id,
			promptTitle: chosen?.title,
			pages: pageHits,
			language: lang,
		});

		persist(
			enqueueFlashcardReviews({
				...book,
				knowledge: {
					...book.knowledge,
					memorizations: [entry, ...(book.knowledge.memorizations || [])],
				},
			}),
		);
		setMemorize(null);
	};

	const selectPolishPrompt = promptId => {
		const prompts = ensureDefaultPolishPrompt();
		const chosen = prompts.find(p => p.id === promptId);
		setPolish(p =>
			p
				? {
						...p,
						promptId,
						instructions: chosen?.body || p.instructions,
						improved: '',
						audit: null,
						error: '',
						applied: false,
					}
				: p,
		);
	};

	const runPolish = async () => {
		if (!polish?.text) return;
		const instructions = String(polish.instructions || '').trim();
		const lang =
			detectTextLang(polish.text) ||
			(book.language === 'ar' || book.language === 'en' ? book.language : locale === 'ar' ? 'ar' : 'en');
		setPolish(p => (p ? { ...p, busy: true, error: '', improved: '', audit: null, applied: false } : p));
		try {
			const data = await aiReadingApi.polish({
				text: polish.text,
				prompt: instructions,
				title: book.title,
				language: lang,
			});
			setPolish(p =>
				p
					? {
							...p,
							busy: false,
							improved: data.improved || '',
							title: data.title || '',
							audit: data.audit || null,
						}
					: p,
			);
		} catch (e) {
			setPolish(p => (p ? { ...p, busy: false, error: e.message || t('reading.polishError') } : p));
		}
	};

	const applyPolish = () => {
		if (!polish?.improved?.trim() || !polish.pageId) return;
		const paragraphs = String(polish.improved)
			.split(/\n{2,}/)
			.map(s => s.trim())
			.filter(Boolean);
		const blocks = (paragraphs.length ? paragraphs : [polish.improved]).map(text => ({
			id: uid('blk'),
			type: 'paragraph',
			text,
		}));
		const nextChapters = (book.chapters || []).map(ch => ({
			...ch,
			pages: (ch.pages || []).map(pg => {
				if (pg.id !== polish.pageId) return pg;
				return {
					...pg,
					title: polish.title || pg.title,
					blocks,
					_originalBlocks: pg._originalBlocks || structuredClone(pg.blocks || []),
					_polishedAt: new Date().toISOString(),
				};
			}),
		}));
		persist({ ...book, chapters: nextChapters });
		setPolish(p => (p ? { ...p, applied: true } : p));
	};

	const flipMemorization = id => {
		persist({
			...book,
			knowledge: {
				...book.knowledge,
				memorizations: toggleMemorizationView(book.knowledge.memorizations || [], id),
			},
		});
	};

	const addHighlight = type => {
		if (!selectionMenu) return;
		const color = HIGHLIGHT_TYPES.find(h => h.id === type)?.color || '#f59e0b';
		const highlight = {
			id: uid('hl'),
			text: selectionMenu.text,
			type,
			color,
			pageId: current?.page.id,
			chapterId: current?.chapter.id,
			createdAt: new Date().toISOString(),
		};
		const knowledge = {
			...book.knowledge,
			highlights: [highlight, ...(book.knowledge.highlights || [])],
		};
		if (type === 'idea') {
			knowledge.keyIdeas = [{ id: uid('idea'), text: selectionMenu.text, createdAt: highlight.createdAt }, ...knowledge.keyIdeas];
		}
		if (type === 'question') {
			knowledge.questions = [{ id: uid('q'), text: selectionMenu.text, answer: '', createdAt: highlight.createdAt }, ...knowledge.questions];
		}
		if (type === 'action') {
			knowledge.actions = [{ id: uid('act'), text: selectionMenu.text, done: false, createdAt: highlight.createdAt }, ...knowledge.actions];
		}
		persist(enqueueFlashcardReviews(enqueueReviewItems({ ...book, knowledge })));
		setSelectionMenu(null);
		window.getSelection()?.removeAllRanges();
	};

	const removeHighlight = id => {
		persist({
			...book,
			knowledge: {
				...book.knowledge,
				highlights: (book.knowledge.highlights || []).filter(h => h.id !== id),
			},
		});
	};

	const addNote = text => {
		if (!text.trim()) return;
		const note = { id: uid('note'), text: text.trim(), pageId: current?.page.id, createdAt: new Date().toISOString() };
		persist({
			...book,
			knowledge: { ...book.knowledge, notes: [note, ...book.knowledge.notes] },
		});
	};

	const toggleAction = id => {
		persist({
			...book,
			knowledge: {
				...book.knowledge,
				actions: book.knowledge.actions.map(a => (a.id === id ? { ...a, done: !a.done } : a)),
			},
		});
	};

	const progress = computeProgressPercent(book) || book.progress?.percent || 0;
	const sampleText = (current?.page?.blocks || []).map(b => b.text || '').join(' ');
	const readingLang = resolveReadingLang({
		locale,
		bookLanguage: book.language,
		sampleText,
	});
	const isContentRTL = readingLang === 'ar';
	const contentFont = resolveContentFont(readingLang, prefs.fontPreset);
	const toolsFont = uiFontFamily(locale === 'ar' ? 'ar' : 'en');
	const ChevPrev = isContentRTL ? ChevronRight : ChevronLeft;
	const ChevNext = isContentRTL ? ChevronLeft : ChevronRight;

	const runAsk = async () => {
		if (!askQ.trim()) return;
		setAskBusy(true);
		setAskResult(null);
		try {
			const data = await aiReadingApi.ask({ question: askQ, book, language: readingLang });
			setAskResult(data);
		} catch (e) {
			setAskResult({ answer: e.message });
		} finally {
			setAskBusy(false);
		}
	};

	const openInlineAsk = (text = selectionMenu?.text) => {
		if (!text || text.trim().length < 2) return;
		setSelectionMenu(null);
		setInlineAsk({ passage: text.trim(), question: '', busy: false, result: null });
	};

	const runInlineAsk = async () => {
		if (!inlineAsk?.question?.trim() || !inlineAsk?.passage) return;
		setInlineAsk(p => (p ? { ...p, busy: true, result: null } : p));
		try {
			const data = await aiReadingApi.ask({
				question: inlineAsk.question,
				book,
				language: readingLang,
				passage: inlineAsk.passage,
			});
			setInlineAsk(p => (p ? { ...p, busy: false, result: data } : p));
		} catch (e) {
			setInlineAsk(p => (p ? { ...p, busy: false, result: { answer: e.message } } : p));
		}
	};

	const applyDifficulty = async level => {
		if (!current?.page?.id || diffBusy) return;
		setDifficulty(level);
		if (level === 'original') {
			const nextChapters = (book.chapters || []).map(ch => ({
				...ch,
				pages: (ch.pages || []).map(pg => {
					if (pg.id !== current.page.id) return pg;
					if (pg._originalBlocks) {
						return { ...pg, blocks: structuredClone(pg._originalBlocks), _difficulty: 'original' };
					}
					return { ...pg, _difficulty: 'original' };
				}),
			}));
			persist({ ...book, chapters: nextChapters });
			return;
		}
		setDiffBusy(true);
		try {
			const page = current.page;
			const original = page._originalBlocks || structuredClone(page.blocks || []);
			const excerpt = pagePlainText({ ...page, blocks: original });
			const data = await aiReadingApi.enrich({
				mode: level === 'eli5' ? 'eli5' : 'simplify',
				excerpt,
				title: book.title,
				language: readingLang,
			});
			const simplified = String(data.result?.simplified || '').trim();
			if (!simplified) throw new Error(t('reading.diffError'));
			const paragraphs = simplified
				.split(/\n{2,}/)
				.map(s => s.trim())
				.filter(Boolean);
			const blocks = (paragraphs.length ? paragraphs : [simplified]).map(text => ({
				id: uid('blk'),
				type: 'paragraph',
				text,
			}));
			const nextChapters = (book.chapters || []).map(ch => ({
				...ch,
				pages: (ch.pages || []).map(pg => {
					if (pg.id !== current.page.id) return pg;
					return {
						...pg,
						_originalBlocks: original,
						blocks,
						_difficulty: level,
					};
				}),
			}));
			persist({ ...book, chapters: nextChapters });
		} catch (e) {
			setEnrichResult({ mode: level, error: e.message, language: readingLang });
			setDifficulty(current?.page?._difficulty || 'original');
		} finally {
			setDiffBusy(false);
		}
	};

	const runCoach = async () => {
		setCoachBusy(true);
		setCoachData(null);
		try {
			const excerpt = pagePlainText(current?.page);
			const data = await aiReadingApi.enrich({
				mode: 'coach',
				excerpt,
				title: book.title,
				language: readingLang,
			});
			setCoachData({
				questions: (data.result?.questions || []).slice(0, 3),
				action: data.result?.action || '',
			});
		} catch (e) {
			setCoachData({ questions: [e.message], action: '' });
		} finally {
			setCoachBusy(false);
		}
	};

	const saveCoach = () => {
		if (!coachData) return;
		const qs = (coachData.questions || []).map(text => ({
			id: uid('q'),
			text,
			answer: '',
			createdAt: new Date().toISOString(),
			fromCoach: true,
		}));
		const acts = coachData.action
			? [{ id: uid('act'), text: coachData.action, done: false, createdAt: new Date().toISOString(), fromCoach: true }]
			: [];
		const next = enqueueFlashcardReviews(
			enqueueReviewItems({
				...book,
				knowledge: {
					...book.knowledge,
					questions: [...qs, ...(book.knowledge.questions || [])],
					actions: [...acts, ...(book.knowledge.actions || [])],
				},
			}),
		);
		persist(next);
		setCoachOpen(false);
		setCoachData(null);
	};

	const resumeFromHighlight = (idx, highlight) => {
		goPage(idx);
		setShowResume(false);
		setTimeout(() => {
			if (!highlight?.text) return;
			const root = articleRef.current;
			if (!root) return;
			const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
			let node;
			while ((node = walker.nextNode())) {
				if (node.textContent && node.textContent.includes(highlight.text.slice(0, 40))) {
					node.parentElement?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
					break;
				}
			}
		}, 350);
	};

	const readingPin = book.progress?.pin || null;

	const setReadingPin = (pageEntry, block) => {
		if (!pageEntry?.page || !block?.id) return;
		const snippet = String(block.text || (block.items || []).join(' ') || '')
			.trim()
			.slice(0, 120);
		persist({
			...book,
			progress: {
				...(book.progress || {}),
				chapterId: pageEntry.chapter.id,
				pageId: pageEntry.page.id,
				pin: {
					pageId: pageEntry.page.id,
					chapterId: pageEntry.chapter.id,
					blockId: block.id,
					snippet,
					createdAt: new Date().toISOString(),
				},
			},
		});
		setPinPlaceMode(false);
		setPinFlash(true);
		setTimeout(() => setPinFlash(false), 1600);
	};

	const togglePinPlaceMode = () => {
		setEditMode(false);
		setSelectionMenu(null);
		setPinPlaceMode(v => !v);
	};

	const jumpToPin = (pin = readingPin) => {
		if (!pin?.pageId) return;
		const idx = pages.findIndex(p => p.page.id === pin.pageId);
		if (idx >= 0) goPage(idx);
		setShowResume(false);
		setTimeout(() => {
			const el = pin.blockId ? document.getElementById(`block-${pin.blockId}`) : null;
			el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
		}, 380);
	};

	useEffect(() => {
		pinJumpDone.current = false;
	}, [book.id]);

	useEffect(() => {
		if (pinJumpDone.current) return;
		const pin = book.progress?.pin;
		if (!pin?.pageId || !pages.length) return;
		pinJumpDone.current = true;
		const t = setTimeout(() => jumpToPin(pin), 280);
		return () => clearTimeout(t);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- only on open
	}, [book.id, pages.length]);

	const updateBlockContent = (pageId, blockId, patch) => {
		const nextChapters = (book.chapters || []).map(ch => ({
			...ch,
			pages: (ch.pages || []).map(p => {
				if (p.id !== pageId) return p;
				return {
					...p,
					blocks: (p.blocks || []).map(b => (b.id === blockId ? { ...b, ...patch } : b)),
				};
			}),
		}));
		persist({ ...book, chapters: nextChapters });
	};

	const runEnrich = async mode => {
		const excerpt = (current?.page.blocks || []).map(b => b.text || (b.items || []).join(', ')).join('\n');
		setEnrichBusy(true);
		setEnrichResult(null);
		try {
			const isTranslate = mode === 'translate_ar' || mode === 'translate_en';
			const targetLang = mode === 'translate_ar' ? 'ar' : mode === 'translate_en' ? 'en' : readingLang;
			const data = isTranslate
				? await aiReadingApi.translatePage({
						excerpt,
						title: book.title,
						targetLang,
						mode,
					})
				: await aiReadingApi.enrich({
						mode,
						excerpt,
						title: book.title,
						language: targetLang,
						targetLang,
					});
			if (data.error && !data.result?.translation) {
				throw new Error(data.error);
			}
			setEnrichResult({
				mode,
				language: data.language || targetLang,
				pageId: current?.page?.id,
				...data.result,
			});
			if (mode === 'key_ideas' && data.result?.keyIdeas) {
				const ideas = data.result.keyIdeas.map(text => ({ id: uid('idea'), text, createdAt: new Date().toISOString() }));
				persist(enqueueReviewItems({ ...book, knowledge: { ...book.knowledge, keyIdeas: [...ideas, ...book.knowledge.keyIdeas] } }));
			}
			if (mode === 'questions' && data.result?.questions) {
				const qs = data.result.questions.map(text => ({ id: uid('q'), text, answer: '', createdAt: new Date().toISOString() }));
				persist(enqueueReviewItems({ ...book, knowledge: { ...book.knowledge, questions: [...qs, ...book.knowledge.questions] } }));
			}
			if (mode === 'actions' && data.result?.actions) {
				const acts = data.result.actions.map(text => ({ id: uid('act'), text, done: false, createdAt: new Date().toISOString() }));
				persist(enqueueReviewItems({ ...book, knowledge: { ...book.knowledge, actions: [...acts, ...book.knowledge.actions] } }));
			}
		} catch (e) {
			setEnrichResult({ mode, error: e.message, language: readingLang });
		} finally {
			setEnrichBusy(false);
		}
	};

	const applyPageTranslation = () => {
		if (!enrichResult?.translation || !current?.page?.id) return;
		const paragraphs = String(enrichResult.translation)
			.split(/\n{2,}/)
			.map(s => s.trim())
			.filter(Boolean);
		const blocks = (paragraphs.length ? paragraphs : [enrichResult.translation]).map(text => ({
			id: uid('blk'),
			type: 'paragraph',
			text,
		}));
		const nextChapters = (book.chapters || []).map(ch => ({
			...ch,
			pages: (ch.pages || []).map(pg => {
				if (pg.id !== current.page.id) return pg;
				return {
					...pg,
					title: enrichResult.title || pg.title,
					blocks,
					_originalBlocks: pg._originalBlocks || structuredClone(pg.blocks || []),
					_translatedTo: enrichResult.language,
				};
			}),
		}));
		persist({ ...book, language: enrichResult.language || book.language, chapters: nextChapters });
		setEnrichResult(r => (r ? { ...r, applied: true } : r));
	};

	const enrichLang =
		enrichResult?.language ||
		detectTextLang(
			[
				enrichResult?.summary,
				enrichResult?.explanation,
				enrichResult?.translation,
				enrichResult?.simplified,
				...(enrichResult?.questions || []),
				...(enrichResult?.actions || []),
			]
				.filter(Boolean)
				.join(' '),
		) ||
		readingLang;
	const enrichRTL = enrichLang === 'ar';
	const enrichFont = readingFontFamily(enrichLang);

	const pageHighlights = (book.knowledge?.highlights || []).filter(
		h => !h.pageId || h.pageId === current?.page?.id,
	);

	const memorizations = book.knowledge?.memorizations || [];

	const renderPageBody = (pageEntry, highlightsForPage) => {
		const resolved = resolvePageBlocks(pageEntry.page, memorizations);
		const mem = resolved.memorization;

		return (
			<div className="space-y-3">
				{mem && (
					<div
						className="flex flex-wrap items-center justify-between gap-2 rounded-2xl px-3 py-2 text-xs font-semibold"
						style={{ background: `${theme.accent}14`, color: theme.accent }}
					>
						<span className="inline-flex items-center gap-1.5">
							<Brain size={13} />
							{mem.active === 'memorized' ? t('reading.memorizeShowingMem') : t('reading.memorizeShowingOrig')}
							{mem.promptTitle ? ` · ${mem.promptTitle}` : ''}
						</span>
						<button
							type="button"
							onClick={() => flipMemorization(mem.id)}
							className="rounded-full px-2.5 py-1 text-[11px] font-bold"
							style={{ background: theme.accent, color: '#fff' }}
						>
							{mem.active === 'memorized' ? t('reading.memorizeShowOriginal') : t('reading.memorizeShowMemorized')}
						</button>
					</div>
				)}

				{resolved.role === 'memorized-stub' ? (
					<p className="rounded-2xl border border-dashed px-4 py-3 text-sm opacity-70" style={{ borderColor: `${theme.ink}22` }}>
						{t('reading.memorizeStub')}
					</p>
				) : (
					<div
						className="flex flex-col"
						style={{ gap: `${prefs.paragraphGap || 1.25}rem`, textAlign: isContentRTL ? 'right' : 'left' }}
					>
						{(resolved.blocks || [])
							.filter(block => {
								const raw = block.type === 'list' ? (block.items || []).join(' ') : block.text;
								return !isPageCounterNoise(raw);
							})
							.map(block => {
							const isPinned = readingPin?.blockId === block.id;
							return (
								<div
									key={block.id}
									id={`block-${block.id}`}
									role={pinPlaceMode ? 'button' : undefined}
									tabIndex={pinPlaceMode ? 0 : undefined}
									onClick={
										pinPlaceMode && !editMode
											? e => {
													e.stopPropagation();
													setReadingPin(pageEntry, block);
												}
											: undefined
									}
									onKeyDown={
										pinPlaceMode && !editMode
											? e => {
													if (e.key === 'Enter' || e.key === ' ') {
														e.preventDefault();
														setReadingPin(pageEntry, block);
													}
												}
											: undefined
									}
									className={`relative scroll-mt-24 rounded-lg transition ${
										pinPlaceMode && !editMode
											? 'cursor-cell ring-1 ring-transparent hover:bg-black/[0.03] hover:ring-[color:var(--pin-ring)]'
											: ''
									}`}
									style={{
										['--pin-ring']: `${theme.accent}55`,
										...(isPinned && !pinPlaceMode
											? {
													boxShadow: `inset ${isContentRTL ? '-3px' : '3px'} 0 0 ${theme.accent}`,
													paddingInlineStart: '0.5rem',
												}
											: null),
									}}
								>
									{/* Only the saved stop mark — never a pin on every paragraph */}
									{isPinned && !pinPlaceMode && !editMode && (
										<span
											className="pointer-events-none absolute -top-1 z-10 flex items-center gap-1"
											style={{
												...(isContentRTL ? { left: -6 } : { right: -6 }),
											}}
											title={t('reading.pinSavedMark')}
										>
											<span
												className="inline-flex h-8 w-8 items-center justify-center rounded-full shadow-md ring-2 ring-white/30"
												style={{ background: theme.accent, color: '#fff' }}
											>
												<Bookmark size={15} fill="currentColor" strokeWidth={2} />
											</span>
										</span>
									)}
									{editMode ? (
										<div className="space-y-1.5">
											{block.type === 'list' ? (
												<textarea
													defaultValue={(block.items || []).join('\n')}
													onBlur={e => {
														const items = e.target.value
															.split('\n')
															.map(s => s.trim())
															.filter(Boolean);
														updateBlockContent(pageEntry.page.id, block.id, { items, text: items.join('\n') });
													}}
													rows={Math.max(3, (block.items || []).length + 1)}
													className="w-full resize-y rounded-xl border bg-transparent px-3 py-2 text-sm leading-relaxed outline-none"
													style={{
														borderColor: `${theme.accent}55`,
														color: theme.ink,
														fontFamily: contentFont,
														textAlign: isContentRTL ? 'right' : 'left',
													}}
													dir={isContentRTL ? 'rtl' : 'ltr'}
												/>
											) : (
												<textarea
													defaultValue={block.text || ''}
													onBlur={e => updateBlockContent(pageEntry.page.id, block.id, { text: e.target.value })}
													rows={Math.max(2, Math.ceil(String(block.text || '').length / 70))}
													className="w-full resize-y rounded-xl border bg-transparent px-3 py-2 text-sm leading-relaxed outline-none"
													style={{
														borderColor: `${theme.accent}55`,
														color: theme.ink,
														fontFamily: contentFont,
														fontSize: block.type === 'heading' ? '1.15em' : undefined,
														fontWeight: block.type === 'heading' ? 700 : undefined,
														textAlign: isContentRTL ? 'right' : 'left',
													}}
													dir={isContentRTL ? 'rtl' : 'ltr'}
												/>
											)}
											<p className="text-[10px] opacity-40">{t('reading.editHint')}</p>
										</div>
									) : (
										<Block
											block={block}
											theme={theme}
											highlights={highlightsForPage}
											isRTL={isContentRTL}
											fontFamily={contentFont}
											onRemoveHighlight={removeHighlight}
											bionic={bionicOn && !focusMode}
											keyIdeaLabel={
												mem?.active === 'memorized' && block.type === 'key_idea'
													? t('reading.memorizeLabel')
													: t('reading.keyIdeaLabel')
											}
										/>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>
		);
	};

	const enrichPanel = (
		<EnrichTools
			t={t}
			theme={theme}
			busy={enrichBusy}
			result={enrichResult}
			onRun={runEnrich}
			onOpenPolish={() => {
				setMobileAiOpen(false);
				openPolish();
			}}
			onOpenStructure={() => {
				setMobileAiOpen(false);
				openStructure();
			}}
			onApplyTranslation={() => {
				applyPageTranslation();
			}}
			fontFamily={toolsFont}
			resultFont={enrichFont}
			resultRTL={enrichRTL}
			aiModelKey={prefs.aiModelKey || 'gpt-oss:20b'}
			onOpenAiSettings={() => {
				setMobileAiOpen(false);
				setPanel('settings');
			}}
		/>
	);

	return (
		<div
			className="flex h-full min-h-0 flex-col"
			dir={isContentRTL ? 'rtl' : 'ltr'}
			style={{ background: theme.bg, color: theme.ink }}
		>
			<div className="pointer-events-none absolute inset-x-0 top-0 z-50 h-[3px] bg-black/10">
				<div
					className="h-full transition-all duration-500"
					style={{
						width: `${progress}%`,
						background: theme.accent,
						marginInlineStart: isContentRTL ? 'auto' : undefined,
					}}
				/>
			</div>

			<div
				className="relative z-40 shrink-0 border-b backdrop-blur-md"
				style={{ borderColor: `${theme.ink}15`, background: `${theme.bg}ee` }}
			>
				<div className="mx-auto flex max-w-7xl items-center justify-between gap-1.5 px-2.5 py-2 sm:gap-3 sm:px-4 sm:py-3">
					<div className="flex min-w-0 items-center gap-1 sm:gap-2">
						<Link
							href="/ai-studio/library"
							className="inline-flex shrink-0 items-center gap-1 rounded-full p-2 text-xs font-semibold opacity-70 ring-1 ring-black/5 hover:opacity-100 sm:bg-white/50 sm:px-2.5 sm:py-1.5"
							style={{ color: theme.ink }}
							aria-label={t('reading.back')}
						>
							<ChevPrev size={16} /> <span className="hidden sm:inline">{t('reading.back')}</span>
						</Link>

						{/* Reading timer */}
						<div className="relative shrink-0">
							<button
								type="button"
								onClick={() => {
									if (timerDone) {
										setTimerOpen(true);
										return;
									}
									if (timerRemaining != null) {
										setTimerOpen(o => !o);
										return;
									}
									setTimerOpen(o => !o);
								}}
								className="group relative inline-flex items-center gap-1 overflow-hidden rounded-full p-2 text-xs font-semibold ring-1 transition hover:shadow-md sm:gap-2 sm:rounded-2xl sm:px-3 sm:py-1.5 sm:shadow-sm"
								style={{
									background: timerDone
										? 'linear-gradient(135deg, #fecaca88, #fda4af55)'
										: timerRunning
											? `linear-gradient(135deg, ${theme.accent}28, ${theme.accent}12)`
											: `linear-gradient(135deg, ${theme.paper}, ${theme.bg})`,
									color: timerDone ? '#9f1239' : theme.ink,
									borderColor: `${theme.ink}10`,
								}}
								title={t('reading.timerHint')}
							>
								{timerRemaining != null && timerRemaining > 0 && (
									<span
										className="pointer-events-none absolute inset-y-0 start-0 opacity-25"
										style={{
											width: `${Math.min(100, (timerRemaining / (timerPick * 60)) * 100)}%`,
											background: theme.accent,
										}}
									/>
								)}
								<span className="relative z-[1] flex items-center gap-1.5">
									{timerRunning ? <Pause size={13} strokeWidth={2.25} /> : <Timer size={13} strokeWidth={2.25} />}
									{timerRemaining != null ? (
										<span className="tabular-nums tracking-wide">{formatTimer(timerRemaining)}</span>
									) : (
										<span className="hidden tabular-nums tracking-wide sm:inline">{t('reading.timer')}</span>
									)}
								</span>
							</button>
							<AnimatePresence>
								{timerOpen && (
									<motion.div
										initial={{ opacity: 0, y: 8, scale: 0.98 }}
										animate={{ opacity: 1, y: 0, scale: 1 }}
										exit={{ opacity: 0, y: 4, scale: 0.98 }}
										transition={{ duration: 0.18 }}
										className="absolute start-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border shadow-2xl"
										style={{ background: theme.paper, borderColor: `${theme.ink}12`, color: theme.ink }}
									>
										<div className="border-b px-3.5 py-2.5" style={{ borderColor: `${theme.ink}10` }}>
											<p className="text-[11px] font-bold tracking-wide" style={{ color: theme.heading || theme.ink }}>
												{t('reading.timerSet')}
											</p>
											<p className="mt-0.5 text-[10px] opacity-50">{t('reading.timerHint')}</p>
										</div>
										<div className="space-y-3 p-3.5">
											{timerRemaining != null && !timerDone && (
												<div className="flex gap-1.5">
													<button
														type="button"
														onClick={() => {
															toggleTimerPause();
															setTimerOpen(false);
														}}
														className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-[11px] font-bold text-white"
														style={{ background: theme.accent }}
													>
														{timerRunning ? <Pause size={12} /> : <Play size={12} />}
														{timerRunning ? t('reading.timerPause') : t('reading.timerResume')}
													</button>
													<button
														type="button"
														onClick={restartTimer}
														className="inline-flex items-center justify-center gap-1 rounded-xl px-2.5 py-2 text-[11px] font-semibold"
														style={{ background: `${theme.ink}0d` }}
														title={t('reading.timerRestart')}
													>
														<RotateCcw size={12} />
													</button>
													<button
														type="button"
														onClick={cancelTimer}
														className="inline-flex items-center justify-center gap-1 rounded-xl px-2.5 py-2 text-[11px] font-semibold text-rose-600"
														style={{ background: '#fda4af22' }}
														title={t('reading.timerCancel')}
													>
														<X size={13} />
													</button>
												</div>
											)}

											<div className="flex flex-wrap gap-1.5">
												{TIMER_PRESETS.map(m => (
													<button
														key={m}
														type="button"
														onClick={() => {
															setTimerPick(m);
															setTimerCustom(String(m));
															setTimerShowCustom(false);
														}}
														className="rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition"
														style={{
															background: !timerShowCustom && timerPick === m ? theme.accent : `${theme.ink}0c`,
															color: !timerShowCustom && timerPick === m ? '#fff' : theme.ink,
														}}
													>
														{m} {t('reading.timerMin')}
													</button>
												))}
											</div>

											<button
												type="button"
												onClick={() => setTimerShowCustom(v => !v)}
												className="w-full rounded-xl px-2.5 py-1.5 text-start text-[11px] font-semibold underline-offset-2 hover:underline"
												style={{ color: theme.muted }}
											>
												{t('reading.timerCustomize')}
											</button>

											{timerShowCustom && (
												<div className="flex items-center gap-2">
													<input
														type="number"
														min={1}
														max={180}
														value={timerCustom}
														onChange={e => setTimerCustom(e.target.value)}
														className="w-full rounded-xl border px-3 py-2 text-sm tabular-nums outline-none"
														style={{
															borderColor: `${theme.ink}18`,
															background: `${theme.bg}`,
															color: theme.ink,
														}}
														placeholder={t('reading.timerCustomPlaceholder')}
													/>
													<span className="shrink-0 text-[11px] opacity-50">{t('reading.timerMin')}</span>
												</div>
											)}

											<button
												type="button"
												onClick={() => startTimer(timerShowCustom ? clampTimerMins(timerCustom) : timerPick)}
												className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold text-white shadow-sm"
												style={{ background: theme.accent }}
											>
												<Play size={13} /> {t('reading.timerStart')}
											</button>
										</div>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					</div>

					<div className="min-w-0 flex-1 px-1 text-center">
						<p className="truncate text-[13px] font-semibold tracking-wide sm:text-xs sm:font-bold" style={{ color: theme.heading || theme.ink }}>
							{book.title}
						</p>
						<p className="truncate text-[10px] opacity-40">
							{pageMode === 'scroll'
								? `${pages.length} ${t('reading.pages')}`
								: `${current?.chapter.title} · ${pageIndex + 1}/${pages.length}`}
						</p>
					</div>
					<div className="relative flex shrink-0 items-center gap-0.5">
						{/* Desktop: full panel icons */}
						<div className="hidden items-center gap-0.5 sm:flex">
							{[
								['toc', Bookmark],
								['knowledge', Highlighter],
								['ask', MessageSquare],
								['settings', Settings2],
							].map(([id, Icon]) => (
								<button
									key={id}
									type="button"
									onClick={() => {
										setMobileAiOpen(false);
										setPanel(panel === id ? null : id);
									}}
									className="rounded-full p-2 transition hover:bg-black/5"
									style={{ background: panel === id ? `${theme.accent}22` : 'transparent' }}
									aria-label={id}
								>
									<Icon size={16} />
								</button>
							))}
						</div>
						{/* Mobile: overflow only — AI assist stays on the FAB */}
						<button
							type="button"
							onClick={() => setHeaderMoreOpen(o => !o)}
							className="rounded-full p-2 transition hover:bg-black/5 sm:hidden"
							style={{ background: headerMoreOpen || panel ? `${theme.accent}18` : 'transparent' }}
							aria-label={t('reading.more')}
						>
							<MoreHorizontal size={18} />
						</button>
						<AnimatePresence>
							{headerMoreOpen && (
								<motion.div
									initial={{ opacity: 0, y: 6 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: 4 }}
									className="absolute end-0 top-full z-50 mt-1.5 w-44 overflow-hidden rounded-2xl border py-1 shadow-xl sm:hidden"
									style={{ background: theme.paper, borderColor: `${theme.ink}12`, color: theme.ink }}
								>
									{[
										['toc', Bookmark, t('reading.toc')],
										['knowledge', Highlighter, t('reading.knowledge')],
										['ask', MessageSquare, t('reading.askAi')],
										['settings', Settings2, t('reading.settings')],
									].map(([id, Icon, label]) => (
										<button
											key={id}
											type="button"
											onClick={() => {
												setHeaderMoreOpen(false);
												setMobileAiOpen(false);
												setPanel(panel === id ? null : id);
											}}
											className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-start text-sm font-medium hover:bg-black/5"
										>
											<Icon size={15} style={{ color: theme.accent }} />
											{label}
										</button>
									))}
									<button
										type="button"
										onClick={() => {
											setHeaderMoreOpen(false);
											setBionicOn(v => !v);
										}}
										className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-start text-sm font-medium hover:bg-black/5"
									>
										<Sparkles size={15} style={{ color: bionicOn ? theme.accent : theme.ink, opacity: bionicOn ? 1 : 0.7 }} />
										{t('reading.bionic')}
									</button>
									<button
										type="button"
										onClick={() => {
											setHeaderMoreOpen(false);
											persist(enqueueFlashcardReviews(book));
											setFlashcardsOpen(true);
										}}
										className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-start text-sm font-medium hover:bg-black/5"
									>
										<Layers size={15} style={{ color: theme.accent }} />
										{t('reading.flashcards')}
									</button>
									<button
										type="button"
										onClick={() => {
											setHeaderMoreOpen(false);
											setCoachData(null);
											setCoachOpen(true);
										}}
										className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-start text-sm font-medium hover:bg-black/5"
									>
										<Brain size={15} style={{ color: theme.accent }} />
										{t('reading.coach')}
									</button>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				</div>
				{!focusMode && (
					<div className="mx-auto max-w-7xl border-t px-3 py-1.5 sm:px-4 sm:py-2" style={{ borderColor: `${theme.ink}0a` }}>
						<ReadingToolsRail
							theme={theme}
							t={t}
							compact
							focusOn={focusMode}
							listenOn={listenOn}
							bionicOn={bionicOn}
							difficulty={difficulty}
							onToggleFocus={() => {
								setFocusIndex(0);
								setFocusMode(true);
							}}
							onToggleListen={() => {
								if (listenOn) {
									window.speechSynthesis?.cancel();
									setListenOn(false);
									setListenPlaying(false);
									setListenSentence(-1);
								} else {
									setListenOn(true);
								}
							}}
							onToggleBionic={() => setBionicOn(v => !v)}
							onDifficulty={applyDifficulty}
							onOpenFlashcards={() => {
								persist(enqueueFlashcardReviews(book));
								setFlashcardsOpen(true);
							}}
							onOpenCoach={() => {
								setCoachData(null);
								setCoachOpen(true);
							}}
						/>
						{diffBusy && <p className="mt-1 text-center text-[10px] opacity-40">{t('common.working')}</p>}
					</div>
				)}
				{timerDone && (
					<div
						className="flex items-center justify-center gap-3 border-t px-4 py-2.5 text-xs font-semibold"
						style={{ borderColor: `${theme.ink}10`, background: `${theme.accent}14`, color: theme.accent }}
					>
						<span>{t('reading.timerDone', { minutes: timerPick })}</span>
						<button
							type="button"
							onClick={restartTimer}
							className="rounded-full px-2.5 py-1 text-[11px] font-bold"
							style={{ background: theme.accent, color: '#fff' }}
						>
							{t('reading.timerRestart')}
						</button>
						<button type="button" onClick={cancelTimer} className="text-[11px] underline opacity-70 hover:opacity-100">
							{t('reading.timerDismiss')}
						</button>
						<button
							type="button"
							onClick={() => {
								setCoachData(null);
								setCoachOpen(true);
							}}
							className="rounded-full px-2.5 py-1 text-[11px] font-bold"
							style={{ background: `${theme.ink}14`, color: theme.ink }}
						>
							{t('reading.coach')}
						</button>
					</div>
				)}
			</div>

			{/* Reading + desktop AI rail (aside stays on physical right) */}
			<div className="relative flex min-h-0 flex-1 overflow-hidden" dir="ltr">
				<div className="relative min-h-0 flex-1 overflow-hidden">
					{pageMode === 'scroll' && (
						<div
							className="pointer-events-none absolute inset-y-0 z-30 w-[3px]"
							style={{
								/* Flush to physical screen edge — never over text */
								...(isContentRTL ? { left: 0 } : { right: 0 }),
								background: `${theme.ink}14`,
							}}
							aria-hidden
						>
							<div
								className="w-full transition-[height] duration-150 ease-out"
								style={{
									height: `${scrollPct}%`,
									background: `linear-gradient(180deg, ${theme.accent}, ${theme.heading || theme.accent})`,
								}}
							/>
							<span
								className="absolute top-2 whitespace-nowrap text-[9px] font-bold tabular-nums"
								style={{
									color: theme.muted,
									...(isContentRTL ? { left: 6 } : { right: 6 }),
								}}
							>
								{scrollPct}%
							</span>
						</div>
					)}

					<div
						className="h-full min-h-0 overflow-y-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
						ref={articleRef}
						dir={isContentRTL ? 'rtl' : 'ltr'}
					>
						<article
							ref={articleInnerRef}
							onMouseUp={editMode || pinPlaceMode ? undefined : onMouseUp}
							className={`mx-auto px-4 py-5 pb-28 sm:px-5 sm:py-12 sm:pb-16 ${
								pinPlaceMode ? 'cursor-cell select-none' : ''
							}`}
							style={{
								maxWidth: prefs.maxWidth,
								fontSize: prefs.fontSize,
								lineHeight: prefs.lineHeight,
								fontFamily: contentFont,
								fontWeight: prefs.fontWeight || 400,
								letterSpacing: `${prefs.letterSpacing || 0}em`,
								textAlign: isContentRTL ? 'right' : 'left',
								color: theme.ink,
								...(pageMode === 'scroll'
									? isContentRTL
										? { paddingLeft: '0.85rem' }
										: { paddingRight: '0.85rem' }
									: null),
							}}
						>
						{showResume && (
							<SmartResumeBanner
								book={book}
								pages={pages}
								pageIndex={pageIndex}
								theme={theme}
								t={t}
								onResume={resumeFromHighlight}
								onResumePin={jumpToPin}
								onDismiss={() => setShowResume(false)}
							/>
						)}
						{pinPlaceMode && (
							<div
								className="mb-4 flex items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-xs font-semibold"
								style={{ background: `${theme.accent}18`, color: theme.accent }}
							>
								<span className="inline-flex items-center gap-1.5">
									<Bookmark size={14} /> {t('reading.pinPlaceHint')}
								</span>
								<button
									type="button"
									onClick={() => setPinPlaceMode(false)}
									className="rounded-full px-2.5 py-1 text-[11px] font-bold"
									style={{ background: `${theme.ink}12`, color: theme.ink }}
								>
									{t('reading.pinCancel')}
								</button>
							</div>
						)}
						{editMode && (
							<div
								className="mb-4 flex items-center justify-between gap-2 rounded-2xl px-3 py-2 text-xs font-semibold"
								style={{ background: `${theme.accent}18`, color: theme.accent }}
							>
								<span className="inline-flex items-center gap-1.5">
									<Pencil size={13} /> {t('reading.editModeOn')}
								</span>
								<button
									type="button"
									onClick={() => setEditMode(false)}
									className="rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
									style={{ background: theme.accent }}
								>
									{t('reading.editDone')}
								</button>
							</div>
						)}
						{pinFlash && (
							<p className="mb-3 text-center text-[11px] font-semibold" style={{ color: theme.accent }}>
								{t('reading.pinSaved')}
							</p>
						)}
						<GlossaryStrip words={book.knowledge?.importantWords || []} theme={theme} t={t} />

						{pageMode === 'scroll' ? (
							<div className="space-y-16">
								{pages.map(p => (
									<section key={p.page.id} id={`page-${p.page.id}`} className="scroll-mt-8">
										{(p.chapter.title || (p.page.title && !isPageCounterNoise(p.page.title))) && (
											<header className="mb-8" style={{ textAlign: isContentRTL ? 'right' : 'left' }}>
												{p.chapter.title && !isPageCounterNoise(p.chapter.title) ? (
													<p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: theme.muted }}>
														{p.chapter.title}
													</p>
												) : null}
												{p.page.title && !isPageCounterNoise(p.page.title) ? (
													<h1
														className="text-3xl font-bold tracking-tight sm:text-4xl"
														style={{ fontFamily: contentFont, color: theme.heading || theme.accent }}
													>
														{p.page.title}
													</h1>
												) : null}
											</header>
										)}
										{renderPageBody(
											p,
											(book.knowledge?.highlights || []).filter(h => !h.pageId || h.pageId === p.page.id),
										)}
									</section>
								))}
							</div>
						) : (
							<>
								<header className="mb-10" style={{ textAlign: isContentRTL ? 'right' : 'left' }}>
									<p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: theme.muted }}>
										{current?.chapter.title}
									</p>
									{current?.page.title ? (
										<h1
											className="text-3xl font-bold tracking-tight sm:text-4xl"
											style={{ fontFamily: contentFont, color: theme.heading || theme.accent }}
										>
											{current.page.title}
										</h1>
									) : null}
								</header>
								{current && renderPageBody(current, pageHighlights)}
							</>
						)}

						<div className="h-6 lg:h-10" />
					</article>
					</div>
				</div>

				{/* Desktop: tools on the physical right */}
				<aside
					className="hidden w-[min(19rem,28vw)] shrink-0 flex-col overflow-y-auto border-s px-4 py-6 xl:w-[19rem] lg:flex"
					dir={locale === 'ar' ? 'rtl' : 'ltr'}
					style={{
						borderColor: `${theme.ink}12`,
						background: `${theme.paper}cc`,
						fontFamily: toolsFont,
					}}
				>
					{enrichPanel}
				</aside>
			</div>

			{/* Floating tools: pin + edit (start) · AI assist (end) */}
			{!mobileAiOpen && !focusMode && (
				<>
					<div
						className="fixed z-[45] flex flex-col gap-2"
						style={{
							bottom: pageMode === 'pages'
								? 'max(5.5rem, calc(env(safe-area-inset-bottom) + 4.5rem))'
								: 'max(1.25rem, calc(env(safe-area-inset-bottom) + 1rem))',
							...(isContentRTL
								? { right: 'max(0.75rem, env(safe-area-inset-right))' }
								: { left: 'max(0.75rem, env(safe-area-inset-left))' }),
						}}
					>
						<button
							type="button"
							onClick={togglePinPlaceMode}
							className="inline-flex h-11 w-11 items-center justify-center rounded-full shadow-lg ring-1 ring-black/5 transition"
							style={
								pinPlaceMode
									? { background: theme.accent, color: '#fff', boxShadow: `0 0 0 3px ${theme.accent}44` }
									: readingPin
										? { background: `${theme.accent}22`, color: theme.accent }
										: { background: theme.paper, color: theme.ink }
							}
							aria-label={pinPlaceMode ? t('reading.pinCancel') : t('reading.pinHere')}
							title={pinPlaceMode ? t('reading.pinCancel') : t('reading.pinHint')}
						>
							{pinPlaceMode ? <X size={17} /> : <Bookmark size={17} fill={readingPin ? 'currentColor' : 'none'} />}
						</button>
						<button
							type="button"
							onClick={() => {
								setEditMode(v => !v);
								setPinPlaceMode(false);
								setSelectionMenu(null);
							}}
							className="inline-flex h-11 w-11 items-center justify-center rounded-full shadow-lg ring-1 ring-black/5"
							style={{
								background: editMode ? theme.accent : theme.paper,
								color: editMode ? '#fff' : theme.ink,
							}}
							aria-label={t('reading.editContent')}
							title={t('reading.editContent')}
						>
							{editMode ? <Check size={17} /> : <Pencil size={17} />}
						</button>
					</div>
					<button
						type="button"
						onClick={() => setMobileAiOpen(true)}
						className="fixed z-[45] inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-bold text-white shadow-xl ring-1 ring-white/20 lg:hidden"
						style={{
							background: `linear-gradient(145deg, ${theme.accent}, ${theme.heading || theme.accent})`,
							bottom: pageMode === 'pages'
								? 'max(5.5rem, calc(env(safe-area-inset-bottom) + 4.5rem))'
								: 'max(1.25rem, calc(env(safe-area-inset-bottom) + 1rem))',
							...(isContentRTL
								? { left: 'max(0.75rem, env(safe-area-inset-left))' }
								: { right: 'max(0.75rem, env(safe-area-inset-right))' }),
						}}
						aria-label={t('reading.aiAssist')}
					>
						<Sparkles size={16} />
						<span className="hidden min-[380px]:inline">{t('reading.aiAssist')}</span>
					</button>
				</>
			)}

			<AnimatePresence>
				{mobileAiOpen && (
					<motion.div
						key="mobile-ai-sheet"
						className="fixed inset-0 z-[55] lg:hidden"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
					>
						<button
							type="button"
							aria-label="Close"
							className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
							onClick={() => setMobileAiOpen(false)}
						/>
						<motion.div
							initial={{ y: '100%' }}
							animate={{ y: 0 }}
							exit={{ y: '100%' }}
							transition={{ type: 'spring', stiffness: 380, damping: 36 }}
							className="absolute inset-x-0 bottom-0 max-h-[min(88vh,720px)] overflow-y-auto rounded-t-3xl border-t px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 shadow-2xl"
							dir={locale === 'ar' ? 'rtl' : 'ltr'}
							style={{
								background: theme.paper,
								borderColor: `${theme.ink}12`,
								fontFamily: toolsFont,
								color: theme.ink,
							}}
						>
							<div className="relative mb-4 flex items-center justify-center pt-1">
								<span className="h-1 w-10 rounded-full bg-black/15" aria-hidden />
								<button
									type="button"
									onClick={() => setMobileAiOpen(false)}
									className="absolute end-0 top-0 rounded-full p-2 hover:bg-black/5"
									aria-label="Close"
								>
									<X size={16} />
								</button>
							</div>
							{enrichPanel}
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{pageMode === 'pages' && (
			<div
				className="z-40 shrink-0 border-t backdrop-blur-md"
				style={{
					borderColor: `${theme.ink}12`,
					background: `${theme.bg}f2`,
					paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
				}}
			>
				<div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3">
					<button
						type="button"
						disabled={pageIndex <= 0}
						onClick={() => goPage(pageIndex - 1)}
						className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold shadow-sm disabled:opacity-30 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
						style={{ background: theme.paper, color: theme.ink }}
					>
						<ChevPrev size={16} /> <span className="hidden sm:inline">{t('reading.prev')}</span>
					</button>
					<span className="text-xs font-semibold opacity-50">{progress}%</span>
					<button
						type="button"
						disabled={pageIndex >= pages.length - 1}
						onClick={() => goPage(pageIndex + 1)}
						className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold shadow-sm disabled:opacity-30 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
						style={{ background: theme.paper, color: theme.ink }}
					>
						<span className="hidden sm:inline">{t('reading.next')}</span> <ChevNext size={16} />
					</button>
				</div>
			</div>
			)}

			<AnimatePresence>
				{selectionMenu && (
					<div
						className="pointer-events-none fixed z-[60]"
						style={{
							left: selectionMenu.x,
							top: selectionMenu.y,
							transform:
								selectionMenu.place === 'above' ? 'translate(-50%, calc(-100% - 2px))' : 'translate(-50%, 2px)',
						}}
					>
						<motion.div
							key="selection-toolbar"
							initial={{ opacity: 0, scale: 0.92, y: selectionMenu.place === 'above' ? 8 : -8 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.96, y: selectionMenu.place === 'above' ? 6 : -6 }}
							transition={{ type: 'spring', stiffness: 440, damping: 30, mass: 0.65 }}
							className="pointer-events-auto relative"
						>
							<div
								ref={selectionToolbarRef}
								className="flex max-w-[min(92vw,36rem)] flex-wrap items-center gap-1 rounded-2xl border px-1.5 py-1.5 shadow-2xl backdrop-blur-md"
								style={{
									background: 'rgba(255,254,251,0.97)',
									borderColor: 'rgba(26,46,40,0.10)',
									boxShadow: '0 18px 40px rgba(26,46,40,0.18), 0 2px 8px rgba(26,46,40,0.06)',
								}}
							>
								<button
									type="button"
									onClick={() => openMemorize(selectionMenu.text)}
									className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm"
									style={{ background: 'linear-gradient(135deg, #1a2e28, #3d5a4c)' }}
								>
									<Brain size={12} />
									{t('reading.memorize')}
								</button>
								{SELECTION_HIGHLIGHTS.map((h, i) => {
									const Icon = HIGHLIGHT_ACTION_ICONS[h.id] || Star;
									return (
										<motion.button
											key={h.id}
											type="button"
											initial={{ opacity: 0, y: 6 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ delay: 0.045 + i * 0.04, duration: 0.22 }}
											onClick={() => addHighlight(h.id)}
											className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition hover:brightness-[0.97] active:scale-[0.97]"
											style={{
												background: `${h.color}18`,
												color: h.color,
											}}
										>
											<span
												className="flex h-5 w-5 items-center justify-center rounded-lg text-white shadow-sm"
												style={{ background: h.color }}
											>
												<Icon size={11} strokeWidth={2.4} />
											</span>
											{t(h.labelKey)}
										</motion.button>
									);
								})}
								<button
									type="button"
									onClick={() => openInlineAsk(selectionMenu.text)}
									className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold"
									style={{ background: '#0d948818', color: '#0d9488' }}
								>
									<span className="flex h-5 w-5 items-center justify-center rounded-lg bg-[#0d9488] text-white shadow-sm">
										<MessageSquare size={11} strokeWidth={2.4} />
									</span>
									{t('reading.inlineAsk')}
								</button>
								<button
									type="button"
									onClick={() => openTranslate(selectionMenu.text)}
									className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold"
									style={{ background: '#2563eb18', color: '#2563eb' }}
								>
									<span className="flex h-5 w-5 items-center justify-center rounded-lg bg-[#2563eb] text-white shadow-sm">
										<Languages size={11} strokeWidth={2.4} />
									</span>
									{t('reading.translate')}
								</button>
								<button
									type="button"
									onClick={() => setSelectionMenu(null)}
									className="ms-0.5 rounded-xl p-1.5 text-slate-400 transition hover:bg-black/5 hover:text-slate-600"
									aria-label="Close"
								>
									<X size={14} />
								</button>
							</div>
							{selectionMenu.place === 'above' ? (
								<span
									className="absolute start-1/2 top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-e"
									style={{ background: 'rgba(255,254,251,0.97)', borderColor: 'rgba(26,46,40,0.10)' }}
								/>
							) : (
								<span
									className="absolute start-1/2 bottom-full h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rotate-45 border-s border-t"
									style={{ background: 'rgba(255,254,251,0.97)', borderColor: 'rgba(26,46,40,0.10)' }}
								/>
							)}
						</motion.div>
					</div>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{memorize && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-3 sm:items-center sm:p-6"
						onClick={() => !memorize.busy && setMemorize(null)}
					>
						<motion.div
							initial={{ y: 24, opacity: 0, scale: 0.98 }}
							animate={{ y: 0, opacity: 1, scale: 1 }}
							exit={{ y: 12, opacity: 0 }}
							transition={{ type: 'spring', stiffness: 380, damping: 28 }}
							onClick={e => e.stopPropagation()}
							className="max-h-[min(88vh,720px)] w-full max-w-lg overflow-y-auto rounded-3xl border p-4 shadow-2xl sm:p-5"
							style={{
								background: theme.paper,
								borderColor: `${theme.ink}12`,
								color: theme.ink,
								paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
							}}
						>
							<div className="mb-4 flex items-start justify-between gap-3">
								<div>
									<p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: theme.accent }}>
										<Brain size={13} /> {t('reading.memorize')}
									</p>
									<h2 className="mt-1 text-lg font-bold" style={{ color: theme.heading || theme.ink }}>
										{t('reading.memorizeTitle')}
									</h2>
									<p className="mt-1 text-xs opacity-60">{t('reading.memorizeHint')}</p>
								</div>
								<button type="button" onClick={() => setMemorize(null)} className="rounded-full p-1.5 hover:bg-black/5">
									<X size={16} />
								</button>
							</div>

							<div className="mb-3 rounded-2xl px-3 py-2 text-[12px] leading-relaxed opacity-70" style={{ background: `${theme.ink}08` }}>
								{memorize.text.slice(0, 280)}
								{memorize.text.length > 280 ? '…' : ''}
								{memorize.pageHits?.length > 0 && (
									<span className="mt-1 block text-[10px] font-semibold opacity-80">
										{t('reading.memorizePages', { count: memorize.pageHits.length })}
									</span>
								)}
							</div>

							<label className="mb-3 block">
								<span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider opacity-50">
									{t('reading.memorizePickPrompt')}
								</span>
								{favoritePrompts.length ? (
									<CustomSelect
										value={memorize.promptId}
										onChange={v => setMemorize(m => (m ? { ...m, promptId: v } : m))}
										options={favoritePrompts.map(p => ({
											value: p.id,
											label: `${p.favorite ? '★ ' : ''}${p.title || t('prompts.untitled')}`,
										}))}
										placeholder={t('reading.memorizePickPrompt')}
									/>
								) : (
									<p className="rounded-xl px-3 py-2 text-xs opacity-60" style={{ background: `${theme.ink}08` }}>
										{t('reading.memorizeNoPrompts')}
									</p>
								)}
							</label>

							{!memorize.summary && (
								<button
									type="button"
									disabled={memorize.busy}
									onClick={runMemorize}
									className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
									style={{ background: theme.accent }}
								>
									{memorize.busy ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
									{memorize.busy ? t('reading.memorizeWorking') : t('reading.memorizeRun')}
								</button>
							)}

							{memorize.error && (
								<p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{memorize.error}</p>
							)}

							{memorize.summary && (
								<div className="space-y-3">
									<div
										className="rounded-2xl border px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
										style={{ borderColor: `${theme.accent}33`, background: `${theme.accent}10` }}
									>
										<p className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.accent }}>
											{t('reading.memorizePreview')}
										</p>
										{memorize.summary}
									</div>
									<div className="flex flex-wrap gap-2">
										<button
											type="button"
											onClick={applyMemorize}
											className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white"
											style={{ background: theme.accent }}
										>
											<CheckCheck size={16} /> {t('reading.memorizeApply')}
										</button>
										<button
											type="button"
											disabled={memorize.busy}
											onClick={runMemorize}
											className="rounded-2xl px-4 py-3 text-sm font-semibold"
											style={{ background: `${theme.ink}0d` }}
										>
											{t('reading.memorizeRetry')}
										</button>
									</div>
								</div>
							)}
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{polish && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-3 sm:items-center sm:p-6"
						onClick={() => !polish.busy && setPolish(null)}
					>
						<motion.div
							initial={{ y: 24, opacity: 0, scale: 0.98 }}
							animate={{ y: 0, opacity: 1, scale: 1 }}
							exit={{ y: 12, opacity: 0 }}
							transition={{ type: 'spring', stiffness: 380, damping: 28 }}
							onClick={e => e.stopPropagation()}
							className="max-h-[min(90vh,760px)] w-full max-w-lg overflow-y-auto rounded-3xl border p-4 shadow-2xl sm:p-5"
							style={{ background: theme.paper, borderColor: `${theme.ink}12`, color: theme.ink }}
						>
							<div className="mb-4 flex items-start justify-between gap-3">
								<div>
									<p
										className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider"
										style={{ color: theme.accent }}
									>
										<FileSearch size={13} /> {t('reading.polish')}
									</p>
									<h2 className="mt-1 text-lg font-bold" style={{ color: theme.heading || theme.ink }}>
										{t('reading.polishTitle')}
									</h2>
									<p className="mt-1 text-xs opacity-60">{t('reading.polishHint')}</p>
								</div>
								<button type="button" onClick={() => setPolish(null)} className="rounded-full p-1.5 hover:bg-black/5">
									<X size={16} />
								</button>
							</div>

							<label className="mb-3 block">
								<span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider opacity-50">
									{t('reading.polishPickPrompt')}
								</span>
								{polishPrompts.length ? (
									<CustomSelect
										value={polish.promptId}
										onChange={selectPolishPrompt}
										options={polishPrompts.map(p => ({
											value: p.id,
											label: `${p.id === DEFAULT_POLISH_PROMPT_ID || p.favorite ? '★ ' : ''}${p.title || t('prompts.untitled')}`,
										}))}
										placeholder={t('reading.polishPickPrompt')}
									/>
								) : null}
							</label>

							<label className="mb-3 block">
								<span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider opacity-50">
									{t('reading.polishCustom')}
								</span>
								<textarea
									value={polish.instructions}
									onChange={e =>
										setPolish(p => (p ? { ...p, instructions: e.target.value, improved: '', audit: null, applied: false } : p))
									}
									rows={7}
									dir="auto"
									placeholder={t('reading.polishCustomPlaceholder')}
									className="w-full resize-y rounded-2xl border px-3.5 py-3 text-sm leading-relaxed outline-none"
									style={{
										background: `${theme.ink}06`,
										borderColor: `${theme.ink}14`,
										color: theme.ink,
										minHeight: 140,
									}}
								/>
							</label>

							{!polish.improved && (
								<button
									type="button"
									disabled={polish.busy || !polish.instructions.trim()}
									onClick={runPolish}
									className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
									style={{ background: theme.accent }}
								>
									{polish.busy ? <Loader2 size={16} className="animate-spin" /> : <FileSearch size={16} />}
									{polish.busy ? t('reading.polishWorking') : t('reading.polishRun')}
								</button>
							)}

							{polish.error && (
								<p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{polish.error}</p>
							)}

							{polish.improved && (
								<div className="space-y-3">
									{polish.audit &&
										(polish.audit.summary ||
											polish.audit.removed?.length ||
											polish.audit.strengthened?.length ||
											polish.audit.added?.length ||
											polish.audit.notes?.length) && (
											<div className="rounded-2xl px-4 py-3 text-xs leading-relaxed" style={{ background: `${theme.ink}08` }}>
												<p className="mb-2 text-[10px] font-bold uppercase tracking-wider opacity-50">
													{t('reading.polishAudit')}
												</p>
												{polish.audit.summary && <p className="mb-2 opacity-80">{polish.audit.summary}</p>}
												<ul className="space-y-1 opacity-75">
													{(polish.audit.removed || []).map((item, i) => (
														<li key={`rm-${i}`}>− {item}</li>
													))}
													{(polish.audit.strengthened || []).map((item, i) => (
														<li key={`st-${i}`}>↻ {item}</li>
													))}
													{(polish.audit.added || []).map((item, i) => (
														<li key={`ad-${i}`}>+ {item}</li>
													))}
													{(polish.audit.notes || []).map((item, i) => (
														<li key={`nt-${i}`}>• {item}</li>
													))}
												</ul>
											</div>
										)}
									<div
										className="rounded-2xl border px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
										style={{ borderColor: `${theme.accent}33`, background: `${theme.accent}10` }}
										dir="auto"
									>
										<p className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.accent }}>
											{t('reading.polishPreview')}
										</p>
										{polish.title ? <p className="mb-2 font-bold">{polish.title}</p> : null}
										{polish.improved}
									</div>
									<div className="flex flex-wrap gap-2">
										<button
											type="button"
											disabled={polish.applied}
											onClick={applyPolish}
											className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
											style={{ background: theme.accent }}
										>
											<CheckCheck size={16} />{' '}
											{polish.applied ? t('reading.polishApplied') : t('reading.polishApply')}
										</button>
										<button
											type="button"
											disabled={polish.busy}
											onClick={runPolish}
											className="rounded-2xl px-4 py-3 text-sm font-semibold"
											style={{ background: `${theme.ink}0d` }}
										>
											{t('reading.polishRetry')}
										</button>
									</div>
								</div>
							)}
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{structure && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-3 sm:items-center sm:p-6"
						onClick={() => !structure.busy && setStructure(null)}
					>
						<motion.div
							initial={{ y: 24, opacity: 0, scale: 0.98 }}
							animate={{ y: 0, opacity: 1, scale: 1 }}
							exit={{ y: 12, opacity: 0 }}
							transition={{ type: 'spring', stiffness: 380, damping: 28 }}
							onClick={e => e.stopPropagation()}
							className="max-h-[min(90vh,760px)] w-full max-w-lg overflow-y-auto rounded-3xl border p-4 shadow-2xl sm:p-5"
							style={{ background: theme.paper, borderColor: `${theme.ink}12`, color: theme.ink }}
						>
							<div className="mb-4 flex items-start justify-between gap-3">
								<div>
									<p
										className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider"
										style={{ color: theme.accent }}
									>
										<LayoutList size={13} /> {t('reading.structure')}
									</p>
									<h2 className="mt-1 text-lg font-bold" style={{ color: theme.heading || theme.ink }}>
										{t('reading.structureTitle')}
									</h2>
									<p className="mt-1 text-xs opacity-60">{t('reading.structureHint')}</p>
								</div>
								<button type="button" onClick={() => setStructure(null)} className="rounded-full p-1.5 hover:bg-black/5">
									<X size={16} />
								</button>
							</div>

							{structure.busy && (
								<p className="mb-3 inline-flex items-center gap-2 text-sm opacity-60">
									<Loader2 size={16} className="animate-spin" /> {t('reading.structureWorking')}
								</p>
							)}

							{structure.error && (
								<p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{structure.error}</p>
							)}

							{!structure.busy && !structure.blocks?.length && !structure.error && (
								<button
									type="button"
									onClick={runStructure}
									className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white"
									style={{ background: theme.accent }}
								>
									<LayoutList size={16} /> {t('reading.structureRun')}
								</button>
							)}

							{structure.blocks?.length > 0 && (
								<div className="space-y-3">
									{structure.notes && (
										<div className="rounded-2xl px-4 py-3 text-xs leading-relaxed opacity-75" style={{ background: `${theme.ink}08` }}>
											<p className="mb-1 text-[10px] font-bold uppercase tracking-wider opacity-50">
												{t('reading.structureNotes')}
											</p>
											{structure.notes}
										</div>
									)}
									<div
										className="space-y-3 rounded-2xl border px-4 py-3"
										style={{ borderColor: `${theme.accent}33`, background: `${theme.accent}08` }}
									>
										<p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.accent }}>
											{t('reading.structurePreview')}
										</p>
										{structure.pageTitle && (
											<p className="text-base font-bold" style={{ color: theme.heading || theme.ink }}>
												{structure.pageTitle}
											</p>
										)}
										{structure.blocks.map((b, i) => (
											<div key={b.id || i} className="text-sm leading-relaxed" dir="auto">
												{b.type === 'heading' && (
													<p className="font-bold" style={{ color: b.accent || theme.heading || theme.accent }}>
														{b.text}
													</p>
												)}
												{b.type === 'paragraph' && <p className="opacity-90">{b.text}</p>}
												{b.type === 'quote' && (
													<p className="border-s-2 ps-3 italic opacity-80" style={{ borderColor: b.accent || theme.accent }}>
														{b.text}
													</p>
												)}
												{b.type === 'list' && (
													<ul className="list-disc space-y-1 ps-5 opacity-90">
														{(b.items || []).map((item, j) => (
															<li key={j}>{item}</li>
														))}
													</ul>
												)}
												{(b.type === 'key_idea' || b.type === 'callout') && (
													<div
														className="rounded-xl px-3 py-2"
														style={{ background: `${b.accent || theme.accent}18` }}
													>
														<p className="mb-0.5 text-[9px] font-bold uppercase tracking-wider opacity-60">
															{b.type === 'key_idea' ? t('reading.keyIdeaLabel') : b.calloutType || 'note'}
														</p>
														<p>{b.text}</p>
													</div>
												)}
											</div>
										))}
									</div>
									<div className="flex flex-wrap gap-2">
										<button
											type="button"
											disabled={structure.applied}
											onClick={applyStructure}
											className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
											style={{ background: theme.accent }}
										>
											<CheckCheck size={16} />{' '}
											{structure.applied ? t('reading.structureApplied') : t('reading.structureApply')}
										</button>
										<button
											type="button"
											disabled={structure.busy}
											onClick={runStructure}
											className="rounded-2xl px-4 py-3 text-sm font-semibold"
											style={{ background: `${theme.ink}0d` }}
										>
											{t('reading.structureRetry')}
										</button>
									</div>
								</div>
							)}
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{translatePanel && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-3 sm:items-center sm:p-6"
						onClick={() => !translatePanel.busy && setTranslatePanel(null)}
					>
						<motion.div
							initial={{ y: 20, opacity: 0, scale: 0.98 }}
							animate={{ y: 0, opacity: 1, scale: 1 }}
							exit={{ y: 10, opacity: 0 }}
							onClick={e => e.stopPropagation()}
							className="w-full max-w-md rounded-3xl border p-5 shadow-2xl"
							style={{ background: theme.paper, borderColor: `${theme.ink}12`, color: theme.ink }}
						>
							<div className="mb-3 flex items-start justify-between gap-2">
								<div>
									<p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#2563eb]">
										<Languages size={13} /> {t('reading.translate')}
									</p>
									<h2 className="mt-1 text-xl font-bold" style={{ color: theme.heading || theme.ink }}>
										{translatePanel.word}
									</h2>
								</div>
								<button type="button" onClick={() => setTranslatePanel(null)} className="rounded-full p-1.5 hover:bg-black/5">
									<X size={16} />
								</button>
							</div>

							{translatePanel.busy ? (
								<p className="inline-flex items-center gap-2 text-sm opacity-60">
									<Loader2 size={14} className="animate-spin" /> {t('reading.translateWorking')}
								</p>
							) : (
								<div className="space-y-3">
									{translatePanel.error && (
										<p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{translatePanel.error}</p>
									)}
									<div className="rounded-2xl px-4 py-3" style={{ background: `${theme.accent}12` }}>
										<p className="text-[10px] font-bold uppercase tracking-wider opacity-50">{t('reading.translateMeaning')}</p>
										<p className="mt-1 text-base font-semibold">{translatePanel.translation || '—'}</p>
										{translatePanel.meaning && (
											<p className="mt-2 text-sm leading-relaxed opacity-80">{translatePanel.meaning}</p>
										)}
									</div>
									{(translatePanel.contextNote || translatePanel.context) && (
										<div className="rounded-2xl px-4 py-3 text-sm leading-relaxed opacity-70" style={{ background: `${theme.ink}08` }}>
											<p className="mb-1 text-[10px] font-bold uppercase tracking-wider opacity-50">{t('reading.translateContext')}</p>
											{translatePanel.contextNote || translatePanel.context}
										</div>
									)}
									<button
										type="button"
										disabled={translatePanel.saved}
										onClick={saveImportantWord}
										className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
										style={{ background: theme.accent }}
									>
										{translatePanel.saved ? (
											<>
												<Check size={15} /> {t('reading.translateSaved')}
											</>
										) : (
											<>
												<Star size={15} /> {t('reading.translateSave')}
											</>
										)}
									</button>
								</div>
							)}
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{focusMode && (
					<FocusModeOverlay
						page={current?.page}
						theme={theme}
						t={t}
						bionic={bionicOn}
						index={focusIndex}
						onIndex={setFocusIndex}
						onClose={() => setFocusMode(false)}
						isRTL={isContentRTL}
					/>
				)}
			</AnimatePresence>

			{listenOn && (
				<ListenBar
					text={pagePlainText(current?.page)}
					theme={theme}
					t={t}
					lang={readingLang}
					activeSentence={listenSentence}
					setActiveSentence={setListenSentence}
					playing={listenPlaying}
					setPlaying={setListenPlaying}
					onClose={() => {
						window.speechSynthesis?.cancel();
						setListenOn(false);
						setListenPlaying(false);
						setListenSentence(-1);
					}}
				/>
			)}

			<AnimatePresence>
				{inlineAsk && (
					<InlineAskModal
						theme={theme}
						t={t}
						passage={inlineAsk.passage}
						busy={inlineAsk.busy}
						result={inlineAsk.result}
						question={inlineAsk.question}
						setQuestion={q => setInlineAsk(p => (p ? { ...p, question: q } : p))}
						onAsk={runInlineAsk}
						onClose={() => setInlineAsk(null)}
					/>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{flashcardsOpen && (
					<FlashcardsModal book={book} theme={theme} t={t} onClose={() => setFlashcardsOpen(false)} />
				)}
			</AnimatePresence>

			<AnimatePresence>
				{coachOpen && (
					<CoachModal
						theme={theme}
						t={t}
						busy={coachBusy}
						data={coachData}
						onRun={runCoach}
						onSave={saveCoach}
						onClose={() => {
							setCoachOpen(false);
							setCoachData(null);
						}}
					/>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{panel && (
					<>
					<motion.button
						key="panel-backdrop"
						type="button"
						aria-label="Close"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 z-[48] bg-black/35 backdrop-blur-[1px]"
						onClick={() => setPanel(null)}
					/>
					<motion.aside
						key="side-panel"
						initial={{ opacity: 0, x: isContentRTL ? -24 : 24 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: isContentRTL ? -24 : 24 }}
						className="fixed inset-y-0 z-50 w-full max-w-[min(100vw,28rem)] overflow-y-auto border-s border-black/10 p-4 shadow-2xl sm:p-5"
						style={{
							[isContentRTL ? 'left' : 'right']: 0,
							background: theme.paper,
							color: theme.ink,
							paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
						}}
					>
						<div className="mb-4 flex items-center justify-between gap-2">
							<h2 className="text-sm font-bold uppercase tracking-wider">
								{panel === 'toc' && t('reading.toc')}
								{panel === 'knowledge' && t('reading.knowledge')}
								{panel === 'ask' && t('reading.askAi')}
								{panel === 'settings' && t('reading.settings')}
							</h2>
							<button type="button" onClick={() => setPanel(null)} className="rounded-full p-1.5 hover:bg-black/5">
								<X size={16} />
							</button>
						</div>

						{panel === 'toc' && (
							<div className="space-y-4">
								{book.chapters.map((ch, ci) => (
									<div key={ch.id}>
										<p className="mb-2 text-xs font-bold opacity-60">
											{ci + 1}. {ch.title}
										</p>
										<div className="space-y-1">
											{ch.pages.map(pg => {
												const idx = pages.findIndex(p => p.page.id === pg.id);
												return (
													<button
														key={pg.id}
														type="button"
														onClick={() => {
															goPage(idx);
															setPanel(null);
														}}
														className="block w-full rounded-lg px-3 py-2 text-start text-sm hover:bg-black/5"
														style={{ background: pg.id === current?.page.id ? `${theme.accent}18` : 'transparent' }}
													>
														{pg.title || t('reading.untitledPage')}
													</button>
												);
											})}
										</div>
									</div>
								))}
							</div>
						)}

						{panel === 'settings' && (
							<SettingsBody
								prefs={prefs}
								theme={theme}
								t={t}
								updatePrefs={updatePrefs}
								prefsSaved={prefsSaved}
								hasArticlePrefs={hasArticlePrefs}
								onSaveAsGlobalDefault={saveReadingAsGlobalDefault}
								onResetArticlePrefs={resetArticleReadingPrefs}
							/>
						)}

						{panel === 'ask' && (
							<div className="space-y-3">
								<textarea
									value={askQ}
									onChange={e => setAskQ(e.target.value)}
									rows={3}
									placeholder={t('reading.askPlaceholder')}
									className="w-full rounded-xl border border-black/10 bg-transparent px-3 py-2 text-sm outline-none"
								/>
								<button
									type="button"
									disabled={askBusy}
									onClick={runAsk}
									className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white"
									style={{ background: theme.accent }}
								>
									<Sparkles size={14} /> {askBusy ? t('common.working') : t('reading.ask')}
								</button>
								{askResult && (
									<div className="rounded-xl p-3 text-sm" style={{ background: `${theme.accent}12` }}>
										<p>{askResult.answer}</p>
										{askResult.suggestedAction && (
											<p className="mt-2 text-xs font-semibold opacity-80">
												{t('reading.suggestedAction')}: {askResult.suggestedAction}
											</p>
										)}
									</div>
								)}
							</div>
						)}

						{panel === 'knowledge' && (
							<KnowledgeBody
								book={book}
								t={t}
								theme={theme}
								onAddNote={addNote}
								onToggleAction={toggleAction}
								onRemoveHighlight={removeHighlight}
								onIdeaToAction={idea => {
									const action = {
										id: uid('act'),
										text: idea.actionText || `Practice for 7 days: ${idea.text}`,
										done: false,
										fromIdeaId: idea.id,
										createdAt: new Date().toISOString(),
									};
									persist(
										enqueueReviewItems({
											...book,
											knowledge: {
												...book.knowledge,
												actions: [action, ...(book.knowledge.actions || [])],
											},
										}),
									);
								}}
								onBookmark={() => {
									const bm = {
										id: uid('bm'),
										pageId: current?.page.id,
										chapterId: current?.chapter.id,
										label: current?.page.title || current?.chapter.title || 'Bookmark',
										createdAt: new Date().toISOString(),
									};
									persist({
										...book,
										knowledge: {
											...book.knowledge,
											bookmarks: [bm, ...(book.knowledge.bookmarks || [])],
										},
									});
								}}
								onSaveReview={text => {
									persist({
										...book,
										knowledge: {
											...book.knowledge,
											review: { text, rating: book.knowledge.review?.rating || 5, updatedAt: new Date().toISOString() },
										},
									});
								}}
							/>
						)}
					</motion.aside>
					</>
				)}
			</AnimatePresence>
		</div>
	);
}

function EnrichTools({ t, theme, busy, result, onRun, onOpenPolish, onOpenStructure, onApplyTranslation, fontFamily, resultFont, resultRTL, aiModelKey, onOpenAiSettings }) {
	const modes = [
		['structure', t('reading.structure'), LayoutList],
		['polish', t('reading.polish'), FileSearch],
		['summarize', t('reading.summarize'), Sparkles],
		['explain', t('reading.explain'), Sparkles],
		['simplify', t('reading.simplify'), Sparkles],
		['key_ideas', t('reading.keyIdeas'), Lightbulb],
		['questions', t('reading.questions'), HelpCircle],
		['actions', t('reading.actions'), ListTodo],
		['translate_ar', t('reading.translateToAr'), Languages],
		['translate_en', t('reading.translateToEn'), Languages],
	];

	const handleMode = mode => {
		if (mode === 'polish') return onOpenPolish?.();
		if (mode === 'structure') return onOpenStructure?.();
		return onRun(mode);
	};

	return (
		<div className="space-y-4" style={{ fontFamily }}>
			<div>
				<p
					className="text-[11px] font-semibold tracking-[0.18em] uppercase"
					style={{ color: theme.muted, fontFamily: 'var(--font-space-grotesk), DM Sans, system-ui, sans-serif' }}
				>
					{t('reading.aiAssist')}
				</p>
				<p className="mt-1 text-xs leading-relaxed opacity-60">{t('reading.aiAssistHint')}</p>
				{aiModelKey && (
					<button
						type="button"
						onClick={onOpenAiSettings}
						className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide"
						style={{ background: `${theme.accent}14`, color: theme.accent }}
					>
						<Bot size={11} />
						<span className="truncate">{aiModelKey}</span>
					</button>
				)}
			</div>

			<div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-1">
				{modes.map(([mode, label, Icon]) => (
					<button
						key={mode}
						type="button"
						disabled={busy}
						onClick={() => handleMode(mode)}
						className="group flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-start text-[12px] font-semibold transition disabled:opacity-50 sm:px-3.5 sm:text-[13px]"
						style={{
							background: result?.mode === mode ? `${theme.accent}22` : `${theme.ink}08`,
							color: theme.ink,
							fontFamily: 'var(--font-space-grotesk), var(--font-dm-sans), system-ui, sans-serif',
						}}
					>
						<span
							className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl"
							style={{ background: `${theme.accent}18`, color: theme.accent }}
						>
							<Icon size={13} />
						</span>
						<span className="min-w-0 flex-1 tracking-wide">{label}</span>
					</button>
				))}
			</div>

			{busy && (
				<p className="text-xs opacity-50" style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}>
					{t('common.working')}
				</p>
			)}

			{result && (
				<motion.div
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					dir={resultRTL ? 'rtl' : 'ltr'}
					className="rounded-2xl p-3.5 text-[13px] leading-relaxed"
					style={{
						background: theme.bg,
						boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
						textAlign: resultRTL ? 'right' : 'left',
						fontFamily: resultFont,
					}}
				>
					{result.error && <p>{result.error}</p>}
					{result.translation && (
						<div className="space-y-3">
							<p className="text-[10px] font-bold uppercase tracking-wider opacity-50">
								{result.mode === 'translate_ar' ? t('reading.translateToAr') : t('reading.translateToEn')}
							</p>
							{result.title && <p className="font-bold">{result.title}</p>}
							<p className="whitespace-pre-wrap">{result.translation}</p>
							{onApplyTranslation && (
								<button
									type="button"
									disabled={result.applied}
									onClick={onApplyTranslation}
									className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-white disabled:opacity-60"
									style={{ background: theme.accent }}
								>
									{result.applied ? t('reading.translateApplied') : t('reading.translateApplyPage')}
								</button>
							)}
						</div>
					)}
					{result.summary && <p>{result.summary}</p>}
					{result.explanation && <p>{result.explanation}</p>}
					{result.simplified && <p>{result.simplified}</p>}
					{result.bullets && (
						<ul className="mt-2 list-disc ps-5">
							{result.bullets.map((b, i) => (
								<li key={i} dir="auto">
									{b}
								</li>
							))}
						</ul>
					)}
					{result.keyIdeas && (
						<ul className="mt-2 space-y-2">
							{result.keyIdeas.map((b, i) => (
								<li key={i} className="flex gap-2">
									<Lightbulb size={14} className="mt-1 shrink-0 opacity-70" />
									<span dir="auto">{b}</span>
								</li>
							))}
						</ul>
					)}
					{result.questions && (
						<ul className="mt-2 space-y-2">
							{result.questions.map((b, i) => (
								<li key={i} className="flex gap-2">
									<HelpCircle size={14} className="mt-1 shrink-0 opacity-70" />
									<span dir="auto">{b}</span>
								</li>
							))}
						</ul>
					)}
					{result.actions && (
						<ul className="mt-2 space-y-2">
							{result.actions.map((b, i) => (
								<li key={i} className="flex gap-2">
									<ListTodo size={14} className="mt-1 shrink-0 opacity-70" />
									<span dir="auto">{b}</span>
								</li>
							))}
						</ul>
					)}
					{result.analogy && (
						<p className="mt-2 opacity-70 italic" dir="auto">
							{result.analogy}
						</p>
					)}
				</motion.div>
			)}
		</div>
	);
}

function SettingsBody({
	prefs,
	theme,
	t,
	updatePrefs,
	prefsSaved,
	hasArticlePrefs,
	onSaveAsGlobalDefault,
	onResetArticlePrefs,
}) {
	const [tab, setTab] = useState('reading');

	return (
		<div className="space-y-5 text-sm">
			<div className="flex gap-1 rounded-2xl p-1" style={{ background: `${theme.ink}08` }}>
				{[
					['reading', t('reading.settingsTabReading'), Settings2],
					['ai', t('reading.settingsTabAi'), Bot],
				].map(([id, label, Icon]) => (
					<button
						key={id}
						type="button"
						onClick={() => setTab(id)}
						className="flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition"
						style={{
							background: tab === id ? theme.paper : 'transparent',
							color: tab === id ? theme.ink : theme.muted,
							boxShadow: tab === id ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
						}}
					>
						<Icon size={13} />
						{label}
					</button>
				))}
			</div>

			{tab === 'ai' && <AiSettingsPanel prefs={prefs} theme={theme} t={t} updatePrefs={updatePrefs} />}

			{tab === 'reading' && (
		<div className="space-y-6 text-sm">
			<div className="rounded-2xl px-3.5 py-3 text-xs leading-relaxed" style={{ background: `${theme.ink}08` }}>
				<p className="font-semibold opacity-80">
					{hasArticlePrefs ? t('reading.prefsScopeArticle') : t('reading.prefsScopeGlobal')}
				</p>
				<p className="mt-1 opacity-55">{t('reading.prefsScopeHint')}</p>
				{prefsSaved && (
					<p className="mt-2 font-semibold" style={{ color: theme.accent }}>
						{t('reading.prefsSaved')}
					</p>
				)}
				<div className="mt-3 flex flex-wrap gap-2">
					<button
						type="button"
						onClick={onSaveAsGlobalDefault}
						className="rounded-full px-3 py-1.5 text-[11px] font-bold text-white"
						style={{ background: theme.accent }}
					>
						{t('reading.prefsSaveGlobal')}
					</button>
					{hasArticlePrefs && (
						<button
							type="button"
							onClick={onResetArticlePrefs}
							className="rounded-full px-3 py-1.5 text-[11px] font-bold"
							style={{ background: `${theme.ink}12`, color: theme.ink }}
						>
							{t('reading.prefsResetArticle')}
						</button>
					)}
				</div>
			</div>

			<label className="block">
				<span className="mb-1 flex justify-between text-xs font-semibold opacity-60">
					<span>{t('reading.fontSize')}</span>
					<span>{prefs.fontSize}px</span>
				</span>
				<input
					type="range"
					min={14}
					max={28}
					value={prefs.fontSize}
					onChange={e => updatePrefs({ fontSize: Number(e.target.value) })}
					className="w-full"
				/>
			</label>

			<label className="block">
				<span className="mb-1 flex justify-between text-xs font-semibold opacity-60">
					<span>{t('reading.lineHeight')}</span>
					<span>{Number(prefs.lineHeight).toFixed(2)}</span>
				</span>
				<input
					type="range"
					min={1.35}
					max={2.4}
					step={0.05}
					value={prefs.lineHeight}
					onChange={e => updatePrefs({ lineHeight: Number(e.target.value) })}
					className="w-full"
				/>
			</label>

			<label className="block">
				<span className="mb-1 flex justify-between text-xs font-semibold opacity-60">
					<span>{t('reading.width')}</span>
					<span>{prefs.maxWidth}px</span>
				</span>
				<input
					type="range"
					min={440}
					max={920}
					value={prefs.maxWidth}
					onChange={e => updatePrefs({ maxWidth: Number(e.target.value) })}
					className="w-full"
				/>
			</label>

			<label className="block">
				<span className="mb-1 flex justify-between text-xs font-semibold opacity-60">
					<span>{t('reading.fontWeight')}</span>
					<span>{prefs.fontWeight}</span>
				</span>
				<input
					type="range"
					min={300}
					max={700}
					step={100}
					value={prefs.fontWeight || 400}
					onChange={e => updatePrefs({ fontWeight: Number(e.target.value) })}
					className="w-full"
				/>
			</label>

			<label className="block">
				<span className="mb-1 flex justify-between text-xs font-semibold opacity-60">
					<span>{t('reading.letterSpacing')}</span>
					<span>{Number(prefs.letterSpacing || 0).toFixed(2)}</span>
				</span>
				<input
					type="range"
					min={-0.02}
					max={0.08}
					step={0.005}
					value={prefs.letterSpacing || 0}
					onChange={e => updatePrefs({ letterSpacing: Number(e.target.value) })}
					className="w-full"
				/>
			</label>

			<label className="block">
				<span className="mb-1 flex justify-between text-xs font-semibold opacity-60">
					<span>{t('reading.paragraphGap')}</span>
					<span>{Number(prefs.paragraphGap || 1.25).toFixed(2)}</span>
				</span>
				<input
					type="range"
					min={0.6}
					max={2.4}
					step={0.05}
					value={prefs.paragraphGap || 1.25}
					onChange={e => updatePrefs({ paragraphGap: Number(e.target.value) })}
					className="w-full"
				/>
			</label>

			<div>
				<span className="mb-2 block text-xs font-semibold opacity-60">{t('reading.pageMode')}</span>
				<div className="flex flex-wrap gap-2">
					{[
						['pages', t('reading.pageModePages')],
						['scroll', t('reading.pageModeScroll')],
					].map(([id, label]) => (
						<button
							key={id}
							type="button"
							onClick={() => updatePrefs({ pageMode: id })}
							className="rounded-full px-3 py-1.5 text-xs font-semibold"
							style={{
								background: (prefs.pageMode || 'pages') === id ? theme.accent : `${theme.ink}10`,
								color: (prefs.pageMode || 'pages') === id ? '#fff' : theme.ink,
							}}
						>
							{label}
						</button>
					))}
				</div>
				{(prefs.pageMode || 'pages') === 'pages' && (
					<label className="mt-3 flex items-center gap-2 text-xs">
						<input
							type="checkbox"
							checked={prefs.wheelTurnsPage !== false}
							onChange={e => updatePrefs({ wheelTurnsPage: e.target.checked })}
							className="rounded"
						/>
						{t('reading.wheelTurnsPage')}
					</label>
				)}
			</div>

			<div>
				<span className="mb-2 block text-xs font-semibold opacity-60">{t('reading.fontPreset')}</span>
				<p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider opacity-40">{t('reading.fontGroupLatin')}</p>
				<div className="mb-3 flex flex-wrap gap-2">
					{FONT_PRESET_LATIN.map(p => (
						<button
							key={p}
							type="button"
							onClick={() => updatePrefs({ fontPreset: p })}
							className="rounded-full px-3 py-1.5 text-xs font-semibold capitalize"
							style={{
								background: prefs.fontPreset === p ? theme.accent : `${theme.ink}10`,
								color: prefs.fontPreset === p ? '#fff' : theme.ink,
								fontFamily: resolveContentFont('en', p),
							}}
						>
							{t(`reading.fontPresets.${p}`)}
						</button>
					))}
				</div>
				<p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider opacity-40">{t('reading.fontGroupArabic')}</p>
				<div className="flex flex-wrap gap-2">
					{FONT_PRESET_ARABIC.map(p => (
						<button
							key={p}
							type="button"
							onClick={() => updatePrefs({ fontPreset: p })}
							className="rounded-full px-3 py-1.5 text-xs font-semibold"
							dir="rtl"
							style={{
								background: prefs.fontPreset === p ? theme.accent : `${theme.ink}10`,
								color: prefs.fontPreset === p ? '#fff' : theme.ink,
								fontFamily: resolveContentFont('ar', p),
							}}
						>
							{t(`reading.fontPresets.${p}`)}
						</button>
					))}
				</div>
				<p
					className="mt-3 rounded-xl px-3 py-2 text-[13px] leading-relaxed"
					dir={isArabicFontPreset(prefs.fontPreset) ? 'rtl' : 'auto'}
					style={{
						background: `${theme.ink}08`,
						fontFamily: resolveContentFont(isArabicFontPreset(prefs.fontPreset) ? 'ar' : 'en', prefs.fontPreset),
						textAlign: isArabicFontPreset(prefs.fontPreset) ? 'right' : 'left',
					}}
				>
					{isArabicFontPreset(prefs.fontPreset) ? t('reading.fontPreviewAr') : t('reading.fontPreview')}
				</p>
			</div>

			<div>
				<span className="mb-2 block text-xs font-semibold opacity-60">{t('reading.theme')}</span>
				<div className="grid grid-cols-2 gap-2">
					{READING_THEME_IDS.map(th => {
						const swatch = THEME_STYLES[th];
						const active = prefs.theme === th;
						return (
							<button
								key={th}
								type="button"
								onClick={() => updatePrefs({ theme: th })}
								className="flex items-center gap-2.5 rounded-2xl border px-2.5 py-2 text-start transition"
								style={{
									borderColor: active ? theme.accent : `${theme.ink}12`,
									background: active ? `${theme.accent}12` : 'transparent',
								}}
							>
								<span
									className="h-8 w-8 shrink-0 rounded-full border border-black/10 shadow-inner"
									style={{
										background: `linear-gradient(135deg, ${swatch.bg}, ${swatch.paper})`,
										boxShadow: `inset 0 0 0 2px ${swatch.accent}55`,
									}}
								/>
								<span className="min-w-0">
									<span className="block text-xs font-bold capitalize">{t(`reading.themes.${th}`)}</span>
									<span className="block truncate text-[10px] opacity-50">{th}</span>
								</span>
							</button>
						);
					})}
				</div>
			</div>
		</div>
			)}
		</div>
	);
}

function AiSettingsPanel({ prefs, theme, t, updatePrefs }) {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [models, setModels] = useState([]);
	const [providers, setProviders] = useState([]);
	const [saving, setSaving] = useState('');
	const [savedFlash, setSavedFlash] = useState(false);

	useEffect(() => {
		let alive = true;
		(async () => {
			try {
				setLoading(true);
				setError('');
				const api = (await import('@/utils/axios')).default;
				const { data } = await api.get('/ai/settings');
				if (!alive) return;
				const textModels = (data?.models || []).filter(m => m.type === 'text');
				setModels(textModels);
				setProviders(data?.providers || []);
				const feature = (data?.features || []).find(f => f.id === 'ai-reading');
				if (feature?.modelKey && !prefs.aiModelKey) {
					updatePrefs({
						aiModelKey: feature.modelKey,
						aiProvider: feature.provider || prefs.aiProvider,
					});
				}
			} catch {
				if (alive) setError(t('reading.aiSettingsError'));
			} finally {
				if (alive) setLoading(false);
			}
		})();
		return () => {
			alive = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const providerLabel = id => {
		const row = providers.find(p => p.id === id);
		return row?.name || id || '—';
	};

	const selectModel = async model => {
		if (!model?.modelKey || model.locked || model.enabled === false) return;
		setSaving(model.modelKey);
		updatePrefs({
			aiModelKey: model.modelKey,
			aiProvider: model.provider || 'llm7-free',
		});
		try {
			const api = (await import('@/utils/axios')).default;
			await api.put('/ai/settings/features', {
				feature: 'ai-reading',
				modelKey: model.modelKey,
			});
			setSavedFlash(true);
			setTimeout(() => setSavedFlash(false), 1800);
		} catch {
			/* prefs still apply locally */
		} finally {
			setSaving('');
		}
	};

	const activeKey = prefs.aiModelKey || 'gpt-oss:20b';

	const sorted = [...models].sort((a, b) => {
		const freeRank = x => (x.costTier === 'FREE' || x.costTier === 'FREE_TIER' ? 0 : 1);
		const lockRank = x => (x.locked || x.enabled === false ? 1 : 0);
		return lockRank(a) - lockRank(b) || freeRank(a) - freeRank(b) || String(a.name).localeCompare(String(b.name));
	});

	return (
		<div className="space-y-4">
			<div>
				<p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: theme.accent }}>
					<Bot size={13} /> {t('reading.aiSettingsTitle')}
				</p>
				<p className="mt-1 text-xs leading-relaxed opacity-60">{t('reading.aiSettingsHint')}</p>
			</div>

			{savedFlash && (
				<p className="rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: `${theme.accent}18`, color: theme.accent }}>
					{t('reading.aiSettingsSaved')}
				</p>
			)}

			{loading && (
				<p className="inline-flex items-center gap-2 text-xs opacity-50">
					<Loader2 size={14} className="animate-spin" /> {t('reading.aiSettingsLoading')}
				</p>
			)}

			{error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

			{!loading && !error && !sorted.length && (
				<p className="text-xs opacity-50">{t('reading.aiSettingsEmpty')}</p>
			)}

			<div className="space-y-2">
				{sorted.map(model => {
					const active = model.modelKey === activeKey;
					const disabled = model.locked || model.enabled === false;
					const free = model.costTier === 'FREE' || model.costTier === 'FREE_TIER';
					return (
						<button
							key={model.modelKey}
							type="button"
							disabled={disabled || saving === model.modelKey}
							onClick={() => selectModel(model)}
							className="flex w-full items-start gap-3 rounded-2xl px-3.5 py-3 text-start transition disabled:opacity-45"
							style={{
								background: active ? `${theme.accent}18` : `${theme.ink}06`,
								boxShadow: active ? `inset 0 0 0 1.5px ${theme.accent}` : 'none',
							}}
						>
							<span
								className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
								style={{ background: `${theme.accent}18`, color: theme.accent }}
							>
								{saving === model.modelKey ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
							</span>
							<span className="min-w-0 flex-1">
								<span className="flex flex-wrap items-center gap-1.5">
									<span className="text-[13px] font-bold">{model.name || model.modelKey}</span>
									{free && (
										<span
											className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
											style={{ background: `${theme.accent}22`, color: theme.accent }}
										>
											{t('reading.aiSettingsFree')}
										</span>
									)}
									{disabled && (
										<span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-800">
											{t('reading.aiSettingsLocked')}
										</span>
									)}
								</span>
								<span className="mt-0.5 block text-[11px] opacity-50">
									{providerLabel(model.provider)} · {model.modelKey}
								</span>
								{active && (
									<span className="mt-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.accent }}>
										{t('reading.aiSettingsActive')}
									</span>
								)}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}

/** Split text into plain + mark segments for word-level highlights. */
function HighlightedText({ text, highlights, onRemove }) {
	const segments = useMemo(() => buildHighlightSegments(text, highlights), [text, highlights]);

	if (!segments.some(s => s.highlight)) {
		return text;
	}

	const inheritType = {
		font: 'inherit',
		fontFamily: 'inherit',
		fontSize: 'inherit',
		fontWeight: 'inherit',
		fontStyle: 'inherit',
		letterSpacing: 'inherit',
		lineHeight: 'inherit',
		color: 'inherit',
	};

	return (
		<>
			{segments.map((seg, i) =>
				seg.highlight ? (
					<span
						key={i}
						role="mark"
						className="group relative rounded-[3px] px-[0.12em] py-[0.05em]"
						style={{
							...inheritType,
							backgroundColor: `${seg.highlight.color}55`,
							boxDecorationBreak: 'clone',
							WebkitBoxDecorationBreak: 'clone',
						}}
					>
						{seg.text}
						<button
							type="button"
							title="Remove"
							onClick={e => {
								e.preventDefault();
								e.stopPropagation();
								onRemove?.(seg.highlight.id);
							}}
							className="pointer-events-none absolute -top-2 end-0 z-10 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full bg-rose-500 text-white opacity-0 shadow transition group-hover:pointer-events-auto group-hover:opacity-100"
						>
							<X size={9} strokeWidth={3} />
						</button>
					</span>
				) : (
					<span key={i} style={inheritType}>
						{seg.text}
					</span>
				),
			)}
		</>
	);
}

function buildHighlightSegments(text, highlights) {
	const source = String(text || '');
	if (!source || !highlights?.length) return [{ text: source, highlight: null }];

	const ranges = [];
	for (const h of highlights) {
		const needle = String(h.text || '').trim();
		if (!needle || needle.length < 2) continue;
		let from = 0;
		let idx = source.indexOf(needle, from);
		// Prefer exact phrase; only first occurrence per highlight id to avoid flooding short words
		if (idx === -1) continue;
		ranges.push({ start: idx, end: idx + needle.length, highlight: h });
	}

	ranges.sort((a, b) => a.start - b.start || b.end - a.end);
	const cleaned = [];
	let cursor = 0;
	for (const r of ranges) {
		if (r.start < cursor) continue;
		cleaned.push(r);
		cursor = r.end;
	}

	if (!cleaned.length) return [{ text: source, highlight: null }];

	const out = [];
	let i = 0;
	for (const r of cleaned) {
		if (r.start > i) out.push({ text: source.slice(i, r.start), highlight: null });
		out.push({ text: source.slice(r.start, r.end), highlight: r.highlight });
		i = r.end;
	}
	if (i < source.length) out.push({ text: source.slice(i), highlight: null });
	return out;
}

function Block({ block, theme, highlights, isRTL = false, fontFamily, onRemoveHighlight, keyIdeaLabel, bionic = false }) {
	const matched = (highlights || []).filter(h => block.text && h.text && block.text.includes(h.text));
	const blockLang = detectTextLang(block.text || (block.items || []).join(' ')) || (isRTL ? 'ar' : 'en');
	/* Never center body copy — stick to reading edge (right for Arabic). */
	const align = isRTL || blockLang === 'ar' ? 'right' : 'left';
	const dir = isRTL || blockLang === 'ar' ? 'rtl' : 'ltr';
	const font = fontFamily || readingFontFamily(blockLang);

	const renderBionic = text => {
		if (!bionic || !text) return text;
		return bionicNodes(text).map(n => (
			<span key={n.key}>
				<strong style={{ fontWeight: 700 }}>{n.bold}</strong>
				{n.rest}
			</span>
		));
	};

	const body = matched.length ? (
		<HighlightedText text={block.text} highlights={matched} onRemove={onRemoveHighlight} />
	) : (
		renderBionic(block.text)
	);

	if (block.type === 'heading') {
		const level = Number(block.level) || 2;
		const Tag = level >= 4 ? 'h4' : level === 3 ? 'h3' : level === 1 ? 'h1' : 'h2';
		const size =
			level === 1
				? 'text-[1.75em] leading-tight mb-2 mt-2'
				: level === 2
					? 'text-[1.4em] leading-snug mb-1.5 mt-6'
					: level === 3
						? 'text-[1.15em] leading-snug mb-1 mt-5'
						: 'text-[1.05em] leading-snug mb-1 mt-4';
		const headingColor = block.accent || theme.heading || theme.accent;
		return (
			<Tag
				className={`font-bold tracking-tight ${size}`}
				dir={dir}
				style={{ textAlign: align, fontFamily: font, color: headingColor }}
			>
				{body}
			</Tag>
		);
	}
	if (block.type === 'quote') {
		return (
			<blockquote
				className="border-s-4 py-1 ps-4 text-[0.98em] italic"
				dir={dir}
				style={{ borderColor: block.accent || theme.accent, color: theme.muted, textAlign: align, fontFamily: font }}
			>
				{body}
			</blockquote>
		);
	}
	if (block.type === 'key_idea') {
		const tone = block.accent || theme.accent;
		return (
			<div className="rounded-2xl px-4 py-3" dir={dir} style={{ background: `${tone}14`, textAlign: align, fontFamily: font }}>
				<p className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: tone }}>
					{keyIdeaLabel || 'Key idea'}
				</p>
				<p className="font-medium">{body}</p>
			</div>
		);
	}
	if (block.type === 'callout') {
		const tone =
			block.accent ||
			(block.calloutType === 'action'
				? '#ea580c'
				: block.calloutType === 'warning'
					? '#dc2626'
					: block.calloutType === 'tip'
						? '#2563eb'
						: theme.accent);
		return (
			<div className="rounded-2xl border px-4 py-3" dir={dir} style={{ borderColor: `${tone}44`, background: `${tone}10`, textAlign: align, fontFamily: font }}>
				<p className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: tone }}>
					{block.calloutType || 'note'}
				</p>
				<p>{body}</p>
			</div>
		);
	}
	if (block.type === 'list') {
		return (
			<ul className="list-disc space-y-1 ps-5" dir={dir} style={{ textAlign: align, fontFamily: font, color: block.accent || undefined }}>
				{(block.items || []).map((item, i) => (
					<li key={i} dir="auto">
						{item}
					</li>
				))}
			</ul>
		);
	}
	return (
		<p className="text-pretty" dir={dir} style={{ textAlign: align, fontFamily: font }}>
			{body}
		</p>
	);
}

function KnowledgeBody({ book, t, theme, onAddNote, onToggleAction, onSaveReview, onIdeaToAction, onBookmark, onRemoveHighlight }) {
	const [note, setNote] = useState('');
	const [review, setReview] = useState(book.knowledge?.review?.text || '');
	const [actionDrafts, setActionDrafts] = useState({});
	const k = book.knowledge || {};

	return (
		<div className="space-y-6 text-sm">
			<button
				type="button"
				onClick={onBookmark}
				className="w-full rounded-xl border border-dashed px-3 py-2 text-xs font-semibold"
				style={{ borderColor: `${theme.accent}55`, color: theme.accent }}
			>
				{t('knowledge.bookmarkPage')}
			</button>

			<section>
				<h3 className="mb-2 text-xs font-bold uppercase tracking-wider opacity-50">{t('knowledge.importantWords')}</h3>
				<div className="space-y-2">
					{(k.importantWords || []).slice(0, 40).map(w => (
						<div key={w.id} className="rounded-xl px-3 py-2.5" style={{ background: `${theme.ink}08` }}>
							<p className="font-bold">
								{w.word}
								{w.translation ? <span className="ms-2 font-semibold opacity-70">— {w.translation}</span> : null}
							</p>
							{w.meaning && <p className="mt-1 text-xs leading-relaxed opacity-70">{w.meaning}</p>}
							{w.context && <p className="mt-1 text-[11px] italic opacity-50 line-clamp-2">{w.context}</p>}
						</div>
					))}
					{!k.importantWords?.length && <p className="opacity-50">{t('knowledge.emptyWords')}</p>}
				</div>
			</section>

			<section>
				<h3 className="mb-2 text-xs font-bold uppercase tracking-wider opacity-50">{t('knowledge.highlights')}</h3>
				<div className="space-y-2">
					{(k.highlights || []).slice(0, 30).map(h => (
						<div key={h.id} className="group relative rounded-lg px-3 py-2 pe-8" style={{ background: `${h.color}22` }}>
							<span className="me-2 text-[10px] font-bold uppercase">{h.type}</span>
							{h.text}
							<button
								type="button"
								onClick={() => onRemoveHighlight?.(h.id)}
								className="absolute end-2 top-2 rounded-full p-1 opacity-40 transition hover:bg-rose-500 hover:text-white hover:opacity-100"
								aria-label="remove"
							>
								<X size={12} />
							</button>
						</div>
					))}
					{!k.highlights?.length && <p className="opacity-50">{t('knowledge.emptyHighlights')}</p>}
				</div>
			</section>

			<section>
				<h3 className="mb-2 text-xs font-bold uppercase tracking-wider opacity-50">{t('knowledge.notes')}</h3>
				<div className="mb-2 flex gap-2">
					<input
						value={note}
						onChange={e => setNote(e.target.value)}
						placeholder={t('knowledge.notePlaceholder')}
						className="flex-1 rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm outline-none"
					/>
					<button
						type="button"
						onClick={() => {
							onAddNote(note);
							setNote('');
						}}
						className="rounded-lg px-3 text-white"
						style={{ background: theme.accent }}
					>
						<Check size={14} />
					</button>
				</div>
				<ul className="space-y-2">
					{(k.notes || []).map(n => (
						<li key={n.id} className="rounded-lg bg-black/5 px-3 py-2">
							{n.text}
						</li>
					))}
				</ul>
			</section>

			<section>
				<h3 className="mb-2 text-xs font-bold uppercase tracking-wider opacity-50">{t('knowledge.ideas')}</h3>
				<ul className="space-y-3">
					{(k.keyIdeas || []).map(i => (
						<li key={i.id} className="rounded-xl bg-black/5 p-3">
							<div className="flex gap-2">
								<Lightbulb size={14} className="mt-0.5 shrink-0" />
								<span>{i.text}</span>
							</div>
							<input
								value={actionDrafts[i.id] || ''}
								onChange={e => setActionDrafts(d => ({ ...d, [i.id]: e.target.value }))}
								placeholder={t('knowledge.ideaToActionPlaceholder')}
								className="mt-2 w-full rounded-lg border border-black/10 bg-transparent px-2 py-1.5 text-xs outline-none"
							/>
							<button
								type="button"
								onClick={() =>
									onIdeaToAction({
										id: i.id,
										text: i.text,
										actionText: actionDrafts[i.id] || undefined,
									})
								}
								className="mt-2 text-[11px] font-bold"
								style={{ color: theme.accent }}
							>
								{t('knowledge.turnIntoAction')} →
							</button>
						</li>
					))}
				</ul>
			</section>

			<section>
				<h3 className="mb-2 text-xs font-bold uppercase tracking-wider opacity-50">{t('knowledge.actions')}</h3>
				<ul className="space-y-2">
					{(k.actions || []).map(a => (
						<li key={a.id}>
							<button type="button" onClick={() => onToggleAction(a.id)} className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-start hover:bg-black/5">
								<span
									className="mt-0.5 flex h-4 w-4 items-center justify-center rounded border"
									style={{ background: a.done ? theme.accent : 'transparent', borderColor: theme.accent }}
								>
									{a.done ? <Check size={10} className="text-white" /> : null}
								</span>
								<span className={a.done ? 'line-through opacity-50' : ''}>{a.text}</span>
							</button>
						</li>
					))}
				</ul>
			</section>

			<section>
				<h3 className="mb-2 text-xs font-bold uppercase tracking-wider opacity-50">{t('knowledge.review')}</h3>
				<textarea
					value={review}
					onChange={e => setReview(e.target.value)}
					rows={3}
					className="w-full rounded-xl border border-black/10 bg-transparent px-3 py-2 outline-none"
					placeholder={t('knowledge.reviewPlaceholder')}
				/>
				<button
					type="button"
					onClick={() => onSaveReview(review)}
					className="mt-2 rounded-full px-4 py-1.5 text-xs font-semibold text-white"
					style={{ background: theme.accent }}
				>
					{t('common.save')}
				</button>
			</section>
		</div>
	);
}
