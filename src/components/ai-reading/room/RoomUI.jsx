'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocale } from 'next-intl';
import { uiFontFamily } from '@/lib/ai-reading/fonts';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, ChevronDown, Clock3, Gauge, MoreHorizontal, PenLine, Plus, Trash2 } from 'lucide-react';
import { getPrefs, savePrefs } from '@/lib/ai-reading/storage';
import { DEFAULT_WPM, WPM_MAX, WPM_MIN, clampWpm, formatCount, formatMinutes, getBookMeasure, minutesFor, wordsLeft, wpmFor } from '@/lib/ai-reading/book-stats';

/** `ar` flag plus a tiny picker for the two UI languages. */
export function useRoomLang() {
	const ar = String(useLocale() || '').toLowerCase().startsWith('ar');
	return { ar, L: (arText, enText) => (ar ? arText : enText) };
}

/* Deep, bookish two-tone covers. Picked from the book id, so a book keeps its colour everywhere. */
const COVERS = [
	['#2b3a55', '#3e5274'],
	['#1f4d43', '#2d6b5c'],
	['#6b2d2a', '#8c3d36'],
	['#7a5a1e', '#9d7529'],
	['#4a3358', '#654679'],
	['#33393f', '#4c545c'],
	['#7b3f22', '#a1562f'],
	['#264653', '#30606f'],
];

function hashId(id = '') {
	let h = 0;
	for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
	return h;
}

export function coverColors(book) {
	return COVERS[hashId(String(book?.id || book?.title || '')) % COVERS.length];
}

/** A forward arrow that points the reading direction (left in Arabic). */
export function DirArrow({ size = 16, className = '' }) {
	const { ar } = useRoomLang();
	return <ArrowRight size={size} className={className} style={ar ? { transform: 'scaleX(-1)' } : undefined} aria-hidden />;
}

/** Arabic counted noun: 1 → one, 2 → two, 3–10 → plural, 11+ → singular. */
export function arCount(n, { one, two, few, many }) {
	if (n === 1) return one;
	if (n === 2) return two;
	if (n >= 3 && n <= 10) return `${n} ${few}`;
	return `${n} ${many}`;
}
const CARDS = { one: 'بطاقة واحدة', two: 'بطاقتين', few: 'بطاقات', many: 'بطاقة' };
const BOOKS = { one: 'كتاب واحد', two: 'كتابين', few: 'كتب', many: 'كتاب' };
export const arCards = n => arCount(n, CARDS);
export const arBooks = n => arCount(n, BOOKS);

export function bookPercent(book) {
	return Math.max(0, Math.min(100, Math.round(book?.progress?.percent || 0)));
}

/**
 * A book cover. `detailed` puts everything a shelf needs on the cover itself — size, reading time
 * and progress — so nothing has to repeat underneath.
 */
export function BookCover({ book, detailed = false, className = '' }) {
	const { ar, L } = useRoomLang();
	const { wpm } = useReadingSpeed();
	const [c1, c2] = coverColors(book);
	const pct = bookPercent(book);
	const timing = detailed ? bookTiming(book, wpm) : null;
	const compact = n => new Intl.NumberFormat(ar ? 'ar-EG-u-nu-latn' : 'en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
	return (
		<div className={`rr-cover-wrap ${className}`}>
			<div className={`rr-cover ${detailed ? 'is-detailed' : ''}`} style={{ background: `linear-gradient(155deg, ${c1}, ${c2})` }}>
				<div className="rr-cover-inner">
					<span className="rr-cover-rule" />
					<p className="rr-cover-title" dir="auto">{book.title}</p>
					{timing ? (
						<div className="rr-cover-meta">
							{timing.measure.words ? (
								<p className="tabular-nums">
									{compact(timing.measure.words)} {L('كلمة', 'words')} · {compact(timing.measure.letters)} {L('حرف', 'letters')}
								</p>
							) : null}
							{timing.total ? (
								<p className="flex items-center gap-1 tabular-nums">
									<Clock3 className="rr-cover-icon" aria-hidden />
									{pct > 0 && pct < 100 ? L(`فاضل ${formatMinutes(timing.left, true)}`, `${formatMinutes(timing.left, false)} left`) : formatMinutes(timing.total, ar)}
								</p>
							) : null}
							<div className="rr-cover-progress">
								<span className="rr-cover-track" aria-hidden>
									<span style={{ width: `${pct}%` }} />
								</span>
								<span className="shrink-0 tabular-nums">
									{pct >= 100 ? <Check className="rr-cover-icon" strokeWidth={3} aria-label={L('انتهيت', 'Finished')} /> : `${pct}%`}
								</span>
							</div>
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}

function useOutside(ref, open, onClose) {
	useEffect(() => {
		if (!open) return undefined;
		const onDown = e => {
			if (!ref.current?.contains(e.target)) onClose();
		};
		const onKey = e => {
			if (e.key === 'Escape') onClose();
		};
		document.addEventListener('pointerdown', onDown);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('pointerdown', onDown);
			document.removeEventListener('keydown', onKey);
		};
	}, [ref, open, onClose]);
}

/** A book on a shelf: one cover carrying its title, size, time and progress. */
export function BookTile({ book, onOpen, onRename, onDelete }) {
	const { L } = useRoomLang();
	const [menu, setMenu] = useState(false);
	const menuRef = useRef(null);
	useOutside(menuRef, menu, () => setMenu(false));
	const pct = bookPercent(book);
	const hasMenu = Boolean(onRename || onDelete);

	return (
		<div className="group relative min-w-0">
			<button type="button" className="rr-book" onClick={() => onOpen?.(book.id)} aria-label={`${book.title} — ${pct}%`}>
				<BookCover book={book} detailed />
			</button>
			{hasMenu && (
				<div ref={menuRef} className="pointer-events-none absolute inset-x-1.5 top-1.5 z-10 flex justify-end">
					<button
						type="button"
						onClick={() => setMenu(v => !v)}
						className="pointer-events-auto grid size-8 place-items-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/55 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
						style={menu ? { opacity: 1 } : undefined}
						aria-label={L('خيارات الكتاب', 'Book options')}
						aria-expanded={menu}
					>
						<MoreHorizontal size={16} />
					</button>
					<AnimatePresence>
						{menu && (
							<motion.div
								initial={{ opacity: 0, y: -4, scale: 0.97 }}
								animate={{ opacity: 1, y: 0, scale: 1 }}
								exit={{ opacity: 0, y: -4, scale: 0.97 }}
								transition={{ duration: 0.14 }}
								className="rr-menu pointer-events-auto absolute inset-x-0 top-full mt-1.5 min-w-0"
								role="menu"
							>
								{onRename && (
									<button type="button" role="menuitem" className="rr-menu-item" onClick={() => { setMenu(false); onRename(book); }}>
										<PenLine size={15} /> {L('إعادة تسمية', 'Rename')}
									</button>
								)}
								{onDelete && (
									<button type="button" role="menuitem" className="rr-menu-item is-danger" onClick={() => { setMenu(false); onDelete(book); }}>
										<Trash2 size={15} /> {L('حذف', 'Delete')}
									</button>
								)}
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			)}
		</div>
	);
}

/** Same footprint as a cover: start an import from the end of a shelf. */
export function AddBookTile({ onClick }) {
	const { L } = useRoomLang();
	return (
		<div className="min-w-0">
			<button type="button" onClick={onClick} className="rr-add-tile">
				<span className="rr-add-icon"><Plus size={20} /></span>
				<span className="text-[14px] font-semibold">{L('أضف كتابًا', 'Add a book')}</span>
				<span className="text-[12px] rr-faint">{L('نص، لينك أو ملف', 'Text, link or file')}</span>
			</button>
		</div>
	);
}

export function PageHeader({ eyebrow, title, subtitle, actions }) {
	return (
		<header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
			<div className="min-w-0">
				{eyebrow ? <p className="rr-eyebrow mb-2">{eyebrow}</p> : null}
				<h1 className="rr-display">{title}</h1>
				{subtitle ? <p className="mt-2 max-w-xl text-[15px] leading-relaxed rr-muted">{subtitle}</p> : null}
			</div>
			{actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
		</header>
	);
}

export function EmptyState({ icon: Icon, title, body, action }) {
	return (
		<div className="flex flex-col items-center px-6 py-16 text-center sm:py-20">
			{Icon ? (
				<span className="mb-5 grid size-16 place-items-center rounded-full" style={{ background: 'var(--rr-accent-soft)', color: 'var(--rr-accent)' }}>
					<Icon size={26} strokeWidth={1.8} />
				</span>
			) : null}
			<p className="rr-serif text-[22px] font-medium">{title}</p>
			{body ? <p className="mt-2 max-w-sm text-[14.5px] leading-relaxed rr-muted">{body}</p> : null}
			{action ? <div className="mt-6">{action}</div> : null}
		</div>
	);
}

export function Switch({ checked, onChange, label, hint }) {
	return (
		<button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center gap-3 text-start">
			<span className="min-w-0 flex-1">
				<span className="block text-[14px] font-semibold">{label}</span>
				{hint ? <span className="mt-0.5 block text-[12.5px] rr-faint">{hint}</span> : null}
			</span>
			<span className="rr-switch" aria-checked={checked} />
		</button>
	);
}

/**
 * Rendered on <body>: inside the WhatsApp pane an ancestor traps position:fixed, which pushed the sheet
 * under the bottom bar. The portal root re-applies the room tokens, direction and font.
 */
export function Dialog({ open, onClose, children, labelledBy }) {
	const { ar } = useRoomLang();
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	useEffect(() => {
		if (!open) return undefined;
		const onKey = e => e.key === 'Escape' && onClose();
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [open, onClose]);
	if (!mounted) return null;
	return createPortal(
		<div className="rr rr-portal" dir={ar ? 'rtl' : 'ltr'} style={{ fontFamily: uiFontFamily(ar ? 'ar' : 'en') }}>
		<AnimatePresence>
			{open && (
				<motion.div className="rr-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onPointerDown={e => e.target === e.currentTarget && onClose()}>
					<motion.div
						role="dialog"
						aria-modal="true"
						aria-labelledby={labelledBy}
						className="rr-dialog"
						initial={{ opacity: 0, y: 18, scale: 0.98 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 12, scale: 0.98 }}
						transition={{ type: 'spring', stiffness: 380, damping: 32 }}
					>
						{children}
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
		</div>,
		document.body,
	);
}

export function ConfirmDeleteDialog({ book, onCancel, onConfirm }) {
	const { L } = useRoomLang();
	return (
		<Dialog open={Boolean(book)} onClose={onCancel} labelledBy="rr-del-title">
			<span className="mb-4 grid size-11 place-items-center rounded-full" style={{ background: 'var(--rr-danger-soft)', color: 'var(--rr-danger)' }}>
				<Trash2 size={19} />
			</span>
			<h2 id="rr-del-title" className="rr-serif text-[21px] font-medium">{L('حذف هذا الكتاب؟', 'Delete this book?')}</h2>
			<p className="mt-2 text-[14px] leading-relaxed rr-muted">
				<span className="font-semibold" style={{ color: 'var(--rr-ink)' }} dir="auto">{book?.title}</span>{' '}
				{L('هيتشال من مكتبتك هو وملاحظاته وتظليلاته. مش هتقدر ترجعه.', 'will be removed with its notes and highlights. This can’t be undone.')}
			</p>
			<div className="mt-6 flex justify-end gap-2">
				<button type="button" className="rr-btn rr-btn-ghost" onClick={onCancel}>{L('إلغاء', 'Cancel')}</button>
				<button type="button" className="rr-btn rr-btn-danger" onClick={onConfirm}>{L('حذف', 'Delete')}</button>
			</div>
		</Dialog>
	);
}

export function RenameDialog({ book, onCancel, onSave }) {
	const { L } = useRoomLang();
	const [value, setValue] = useState('');
	useEffect(() => {
		if (book) setValue(book.title || '');
	}, [book]);
	const clean = value.trim();
	return (
		<Dialog open={Boolean(book)} onClose={onCancel} labelledBy="rr-ren-title">
			<form
				onSubmit={e => {
					e.preventDefault();
					if (clean) onSave(clean);
				}}
			>
				<h2 id="rr-ren-title" className="rr-serif text-[21px] font-medium">{L('إعادة تسمية الكتاب', 'Rename book')}</h2>
				<input autoFocus dir="auto" className="rr-field mt-4" value={value} onChange={e => setValue(e.target.value)} aria-label={L('اسم الكتاب', 'Book title')} />
				<div className="mt-6 flex justify-end gap-2">
					<button type="button" className="rr-btn rr-btn-ghost" onClick={onCancel}>{L('إلغاء', 'Cancel')}</button>
					<button type="submit" className="rr-btn rr-btn-primary" disabled={!clean || clean === book?.title}>{L('حفظ', 'Save')}</button>
				</div>
			</form>
		</Dialog>
	);
}

const SPEED_EVENT = 'ai-reading:speed';

/** The reader's words-per-minute, per language; shared by the library, home and the reader. */
export function useReadingSpeed() {
	const [prefs, setPrefs] = useState(() => getPrefs());
	useEffect(() => {
		const sync = () => setPrefs(getPrefs());
		window.addEventListener(SPEED_EVENT, sync);
		return () => window.removeEventListener(SPEED_EVENT, sync);
	}, []);
	const setWpm = (lang, value) => {
		const current = getPrefs().wpm || {};
		const next = { ...current, [lang]: clampWpm(value, DEFAULT_WPM[lang]) };
		savePrefs({ wpm: next });
		window.dispatchEvent(new Event(SPEED_EVENT));
	};
	const reset = () => {
		savePrefs({ wpm: {} });
		window.dispatchEvent(new Event(SPEED_EVENT));
	};
	return { prefs, setWpm, reset, wpm: lang => wpmFor(lang, prefs) };
}

/** Real size of a book: words · letters, and the time it takes at the reader's speed. */
export function bookTiming(book, wpm) {
	const m = getBookMeasure(book);
	const speed = wpm(m.language);
	return {
		measure: m,
		total: minutesFor(m.words, speed),
		left: minutesFor(wordsLeft(m, book?.progress), speed),
	};
}

export function BookSize({ book, className = '' }) {
	const { ar, L } = useRoomLang();
	const { wpm } = useReadingSpeed();
	const { measure, total } = bookTiming(book, wpm);
	if (!measure.words) return null;
	const compact = n => new Intl.NumberFormat(ar ? 'ar-EG-u-nu-latn' : 'en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
	const lang = ar ? 'ar' : 'en';
	const full = `${formatCount(measure.words, lang)} ${L('كلمة', 'words')} · ${formatCount(measure.letters, lang)} ${L('حرف', 'letters')}`;
	return (
		<p className={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] tabular-nums rr-faint ${className}`} title={full}>
			<span>{compact(measure.words)} {L('كلمة', 'words')}</span>
			<span aria-hidden>·</span>
			<span>{compact(measure.letters)} {L('حرف', 'letters')}</span>
			<span aria-hidden>·</span>
			<span className="inline-flex items-center gap-1"><Clock3 size={11} aria-hidden /> {formatMinutes(total, ar)}</span>
		</p>
	);
}

const SPEED_PRESETS = {
	ar: [[120, 'هادئ', 'Relaxed'], [160, 'متوسط', 'Average'], [220, 'سريع', 'Fast']],
	en: [[180, 'هادئ', 'Relaxed'], [238, 'متوسط', 'Average'], [320, 'سريع', 'Fast']],
};

/** Popover to set reading speed for Arabic and English books. */
export function ReadingSpeedControl() {
	const { ar, L } = useRoomLang();
	const { wpm, setWpm, reset } = useReadingSpeed();
	const [open, setOpen] = useState(false);
	const ref = useRef(null);
	useOutside(ref, open, () => setOpen(false));
	const row = (lang, label) => (
		<div className="space-y-2">
			<div className="flex items-center justify-between gap-3">
				<span className="text-[13px] font-semibold">{label}</span>
				<label className="flex items-center gap-1.5 text-[12px] rr-faint">
					<input
						type="number"
						min={WPM_MIN}
						max={WPM_MAX}
						step={10}
						value={wpm(lang)}
						onChange={e => setWpm(lang, e.target.value)}
						className="rr-field h-8 w-[72px] px-2 py-0 text-center text-[13px] tabular-nums"
						aria-label={L(`كلمة في الدقيقة — ${label}`, `Words per minute — ${label}`)}
					/>
					{L('كلمة/د', 'wpm')}
				</label>
			</div>
			<div className="grid grid-cols-3 gap-1">
				{SPEED_PRESETS[lang].map(([v, a, e]) => (
					<button
						key={v}
						type="button"
						onClick={() => setWpm(lang, v)}
						className="rounded-lg py-1.5 text-[12px] font-semibold transition"
						style={wpm(lang) === v ? { background: 'var(--rr-accent)', color: 'var(--rr-accent-ink)' } : { background: 'var(--rr-sunken)', color: 'var(--rr-ink-2)' }}
					>
						{L(a, e)} <span className="opacity-70">{v}</span>
					</button>
				))}
			</div>
		</div>
	);
	return (
		<div ref={ref} className="relative">
			<button type="button" className="rr-btn rr-btn-quiet h-10" onClick={() => setOpen(v => !v)} aria-expanded={open}>
				<Gauge size={16} /> <span className="hidden sm:inline">{L('سرعة القراءة', 'Reading speed')}</span>
			</button>
			<AnimatePresence>
				{open && (
					<motion.div
						initial={{ opacity: 0, y: -4 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -4 }}
						transition={{ duration: 0.14 }}
						/* Phones: the button starts the actions row, so open inward from its start edge. Larger screens: the row sits at the end of the header. */
						className="rr-menu absolute start-0 top-full z-30 mt-2 w-[min(19rem,calc(100vw-2rem))] space-y-4 p-4 sm:start-auto sm:end-0"
					>
						<div>
							<p className="text-[14px] font-semibold">{L('سرعة القراءة', 'Reading speed')}</p>
							<p className="mt-0.5 text-[12px] leading-relaxed rr-faint">{L('أوقات القراءة بتتحسب من عدد كلمات كل كتاب على السرعة دي.', 'Reading times use each book’s word count at this speed.')}</p>
						</div>
						{row('ar', L('الكتب العربية', 'Arabic books'))}
						{row('en', L('الكتب الإنجليزي', 'English books'))}
						<button type="button" onClick={reset} className="text-[12px] font-semibold" style={{ color: 'var(--rr-accent)' }}>
							{L(`رجّع الافتراضي (${DEFAULT_WPM.ar} / ${DEFAULT_WPM.en})`, `Reset to default (${DEFAULT_WPM.ar} / ${DEFAULT_WPM.en})`)}
						</button>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

/**
 * The room's dropdown: a pill that shows the current choice and opens a small list under it.
 * Keyboard: Enter/Space/↓ opens, ↑/↓ move, Enter picks, Esc closes.
 */
export function Dropdown({ value, options, onChange, label, icon: Icon, className = '' }) {
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(0);
	const ref = useRef(null);
	const listRef = useRef(null);
	useOutside(ref, open, () => setOpen(false));
	const current = options.find(o => o.value === value) || options[0];

	useEffect(() => {
		if (!open) return;
		setActive(Math.max(0, options.findIndex(o => o.value === value)));
		requestAnimationFrame(() => listRef.current?.focus());
	}, [open, options, value]);

	const pick = opt => {
		onChange(opt.value);
		setOpen(false);
	};
	const onListKey = e => {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			setActive(i => (i + 1) % options.length);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			setActive(i => (i - 1 + options.length) % options.length);
		} else if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			pick(options[active]);
		} else if (e.key === 'Tab') {
			setOpen(false);
		}
	};

	return (
		<div ref={ref} className={`relative ${className}`}>
			<button
				type="button"
				onClick={() => setOpen(v => !v)}
				onKeyDown={e => {
					if (e.key === 'ArrowDown') {
						e.preventDefault();
						setOpen(true);
					}
				}}
				className="rr-dropdown-btn"
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-label={label ? `${label}: ${current?.label}` : undefined}
			>
				{Icon ? <Icon size={15} className="shrink-0 rr-faint" aria-hidden /> : null}
				<span className="min-w-0 truncate">{current?.label}</span>
				<ChevronDown size={15} className="shrink-0 rr-faint transition-transform" style={open ? { transform: 'rotate(180deg)' } : undefined} aria-hidden />
			</button>
			<AnimatePresence>
				{open && (
					<motion.ul
						ref={listRef}
						tabIndex={-1}
						role="listbox"
						aria-label={label}
						aria-activedescendant={`rr-opt-${options[active]?.value}`}
						onKeyDown={onListKey}
						initial={{ opacity: 0, y: -4, scale: 0.98 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: -4, scale: 0.98 }}
						transition={{ duration: 0.14 }}
						className="rr-menu absolute end-0 top-full z-30 mt-2 w-max min-w-full max-w-[min(18rem,calc(100vw-2rem))] outline-none"
					>
						{label ? <li className="px-2.5 pb-1 pt-1.5 text-[11.5px] font-semibold rr-faint" role="presentation">{label}</li> : null}
						{options.map((opt, i) => {
							const selected = opt.value === value;
							return (
								<li
									key={opt.value}
									id={`rr-opt-${opt.value}`}
									role="option"
									aria-selected={selected}
									onPointerEnter={() => setActive(i)}
									onClick={() => pick(opt)}
									className="rr-menu-item cursor-pointer"
									style={i === active ? { background: 'var(--rr-sunken)' } : undefined}
								>
									<span className="min-w-0 flex-1 truncate" style={selected ? { fontWeight: 600 } : undefined}>{opt.label}</span>
									{selected ? <Check size={15} style={{ color: 'var(--rr-accent)' }} aria-hidden /> : <span className="w-[15px]" aria-hidden />}
								</li>
							);
						})}
					</motion.ul>
				)}
			</AnimatePresence>
		</div>
	);
}
