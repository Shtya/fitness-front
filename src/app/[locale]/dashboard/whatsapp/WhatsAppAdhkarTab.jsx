'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
	ArrowRight,
	BarChart3,
	BookMarked,
	BookOpen,
	CalendarCheck,
	Check,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Flame,
	Moon,
	Plus,
	RotateCcw,
	Sparkles,
	Sunrise,
	Sunset,
	Trash2,
	X,
} from 'lucide-react';
import { ADHKAR_SECTIONS, getSectionItems } from './adhkar/adhkar-data';
import {
	loadCustomDuas,
	loadFavorites,
	loadProgress,
	saveCustomDuas,
	saveFavorites,
	saveProgress,
	todayYmd,
} from './adhkar/adhkar-storage';
import './adhkar/adhkar.css';

const TEXT_FONT_HREF = 'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Noto+Naskh+Arabic:wght@400;500;600&display=swap';
const AUTO_ADVANCE_MS = 650;
const STREAK_LOOKBACK = 14;
const WEEK_DAYS = 7;

const DAY_ORDER = ['morning', 'evening', 'sleep'];
const SECTION_ICONS = { morning: Sunrise, evening: Sunset, sleep: Moon, custom: BookMarked };
const BUILT_IN = ADHKAR_SECTIONS.filter(section => section.id !== 'custom').flatMap(section => section.items);

function uid() {
	return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function resolveUserId() {
	if (typeof window === 'undefined') return 'anonymous';
	try {
		const raw = window.localStorage.getItem('user') || window.localStorage.getItem('impersonated_user');
		const user = raw ? JSON.parse(raw) : null;
		return String(user?.id || '').trim() || 'anonymous';
	} catch {
		return 'anonymous';
	}
}

/** Loads the Amiri face for the dhikr text once, only while this tab is used. */
function useTextFont() {
	useEffect(() => {
		if (document.querySelector(`link[data-adk-font][href="${TEXT_FONT_HREF}"]`)) return;
		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = TEXT_FONT_HREF;
		link.dataset.adkFont = '';
		document.head.appendChild(link);
	}, []);
}

function cairoHour() {
	try {
		return Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Africa/Cairo' }).format(new Date()));
	} catch {
		return new Date().getHours();
	}
}

/** Morning until mid-afternoon, evening until late night, then sleep. */
function sectionForHour(hour) {
	if (hour >= 3 && hour < 15) return 'morning';
	if (hour >= 15 && hour < 22) return 'evening';
	return 'sleep';
}

function shiftYmd(ymd, days) {
	const d = new Date(`${ymd}T12:00:00Z`);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
}

function hijriToday(ar) {
	try {
		return new Intl.DateTimeFormat(ar ? 'ar-EG-u-ca-islamic-umalqura-nu-latn' : 'en-u-ca-islamic-umalqura', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			timeZone: 'Africa/Cairo',
		}).format(new Date());
	} catch {
		return '';
	}
}

const prefersReducedMotion = () =>
	typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const isDone = (item, progress) => (Number(progress[item.id]) || 0) >= (Number(item.count) || 1);

const MORNING = ADHKAR_SECTIONS.find(s => s.id === 'morning').items;
const EVENING = ADHKAR_SECTIONS.find(s => s.id === 'evening').items;
const dayComplete = progress => MORNING.every(i => isDone(i, progress)) || EVENING.every(i => isDone(i, progress));

/** Days in a row (ending today or yesterday) on which morning or evening adhkar were completed. */
function computeStreak(userId, todayProgress) {
	const today = todayYmd();
	let streak = 0;
	for (let back = 0; back < STREAK_LOOKBACK; back += 1) {
		const progress = back === 0 ? todayProgress : loadProgress(userId, shiftYmd(today, -back));
		if (dayComplete(progress)) streak += 1;
		else if (back === 0) continue; // today not finished yet doesn't break the chain
		else break;
	}
	return streak;
}

/** Completed adhkar per day for the last week (oldest first), from saved progress. */
function computeWeek(userId, todayProgress, allItems) {
	const today = todayYmd();
	return Array.from({ length: WEEK_DAYS }, (_, i) => {
		const back = WEEK_DAYS - 1 - i;
		const day = shiftYmd(today, -back);
		const progress = back === 0 ? todayProgress : loadProgress(userId, day);
		return { day, today: back === 0, done: allItems.filter(item => isDone(item, progress)).length };
	});
}

function repeatLabel(count, ar, fmt) {
	if (!ar) return count === 1 ? 'Once' : `${fmt(count)} times`;
	if (count === 1) return 'مرة واحدة';
	if (count === 2) return 'مرتان';
	if (count <= 10) return `${fmt(count)} مرات`;
	return `${fmt(count)} مرة`;
}

function adhkarWord(n, ar, fmt) {
	if (!ar) return `${n} ${n === 1 ? 'dhikr' : 'adhkar'}`;
	if (n === 1) return 'ذكر واحد';
	if (n === 2) return 'ذكران';
	if (n <= 10) return `${fmt(n)} أذكار`;
	return `${fmt(n)} ذكرًا`;
}

/**
 * «أذكاري»: a home screen (sections + your stats) and a full-screen reader for one section at a time.
 * Progress, bookmarks and personal duas persist in localStorage (per user, Cairo day).
 */
export default function WhatsAppAdhkarTab({ locale = 'ar', onExit }) {
	const ar = String(locale).toLowerCase().startsWith('ar');
	const userId = useMemo(() => resolveUserId(), []);
	useTextFont();

	const nf = useMemo(() => new Intl.NumberFormat(ar ? 'ar-EG-u-nu-latn' : 'en-US'), [ar]);
	const fmt = useCallback(n => nf.format(n), [nf]);
	const hour = useMemo(() => cairoHour(), []);
	const suggested = useMemo(() => sectionForHour(hour), [hour]);

	const [openId, setOpenId] = useState(null);
	const [page, setPage] = useState(0);
	const [dir, setDir] = useState(1);
	const [expanded, setExpanded] = useState(false);
	const [finished, setFinished] = useState(false);
	const [armedDelete, setArmedDelete] = useState(false);
	const [custom, setCustom] = useState(() => loadCustomDuas(userId));
	const [progress, setProgress] = useState(() => loadProgress(userId));
	const [favorites, setFavorites] = useState(() => loadFavorites(userId));
	const [composerOpen, setComposerOpen] = useState(false);
	const [draftText, setDraftText] = useState('');
	const [draftCount, setDraftCount] = useState('1');
	const [draftNote, setDraftNote] = useState('');
	const [mounted, setMounted] = useState(false);
	const advanceTimer = useRef(0);
	const returnFocus = useRef(null);

	useEffect(() => setMounted(true), []);
	useEffect(() => saveCustomDuas(userId, custom), [userId, custom]);
	useEffect(() => saveProgress(userId, progress), [userId, progress]);
	useEffect(() => saveFavorites(userId, favorites), [userId, favorites]);
	useEffect(() => () => window.clearTimeout(advanceTimer.current), []);

	// Saved = your own duas + adhkar you bookmarked in the other sections.
	const savedItems = useMemo(
		() => [...getSectionItems('custom', custom), ...BUILT_IN.filter(item => favorites.has(item.id))],
		[custom, favorites],
	);
	const itemsFor = useCallback(id => (id === 'custom' ? savedItems : getSectionItems(id, custom)), [savedItems, custom]);
	const items = openId ? itemsFor(openId) : [];
	const safePage = items.length ? Math.min(page, items.length - 1) : 0;
	const current = items[safePage] || null;

	const sectionStats = useMemo(
		() =>
			Object.fromEntries(
				ADHKAR_SECTIONS.map(section => {
					const list = itemsFor(section.id);
					return [section.id, { total: list.length, done: list.filter(item => isDone(item, progress)).length }];
				}),
			),
		[itemsFor, progress],
	);
	const allItems = useMemo(() => [...BUILT_IN, ...custom], [custom]);
	const streak = useMemo(() => computeStreak(userId, progress), [userId, progress]);
	const week = useMemo(() => computeWeek(userId, progress, allItems), [userId, progress, allItems]);
	const todayDone = week[week.length - 1]?.done || 0;
	const weekDone = week.reduce((sum, d) => sum + d.done, 0);
	const weekMax = Math.max(1, ...week.map(d => d.done));
	const hijri = useMemo(() => hijriToday(ar), [ar]);
	const dayFmt = useMemo(() => new Intl.DateTimeFormat(ar ? 'ar-EG' : 'en-GB', { weekday: 'short', timeZone: 'UTC' }), [ar]);

	const sectionName = id => {
		if (id === 'custom') return ar ? 'المحفوظ' : 'Saved';
		const label = ar ? ADHKAR_SECTIONS.find(s => s.id === id)?.labelAr : ADHKAR_SECTIONS.find(s => s.id === id)?.labelEn;
		return ar ? `أذكار ${label}` : `${label} adhkar`;
	};

	const openSection = id => {
		window.clearTimeout(advanceTimer.current);
		returnFocus.current = document.activeElement;
		const list = itemsFor(id);
		const firstOpen = list.findIndex(item => !isDone(item, progress));
		setOpenId(id);
		setDir(1);
		setPage(firstOpen < 0 ? 0 : firstOpen);
		setFinished(list.length > 0 && firstOpen < 0);
		setExpanded(false);
		setArmedDelete(false);
	};

	const closeReader = useCallback(() => {
		window.clearTimeout(advanceTimer.current);
		setOpenId(null);
		setFinished(false);
		const el = returnFocus.current;
		if (el instanceof HTMLElement && el.isConnected) window.setTimeout(() => el.focus({ preventScroll: true }), 0);
	}, []);

	const goTo = useCallback(
		next => {
			window.clearTimeout(advanceTimer.current);
			setDir(next >= safePage ? 1 : -1);
			setPage(Math.max(0, Math.min(items.length - 1, next)));
			setExpanded(false);
			setArmedDelete(false);
			setFinished(false);
		},
		[safePage, items.length],
	);

	const bump = useCallback(() => {
		if (!current) return;
		const need = Number(current.count) || 1;
		const now = Number(progress[current.id]) || 0;
		if (now >= need) return;
		const next = { ...progress, [current.id]: now + 1 };
		setProgress(next);
		if (now + 1 < need) return;
		// Finished this one: move on gently to the next unfinished dhikr, or close the section.
		window.clearTimeout(advanceTimer.current);
		advanceTimer.current = window.setTimeout(() => {
			const after = items.findIndex((item, i) => i > safePage && !isDone(item, next));
			const before = items.findIndex(item => !isDone(item, next));
			const target = after >= 0 ? after : before;
			if (target < 0) {
				setFinished(true);
				return;
			}
			setDir(1);
			setPage(target);
			setExpanded(false);
		}, prefersReducedMotion() ? 0 : AUTO_ADVANCE_MS);
	}, [current, progress, items, safePage]);

	const completeAndNext = () => {
		if (!current) return;
		window.clearTimeout(advanceTimer.current);
		const need = Number(current.count) || 1;
		const next = isDone(current, progress) ? progress : { ...progress, [current.id]: need };
		if (next !== progress) setProgress(next);
		setExpanded(false);
		setArmedDelete(false);
		if (safePage < items.length - 1) {
			setDir(1);
			setPage(safePage + 1);
			return;
		}
		const open = items.findIndex(item => !isDone(item, next));
		if (open < 0) {
			setFinished(true);
			return;
		}
		setDir(1);
		setPage(open);
	};

	const resetItem = () => {
		if (!current) return;
		setProgress(prev => {
			const next = { ...prev };
			delete next[current.id];
			return next;
		});
	};

	const resetSection = () => {
		setProgress(prev => {
			const next = { ...prev };
			for (const item of items) delete next[item.id];
			return next;
		});
		setFinished(false);
		setDir(-1);
		setPage(0);
	};

	const toggleFavorite = () => {
		if (!current) return;
		setFavorites(prev => {
			const next = new Set(prev);
			if (next.has(current.id)) next.delete(current.id);
			else next.add(current.id);
			return next;
		});
	};

	const removeCustom = id => {
		setCustom(prev => prev.filter(item => item.id !== id));
		setProgress(prev => {
			const next = { ...prev };
			delete next[id];
			return next;
		});
		setFavorites(prev => {
			const next = new Set(prev);
			next.delete(id);
			return next;
		});
		setArmedDelete(false);
		setPage(p => Math.max(0, p - 1));
	};

	const addCustom = event => {
		event.preventDefault();
		const text = draftText.trim();
		if (!text) return;
		const count = Math.max(1, Math.min(999, Number(draftCount) || 1));
		const note = draftNote.trim();
		const item = {
			id: uid(),
			text,
			count,
			benefit: note || 'دعاء حفظته لنفسك',
			benefitEn: note || 'A dua you saved for yourself',
			explanation: note || 'أضفته بنفسك من محفوظاتك.',
			explanationEn: note || 'Added by you from your own collection.',
			source: 'محفوظ شخصي',
			custom: true,
		};
		setCustom(prev => [item, ...prev]);
		setDraftText('');
		setDraftCount('1');
		setDraftNote('');
		setComposerOpen(false);
		setOpenId('custom');
		setFinished(false);
		setDir(1);
		setPage(0);
	};

	// Reader keys: Space / Enter counts, arrows move in reading direction, Escape closes.
	useEffect(() => {
		if (!openId) return undefined;
		const onKey = event => {
			if (composerOpen || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
			if (event.key === 'Escape') {
				event.preventDefault();
				closeReader();
				return;
			}
			const target = event.target;
			if (target?.closest?.('input, textarea, select, [contenteditable="true"], button, a')) return;
			if (event.key === ' ' || event.key === 'Enter') {
				event.preventDefault();
				bump();
			} else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
				event.preventDefault();
				const forward = (event.key === 'ArrowLeft') === ar;
				goTo(safePage + (forward ? 1 : -1));
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [openId, composerOpen, bump, goTo, safePage, ar, closeReader]);

	// The page behind the reader stays put.
	useEffect(() => {
		if (!openId) return undefined;
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = prev;
		};
	}, [openId]);

	const need = current ? Number(current.count) || 1 : 1;
	const taps = current ? Math.min(Number(progress[current.id]) || 0, need) : 0;
	const done = current ? taps >= need : false;
	const isFav = current ? favorites.has(current.id) : false;
	const openStats = openId ? sectionStats[openId] : { total: 0, done: 0 };
	const isComplete = id => sectionStats[id].total > 0 && sectionStats[id].done === sectionStats[id].total;
	// What to read next: the section for this time of day, or the next unfinished one after it.
	const nextUp = isComplete(suggested)
		? DAY_ORDER.slice(DAY_ORDER.indexOf(suggested) + 1).find(id => !isComplete(id)) || null
		: suggested;
	const greeting =
		suggested === 'morning'
			? ar ? 'صباح الخير' : 'Good morning'
			: suggested === 'evening'
				? ar ? 'مساء الخير' : 'Good evening'
				: ar ? 'تصبح على خير' : 'Good night';
	const NextIcon2 = nextUp ? SECTION_ICONS[nextUp] : Check;
	const nextStats = nextUp ? sectionStats[nextUp] : null;
	const nextStarted = nextStats ? nextStats.done > 0 : false;
	const PrevIcon = ar ? ChevronRight : ChevronLeft;
	const NextIcon = ar ? ChevronLeft : ChevronRight;

	const reader = openId ? (
		<div className="adk-reader" dir={ar ? 'rtl' : 'ltr'} role="dialog" aria-modal="true" aria-label={sectionName(openId)}>
			<div className="adk-reader__bar">
				<div className="adk-reader__row">
					<button type="button" className="adk-icon-btn" onClick={closeReader} aria-label={ar ? 'رجوع إلى أذكاري' : 'Back to My Adhkar'} autoFocus>
						<X size={22} aria-hidden />
					</button>
					<div className="adk-reader__title">
						<div className="adk-reader__name">{sectionName(openId)}</div>
						<div className="adk-reader__count">
							{current && !finished
								? ar
									? `${fmt(safePage + 1)} من ${fmt(items.length)} · أتممت ${fmt(openStats.done)}`
									: `${safePage + 1} of ${items.length} · ${openStats.done} done`
								: ar
									? `أتممت ${fmt(openStats.done)} من ${fmt(openStats.total)}`
									: `${openStats.done} of ${openStats.total} done`}
						</div>
					</div>
					{openId === 'custom' ? (
						<button type="button" className="adk-icon-btn" onClick={() => setComposerOpen(true)} aria-label={ar ? 'أضف دعاءً' : 'Add a dua'}>
							<Plus size={22} aria-hidden />
						</button>
					) : null}
					{current && !finished ? (
						current.custom ? (
							<button
								type="button"
								onClick={() => (armedDelete ? removeCustom(current.id) : setArmedDelete(true))}
								onBlur={() => setArmedDelete(false)}
								aria-label={armedDelete ? (ar ? 'اضغط مرة أخرى للحذف' : 'Tap again to delete') : ar ? 'حذف الدعاء' : 'Delete dua'}
								title={armedDelete ? (ar ? 'اضغط مرة أخرى للحذف' : 'Tap again to delete') : ar ? 'حذف' : 'Delete'}
								className={`adk-icon-btn adk-icon-btn--danger ${armedDelete ? 'is-armed' : ''}`}
							>
								<Trash2 size={20} aria-hidden />
							</button>
						) : (
							<button
								type="button"
								onClick={toggleFavorite}
								aria-pressed={isFav}
								aria-label={isFav ? (ar ? 'إزالة من المحفوظ' : 'Remove from saved') : ar ? 'احفظه في المحفوظ' : 'Save'}
								title={isFav ? (ar ? 'إزالة من المحفوظ' : 'Remove from saved') : ar ? 'احفظه في المحفوظ' : 'Save'}
								className={`adk-icon-btn ${isFav ? 'is-on' : ''}`}
							>
								<BookMarked size={21} fill={isFav ? 'currentColor' : 'none'} aria-hidden />
							</button>
						)
					) : null}
				</div>
				<div className="adk-reader__progress" aria-hidden>
					<span style={{ width: `${openStats.total ? (openStats.done / openStats.total) * 100 : 0}%` }} />
				</div>
			</div>

			<div className="adk-reader__scroll">
				<div className="adk-reader__inner">
					<section className="adk-card" aria-live="polite">
						{!current ? (
							<div className="adk-done">
								<span className="adk-done__mark" style={{ background: 'var(--adk-olive)' }}>
									<BookMarked size={30} aria-hidden />
								</span>
								<h2 className="adk-done__title">{ar ? 'لا شيء محفوظ بعد' : 'Nothing saved yet'}</h2>
								<p className="adk-done__sub">
									{ar
										? 'وأنت تقرأ، اضغط علامة الحفظ على أي ذكر تحبه ليظهر هنا، أو أضف دعاءً تكتبه بنفسك. كل ذلك يبقى على جهازك.'
										: 'While reading, tap the bookmark on any dhikr you love to keep it here, or add a dua of your own. It all stays on this device.'}
								</p>
								<div className="adk-done__actions">
									<button type="button" className="adk-btn" onClick={() => setComposerOpen(true)}>
										<Plus size={18} aria-hidden />
										{ar ? 'أضف دعاءً' : 'Add a dua'}
									</button>
								</div>
							</div>
						) : finished ? (
							<div className="adk-done adk-rise">
								<span className="adk-done__mark">
									<Check size={36} strokeWidth={3} aria-hidden />
								</span>
								<h2 className="adk-done__title">{ar ? `أتممت ${sectionName(openId)}` : `${sectionName(openId)} complete`}</h2>
								<p className="adk-done__sub">{ar ? 'تقبّل الله منك، وجعلها في ميزان حسناتك.' : 'May Allah accept it from you.'}</p>
								<div className="adk-done__actions">
									<button type="button" className="adk-btn" onClick={closeReader}>
										<Check size={18} aria-hidden />
										{ar ? 'تمّ، رجوع' : 'Done'}
									</button>
									<button type="button" className="adk-btn adk-btn--quiet" onClick={() => goTo(0)}>
										<BookOpen size={18} aria-hidden />
										{ar ? 'راجع الأذكار' : 'Review'}
									</button>
									<button type="button" className="adk-btn adk-btn--quiet" onClick={resetSection}>
										<RotateCcw size={18} aria-hidden />
										{ar ? 'ابدأ من جديد' : 'Start over'}
									</button>
								</div>
							</div>
						) : (
							<article key={current.id} className={dir > 0 ? 'adk-in-next' : 'adk-in-prev'}>
								<div className="adk-card__body">
									<div className="adk-orn" aria-hidden>
										<span />
										<svg viewBox="0 0 24 24" width="16" height="16">
											<path d="M12 2l2.6 4.2L19 4l-1.4 4.8L22 12l-4.4 3.2L19 20l-4.4-2.2L12 22l-2.6-4.2L5 20l1.4-4.8L2 12l4.4-3.2L5 4l4.4 2.2z" />
										</svg>
										<span />
									</div>
									<div
										role="button"
										tabIndex={0}
										aria-disabled={done || undefined}
										aria-label={
											done
												? ar ? 'اكتمل هذا الذكر' : 'This dhikr is complete'
												: ar ? `اضغط على الذكر مع كل مرة تقرؤه، ${fmt(taps)} من ${fmt(need)}` : `Tap the dhikr each time you say it, ${taps} of ${need}`
										}
										onClick={bump}
										className={`adk-tap ${done ? 'is-done' : ''}`}
									>
										<p className={`adk-text adk-serif ${current.text.length > 260 ? 'is-long' : ''}`} lang="ar" dir="rtl">
											{current.text}
										</p>
									</div>

									<div className={`adk-reps ${done ? 'is-done' : ''}`}>
										{need <= 10 ? (
											<span className="adk-reps__dots" aria-hidden>
												{Array.from({ length: need }, (_, i) => (
													<span key={i} className={i < taps ? 'is-on' : ''} />
												))}
											</span>
										) : (
											<span className="adk-reps__bar" aria-hidden>
												<span style={{ width: `${(taps / need) * 100}%` }} />
											</span>
										)}
										<span className="adk-reps__label" key={`${current.id}-${taps}`}>
											{done ? (
												<>
													<Check size={14} strokeWidth={3} aria-hidden />
													{ar ? 'تمّ' : 'Done'}
												</>
											) : need > 10 ? (
												<span dir="ltr">{fmt(taps)} / {fmt(need)}</span>
											) : (
												repeatLabel(need, ar, fmt)
											)}
										</span>
										{taps > 0 ? (
											<button type="button" className="adk-reps__reset" onClick={resetItem} aria-label={ar ? 'تصفير العدّ' : 'Reset count'} title={ar ? 'تصفير العدّ' : 'Reset count'}>
												<RotateCcw size={14} aria-hidden />
											</button>
										) : null}
									</div>
								</div>

								{/* Benefit and explanation are always shown in Arabic, as written in the source. */}
								<div className="adk-note" dir="rtl" lang="ar">
									<button type="button" className="adk-note__sum" onClick={() => setExpanded(v => !v)} aria-expanded={expanded}>
										<Sparkles size={18} className="adk-note__icon" aria-hidden />
										<span className="adk-note__body">
											<span className="adk-note__label">الفائدة</span>
											<span className="adk-note__text adk-naskh">{current.benefit}</span>
											<span className="adk-note__toggle">
												{expanded ? 'إخفاء الشرح' : 'اقرأ الشرح والمصدر'}
												<ChevronDown size={16} aria-hidden />
											</span>
										</span>
									</button>
									{expanded ? (
										<div className="adk-note__more adk-rise">
											<p className="adk-naskh">{current.explanation}</p>
											<p className="adk-source">
												<BookOpen size={15} aria-hidden style={{ flex: 'none', marginTop: 4 }} />
												<span className="adk-naskh">المصدر: {current.source}</span>
											</p>
										</div>
									) : null}
								</div>

							</article>
						)}
					</section>
				</div>
			</div>

			{current && !finished ? (
				<nav className="adk-dock" aria-label={ar ? 'التنقل بين الأذكار' : 'Move between adhkar'}>
					<button type="button" className="adk-nav__btn" disabled={safePage <= 0} onClick={() => goTo(safePage - 1)}>
						<PrevIcon size={20} aria-hidden />
						{ar ? 'السابق' : 'Previous'}
					</button>
					<span className="adk-nav__kbd">{ar ? 'اضغط الذكر أو المسافة للعدّ · «التالي» يعني أتممته' : 'Tap the text or Space to count · Next marks it done'}</span>
					<button type="button" className="adk-nav__btn adk-nav__btn--next" onClick={completeAndNext}>
						{safePage >= items.length - 1 ? (ar ? 'إنهاء' : 'Finish') : ar ? 'التالي' : 'Next'}
						{safePage >= items.length - 1 ? <Check size={20} aria-hidden /> : <NextIcon size={20} aria-hidden />}
					</button>
				</nav>
			) : null}
		</div>
	) : null;

	return (
		<div className="adk wa-dk" dir={ar ? 'rtl' : 'ltr'}>
			<div className="adk__home">
				<section className="adk-today" aria-label={ar ? 'اليوم' : 'Today'}>
					<div className="adk-top">
						<span className="adk-date">
							{suggested === 'morning' ? <Sunrise size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
							{hijri}
						</span>
						{onExit ? (
							<button type="button" className="adk-icon-btn adk-top__back" onClick={onExit} aria-label={ar ? 'رجوع إلى المحادثات' : 'Back to chats'}>
								<ArrowRight size={21} className={ar ? '' : 'rotate-180'} aria-hidden />
							</button>
						) : null}
					</div>
					<h1 className={`adk-hello ${ar ? 'adk-serif' : 'is-latin'}`}>{greeting}</h1>

					{nextUp ? (
						<button type="button" className="adk-start" onClick={() => openSection(nextUp)}>
							<span className="adk-start__icon">
								<NextIcon2 size={24} aria-hidden />
							</span>
							<span className="adk-start__text">
								<span className="adk-start__title">
									{nextStarted
										? ar ? `أكمل ${sectionName(nextUp)}` : `Continue ${sectionName(nextUp)}`
										: ar ? `ابدأ ${sectionName(nextUp)}` : `Start ${sectionName(nextUp)}`}
								</span>
								<span className="adk-start__sub">
									{nextStarted
										? ar
											? `بقي ${adhkarWord(nextStats.total - nextStats.done, ar, fmt)}`
											: `${nextStats.total - nextStats.done} left`
										: nextUp === suggested
											? ar ? `هذا وقتها · ${adhkarWord(nextStats.total, ar, fmt)}` : `It's their time · ${nextStats.total} adhkar`
											: ar ? `التالي في يومك · ${adhkarWord(nextStats.total, ar, fmt)}` : `Next in your day · ${nextStats.total} adhkar`}
								</span>
							</span>
							{ar ? <ChevronLeft size={22} aria-hidden /> : <ChevronRight size={22} aria-hidden />}
						</button>
					) : (
						<div className="adk-alldone">
							<span className="adk-alldone__mark">
								<Check size={20} strokeWidth={3} aria-hidden />
							</span>
							<span>{ar ? 'أتممت أذكار اليوم، تقبّل الله منك.' : "You completed today's adhkar. May Allah accept it."}</span>
						</div>
					)}

					<div className="adk-day" role="list" aria-label={ar ? 'يومك' : 'Your day'}>
						{DAY_ORDER.map(id => {
							const st = sectionStats[id];
							const complete = isComplete(id);
							const Icon = SECTION_ICONS[id];
							const label = ar ? ADHKAR_SECTIONS.find(x => x.id === id)?.labelAr : ADHKAR_SECTIONS.find(x => x.id === id)?.labelEn;
							return (
								<button
									key={id}
									type="button"
									role="listitem"
									onClick={() => openSection(id)}
									className={`adk-day__item ${complete ? 'is-done' : ''} ${id === nextUp ? 'is-next' : ''}`}
								>
									<span className="adk-day__icon">{complete ? <Check size={15} strokeWidth={3} aria-hidden /> : <Icon size={15} aria-hidden />}</span>
									<span className="adk-day__label">{label}</span>
									<span className="adk-day__count">{`${fmt(st.done)}/${fmt(st.total)}`}</span>
								</button>
							);
						})}
					</div>
				</section>

				<h2 className="adk-h2">
					{ar ? 'الأذكار' : 'Adhkar'}
					<span className="adk-h2__aside">{ar ? 'اختر قسمًا لتقرأه ذكرًا ذكرًا' : 'Pick one to read, one dhikr at a time'}</span>
				</h2>
				<div className="adk-list">
					{ADHKAR_SECTIONS.map(section => {
						const Icon = SECTION_ICONS[section.id] || BookOpen;
						const st = sectionStats[section.id];
						const complete = isComplete(section.id);
						const pct = st.total ? st.done / st.total : 0;
						const r = 15;
						const circ = 2 * Math.PI * r;
						return (
							<button
								key={section.id}
								type="button"
								onClick={() => openSection(section.id)}
								className={`adk-row ${complete ? 'is-done' : ''}`}
							>
								<span className="adk-row__icon">
									<Icon size={22} aria-hidden />
								</span>
								<span className="adk-row__text">
									<span className="adk-row__name">{sectionName(section.id)}</span>
									<span className="adk-row__meta">
										{section.id === 'custom' && !st.total
											? ar ? 'أدعيتك وما حفظته أثناء القراءة' : 'Your duas and bookmarks'
											: complete
												? ar ? `تمّت · ${adhkarWord(st.total, ar, fmt)}` : `Done · ${st.total} adhkar`
												: st.done
													? ar ? `أتممت ${fmt(st.done)} من ${fmt(st.total)}` : `${st.done} of ${st.total} done`
													: adhkarWord(st.total, ar, fmt)}
									</span>
								</span>
								{st.total ? (
									<span className="adk-mini" aria-hidden>
										<svg viewBox="0 0 36 36" className="adk-mini__ring">
											<circle className="adk-mini__track" cx="18" cy="18" r={r} />
											<circle className="adk-mini__fill" cx="18" cy="18" r={r} strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} />
										</svg>
										{complete ? <Check size={14} strokeWidth={3} /> : null}
									</span>
								) : (
									<span className="adk-row__add" aria-hidden>
										<Plus size={18} />
									</span>
								)}
								{ar ? <ChevronLeft size={18} className="adk-row__chev" aria-hidden /> : <ChevronRight size={18} className="adk-row__chev" aria-hidden />}
							</button>
						);
					})}
				</div>

				<h2 className="adk-h2">
					{ar ? 'إحصائياتك' : 'Your stats'}
					<span className="adk-h2__aside">{ar ? 'على هذا الجهاز' : 'On this device'}</span>
				</h2>
				<div className="adk-stats">
					<div className="adk-nums">
						<div className="adk-num">
							<span className="adk-num__label">
								<CalendarCheck size={15} aria-hidden />
								{ar ? 'اليوم' : 'Today'}
							</span>
							<span className="adk-num__value">
								{fmt(todayDone)}
								<span className="adk-num__unit">{ar ? 'ذكر' : 'done'}</span>
							</span>
						</div>
						<div className="adk-num">
							<span className="adk-num__label">
								<Flame size={15} aria-hidden />
								{ar ? 'أيام متتالية' : 'Day streak'}
							</span>
							<span className="adk-num__value">
								{fmt(streak)}
								<span className="adk-num__unit">{ar ? 'يوم' : streak === 1 ? 'day' : 'days'}</span>
							</span>
						</div>
						<div className="adk-num">
							<span className="adk-num__label">
								<BarChart3 size={15} aria-hidden />
								{ar ? 'آخر 7 أيام' : 'Last 7 days'}
							</span>
							<span className="adk-num__value">
								{fmt(weekDone)}
								<span className="adk-num__unit">{ar ? 'ذكر' : 'done'}</span>
							</span>
						</div>
					</div>

					<div className="adk-week">
						<p className="adk-week__title">{ar ? 'الأذكار التي أتممتها كل يوم' : 'Adhkar completed each day'}</p>
						<div className="adk-week__bars" role="img" aria-label={week.map(d => `${dayFmt.format(new Date(`${d.day}T12:00:00Z`))}: ${d.done}`).join('، ')}>
							{week.map(d => (
								<div key={d.day} className="adk-week__col">
									<span className="adk-week__val">{d.done ? fmt(d.done) : ''}</span>
									<span
										className={`adk-week__bar ${d.today ? 'is-today' : d.done ? 'is-on' : ''}`}
										style={{ height: `${Math.max(4, (d.done / weekMax) * 92)}px` }}
									/>
									<span className={`adk-week__day ${d.today ? 'is-today' : ''}`}>{d.today ? (ar ? 'اليوم' : 'Today') : dayFmt.format(new Date(`${d.day}T12:00:00Z`))}</span>
								</div>
							))}
						</div>
					</div>
				</div>
				<p className="adk-hint">
					{ar
						? 'اليوم الذي تُتمّ فيه أذكار الصباح أو المساء كاملة يُحسب في الأيام المتتالية.'
						: 'A day counts toward your streak when you finish all the morning or evening adhkar.'}
				</p>
			</div>

			{mounted && reader ? createPortal(reader, document.body) : null}

			{composerOpen && mounted
				? createPortal(
						<div className="adk-sheet" role="presentation" onClick={() => setComposerOpen(false)} dir={ar ? 'rtl' : 'ltr'}>
							<div
								role="dialog"
								aria-modal="true"
								aria-label={ar ? 'دعاء جديد' : 'New dua'}
								onClick={event => event.stopPropagation()}
								onKeyDown={event => event.key === 'Escape' && setComposerOpen(false)}
								className="adk-sheet__panel"
							>
								<div className="mb-4 flex items-center justify-between gap-3">
									<h2 className="text-lg font-extrabold" style={{ color: 'var(--adk-ink)' }}>
										{ar ? 'دعاء جديد' : 'New dua'}
									</h2>
									<button type="button" onClick={() => setComposerOpen(false)} className="adk-icon-btn" aria-label={ar ? 'إغلاق' : 'Close'}>
										<X size={20} aria-hidden />
									</button>
								</div>
								<form className="flex flex-col gap-3.5" onSubmit={addCustom}>
									<label className="adk-field">
										<span>{ar ? 'نص الدعاء' : 'Dua text'}</span>
										<textarea
											value={draftText}
											onChange={event => setDraftText(event.target.value)}
											rows={4}
											required
											autoFocus
											dir="auto"
											placeholder={ar ? 'اكتب الدعاء هنا…' : 'Write the dua here…'}
											className="adk-input"
										/>
									</label>
									<div className="grid grid-cols-2 gap-3">
										<label className="adk-field">
											<span>{ar ? 'مرات التكرار' : 'Repetitions'}</span>
											<input
												inputMode="numeric"
												value={draftCount}
												onChange={event => setDraftCount(event.target.value.replace(/[^\d]/g, ''))}
												className="adk-input tabular-nums"
											/>
										</label>
										<label className="adk-field">
											<span>{ar ? 'فائدته (اختياري)' : 'Its benefit (optional)'}</span>
											<input value={draftNote} onChange={event => setDraftNote(event.target.value)} maxLength={160} className="adk-input" />
										</label>
									</div>
									<button type="submit" disabled={!draftText.trim()} className="adk-btn mt-1 w-full">
										<Check size={18} aria-hidden />
										{ar ? 'حفظ الدعاء' : 'Save dua'}
									</button>
								</form>
							</div>
						</div>,
						document.body,
					)
				: null}
		</div>
	);
}
