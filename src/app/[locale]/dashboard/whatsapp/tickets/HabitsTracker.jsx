'use client';

/*
 * Habits: a 14-day tracker for the things you do every day (Quran, remembrance, English…).
 * One row per habit, one box per day; today's column is lit up. Each habit keeps its streak
 * and how often you kept it. Motivation cards sit on top.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
	Archive,
	ArchiveRestore,
	BellOff,
	CalendarDays,
	Check,
	ChevronLeft,
	ChevronRight,
	ExternalLink,
	Flame,
	GripVertical,
	ListChecks,
	MoreHorizontal,
	Pause,
	Pencil,
	Pin,
	PinOff,
	Play,
	Plus,
	Target,
	SkipForward,
	Sparkles,
	Trash2,
	Undo2,
	X,
} from 'lucide-react';
import {
	CARD_TONES,
	HABIT_COLORS,
	HABIT_ICONS,
	activeHabits,
	adherence,
	addDays,
	bestStreak,
	cardOfDay,
	clearDay,
	dayState,
	habitFromTicket,
	isPaused,
	newHabit,
	parseDay,
	pause,
	planWindow,
	progressOn,
	resume,
	skipDay,
	snooze,
	streak,
	toggleDay,
	toggleSub,
	todaySummary,
	hid,
} from './habits-model';
import { useHabits } from './use-habits';
import { langClass, useTicketFonts } from './tickets-ui';
import { cardArabicFont, cardLatinFont } from './habit-card-fonts';
import HabitTimer from './HabitTimer';

/** Four motivation cards fill the row; replace one to add another. */
const MAX_CARDS = 4;
const isArabic = text => /[؀-ۿ]/.test(String(text || ''));
const cardTextClass = text => `hb-card__text ${isArabic(text) ? 'is-ar' : 'is-en'}`;
import './habits.css';
import './habits-v2.css';
import './habits-v3.css';
import './habits-v4.css';

const T = {
	en: {
		habit: 'Habit',
		today: 'Today',
		newHabit: 'New habit',
		editHabit: 'Edit habit',
		todayDone: (d, n) => `${d} of ${n} today`,
		bestStreak: 'Best streak now',
		days: n => (n === 1 ? '1 day' : `${n} days`),
		thisPlan: 'These 14 days',
		dayDone: 'Each day',
		emptyTitle: 'Build habits that stick',
		emptyPoints: ['A box for every day of the next 2 weeks', 'Streaks that grow as you keep going', 'Skip or pause without losing your chain'],
		prev: 'Previous 2 weeks',
		next: 'Next 2 weeks',
		backToday: 'Today',
		empty: 'Track the things you do every day — Quran, remembrance, 15 minutes of English…',
		importTickets: n => `Start from your ${n} daily tickets`,
		streak: n => `${n}-day streak`,
		kept: p => (p == null ? 'new' : `${p}% kept`),
		menu: 'Options',
		edit: 'Edit',
		pin: 'Pin to top',
		unpin: 'Unpin',
		snooze: 'Snooze',
		snoozeFor: { 1: 'Until tomorrow', 3: 'For 3 days', 7: 'For a week' },
		unsnooze: 'Wake up',
		pause: 'Pause',
		resume: 'Resume',
		archive: 'Archive',
		restore: 'Restore',
		delete: 'Delete',
		confirmDelete: t => `Delete “${t}” and its history?`,
		deleted: t => `Deleted “${t}”`,
		undo: 'Undo',
		paused: 'Paused',
		snoozedTill: d => `Snoozed till ${d}`,
		archived: n => `Archived (${n})`,
		markDone: 'Done',
		markUndone: 'Not done',
		skip: 'Skip this day',
		unskip: 'Undo skip',
		clear: 'Clear',
		allSubs: 'Mark all done',
		state: { done: 'Done', partial: 'Started', skip: 'Skipped', rest: 'Rest day', off: 'Not planned', missed: 'Missed', open: 'Not yet' },
		openLink: 'Open link',
		dragToReorder: 'Drag to reorder',
		// dialog
		name: 'Name',
		namePh: 'e.g. Read Quran',
		icon: 'Icon',
		color: 'Color',
		link: 'Link (YouTube, website…)',
		linkPh: 'https://…',
		repeat: 'Repeat',
		repeatDaily: 'Every day',
		repeatDays: 'Some days',
		repeatEvery: 'Every few days',
		everyN: 'Every',
		daysWord: 'days',
		start: 'Starts',
		tomorrow: 'Tomorrow',
		pickDate: 'Pick a date',
		end: 'Ends',
		never: 'Never',
		subtasks: 'Subtasks',
		subtaskPh: 'Add a subtask…',
		notes: 'Notes',
		notesPh: 'Anything to remember about this habit…',
		save: 'Save',
		create: 'Add habit',
		cancel: 'Cancel',
		weekdaysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
		// cards
		cards: 'Keep going',
		addCard: 'Add a motivation card',
		cardPh: 'Write something that keeps you going…',
		cardOfDay: 'For today',
	},
	ar: {
		habit: 'العادة',
		today: 'النهارده',
		newHabit: 'عادة جديدة',
		editHabit: 'تعديل العادة',
		todayDone: (d, n) => `${d} من ${n} النهارده`,
		bestStreak: 'أطول سلسلة حالياً',
		days: n => (n === 1 ? 'يوم' : n === 2 ? 'يومين' : n <= 10 ? `${n} أيام` : `${n} يوم`),
		thisPlan: 'الـ ١٤ يوم دول',
		dayDone: 'كل يوم',
		emptyTitle: 'ابني عادات بتفضل معاك',
		emptyPoints: ['مربع لكل يوم في الأسبوعين الجايين', 'سلسلة بتكبر كل ما تكمّل', 'تخطّى أو وقّف من غير ما سلسلتك تتقطع'],
		prev: 'الأسبوعين اللي فاتوا',
		next: 'الأسبوعين الجايين',
		backToday: 'النهارده',
		empty: 'تابع الحاجات اللي بتعملها كل يوم — القرآن، الأذكار، ١٥ دقيقة إنجليزي…',
		importTickets: n => `ابدأ من تذاكرك اليومية (${n})`,
		streak: n => `${n} يوم ورا بعض`,
		kept: p => (p == null ? 'جديدة' : `التزام ${p}٪`),
		menu: 'خيارات',
		edit: 'تعديل',
		pin: 'تثبيت فوق',
		unpin: 'إلغاء التثبيت',
		snooze: 'تأجيل',
		snoozeFor: { 1: 'لبكره', 3: '٣ أيام', 7: 'أسبوع' },
		unsnooze: 'إلغاء التأجيل',
		pause: 'إيقاف مؤقت',
		resume: 'استئناف',
		archive: 'أرشفة',
		restore: 'استرجاع',
		delete: 'حذف',
		confirmDelete: t => `حذف «${t}» وكل تاريخها؟`,
		deleted: t => `اتحذفت «${t}»`,
		undo: 'تراجع',
		paused: 'متوقفة',
		snoozedTill: d => `مؤجلة لحد ${d}`,
		archived: n => `الأرشيف (${n})`,
		markDone: 'خلصتها',
		markUndone: 'لسه',
		skip: 'تخطي اليوم ده',
		unskip: 'إلغاء التخطي',
		clear: 'مسح',
		allSubs: 'علّم الكل',
		state: { done: 'خلصت', partial: 'بدأت', skip: 'متخطي', rest: 'راحة', off: 'مش مطلوبة', missed: 'فاتت', open: 'لسه' },
		openLink: 'افتح اللينك',
		dragToReorder: 'اسحب لتغيير الترتيب',
		name: 'الاسم',
		namePh: 'مثلاً: قراءة القرآن',
		icon: 'الأيقونة',
		color: 'اللون',
		link: 'لينك (يوتيوب، موقع…)',
		linkPh: 'https://…',
		repeat: 'التكرار',
		repeatDaily: 'كل يوم',
		repeatDays: 'أيام معينة',
		repeatEvery: 'كل كام يوم',
		everyN: 'كل',
		daysWord: 'أيام',
		start: 'تبدأ',
		tomorrow: 'بكره',
		pickDate: 'اختار تاريخ',
		end: 'تنتهي',
		never: 'مش هتنتهي',
		subtasks: 'مهام فرعية',
		subtaskPh: 'ضيف مهمة فرعية…',
		notes: 'ملاحظات',
		notesPh: 'أي حاجة عايز تفتكرها عن العادة دي…',
		save: 'حفظ',
		create: 'إضافة العادة',
		cancel: 'إلغاء',
		weekdaysShort: ['حد', 'اتنين', 'تلات', 'أربع', 'خميس', 'جمعة', 'سبت'],
		cards: 'كمّل',
		addCard: 'ضيف كارت تحفيز',
		cardPh: 'اكتب جملة تشجعك تكمّل…',
		cardOfDay: 'كارت النهارده',
	},
};

const fmtDay = (key, ar, opts) => new Intl.DateTimeFormat(ar ? 'ar-EG-u-nu-latn' : 'en-GB', opts).format(parseDay(key));

/* ───────── small floating menu / popover ───────── */

function Floating({ anchor, onClose, children, className = '', width = 240 }) {
	const ref = useRef(null);
	useEffect(() => {
		const away = e => !ref.current?.contains(e.target) && !anchor.el?.contains(e.target) && onClose();
		const esc = e => e.key === 'Escape' && onClose();
		const t = window.setTimeout(() => document.addEventListener('pointerdown', away), 0);
		document.addEventListener('keydown', esc);
		window.addEventListener('resize', onClose);
		return () => {
			window.clearTimeout(t);
			document.removeEventListener('pointerdown', away);
			document.removeEventListener('keydown', esc);
			window.removeEventListener('resize', onClose);
		};
	}, [anchor, onClose]);
	const r = anchor.rect;
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	const left = Math.max(8, Math.min(r.left + r.width / 2 - width / 2, vw - width - 8));
	const below = vh - r.bottom > 300 || r.top < 300;
	const style = below ? { left, width, top: r.bottom + 6 } : { left, width, bottom: vh - r.top + 6 };
	return (
		<div ref={ref} className={`hb-float ${className}`} style={style} role="menu">
			{children}
		</div>
	);
}

const anchorOf = e => {
	const el = e.currentTarget;
	const r = el.getBoundingClientRect();
	return { el, rect: { left: r.left, top: r.top, bottom: r.bottom, width: r.width } };
};

/* ───────── add / edit dialog ───────── */

function HabitDialog({ t, ar, habit, today, onSave, onClose }) {
	const [f, setF] = useState(() => ({
		title: habit?.title || '',
		icon: habit?.icon || '',
		color: habit?.color || 'green',
		link: habit?.link || '',
		notes: habit?.notes || '',
		subtasks: habit?.subtasks || [],
		schedule: habit?.schedule || { type: 'daily', days: [], every: 2 },
		start: habit?.start || today,
		end: habit?.end || '',
	}));
	const [sub, setSub] = useState('');
	const set = patch => setF(x => ({ ...x, ...patch }));
	const setSched = patch => setF(x => ({ ...x, schedule: { ...x.schedule, ...patch } }));
	useEffect(() => {
		const esc = e => e.key === 'Escape' && onClose();
		document.addEventListener('keydown', esc);
		return () => document.removeEventListener('keydown', esc);
	}, [onClose]);
	const addSub = () => {
		const text = sub.trim();
		if (!text) return;
		set({ subtasks: [...f.subtasks, { id: hid('s'), text }] });
		setSub('');
	};
	const submit = e => {
		e.preventDefault();
		if (!f.title.trim()) return;
		const schedule = f.schedule.type === 'weekdays' && !f.schedule.days.length ? { ...f.schedule, type: 'daily' } : f.schedule;
		onSave({ ...f, title: f.title.trim(), link: f.link.trim(), schedule, end: f.end && f.end < f.start ? '' : f.end });
		onClose();
	};
	const startChoice = f.start === today ? 'today' : f.start === addDays(today, 1) ? 'tomorrow' : 'date';
	return (
		<div className="hb-scrim" role="presentation" onPointerDown={e => e.target === e.currentTarget && onClose()}>
			<form className="hb-dialog" role="dialog" aria-modal="true" aria-label={habit ? t.editHabit : t.newHabit} onSubmit={submit} dir={ar ? 'rtl' : 'ltr'}>
				<header className="hb-dialog__head">
					<span className="hb-dialog__icon" data-color={f.color}>
						{f.icon || f.title.trim().charAt(0) || '✓'}
					</span>
					<h3>{habit ? t.editHabit : t.newHabit}</h3>
					<button type="button" className="hb-iconbtn" onClick={onClose} aria-label={t.cancel}>
						<X size={18} />
					</button>
				</header>
				<div className="hb-dialog__body">
					<label className="hb-field">
						<span>{t.name}</span>
						<input autoFocus dir="auto" maxLength={120} value={f.title} placeholder={t.namePh} onChange={e => set({ title: e.target.value })} />
					</label>
					<div className="hb-field">
						<span>{t.icon}</span>
						<div className="hb-icons">
							<button type="button" className={!f.icon ? 'is-on' : ''} onClick={() => set({ icon: '' })} aria-label="none">
								Aa
							</button>
							{HABIT_ICONS.map(ic => (
								<button key={ic} type="button" className={f.icon === ic ? 'is-on' : ''} onClick={() => set({ icon: ic })}>
									{ic}
								</button>
							))}
						</div>
					</div>
					<div className="hb-field">
						<span>{t.color}</span>
						<div className="hb-colors">
							{HABIT_COLORS.map(cl => (
								<button key={cl} type="button" data-color={cl} className={f.color === cl ? 'is-on' : ''} onClick={() => set({ color: cl })} aria-label={cl} aria-pressed={f.color === cl} />
							))}
						</div>
					</div>
					<div className="hb-field">
						<span>{t.repeat}</span>
						<div className="hb-seg">
							{[
								['daily', t.repeatDaily],
								['weekdays', t.repeatDays],
								['interval', t.repeatEvery],
							].map(([id, label]) => (
								<button key={id} type="button" className={f.schedule.type === id ? 'is-on' : ''} onClick={() => setSched({ type: id })}>
									{label}
								</button>
							))}
						</div>
						{f.schedule.type === 'weekdays' ? (
							<div className="hb-wdays">
								{[6, 0, 1, 2, 3, 4, 5].map(d => (
									<button
										key={d}
										type="button"
										className={f.schedule.days.includes(d) ? 'is-on' : ''}
										onClick={() => setSched({ days: f.schedule.days.includes(d) ? f.schedule.days.filter(x => x !== d) : [...f.schedule.days, d] })}
									>
										{t.weekdaysShort[d]}
									</button>
								))}
							</div>
						) : f.schedule.type === 'interval' ? (
							<label className="hb-every">
								{t.everyN}
								<input type="number" min={2} max={30} value={f.schedule.every} onChange={e => setSched({ every: Math.max(2, Math.min(30, Number(e.target.value) || 2)) })} />
								{t.daysWord}
							</label>
						) : null}
					</div>
					<div className="hb-row2">
						<div className="hb-field">
							<span>{t.start}</span>
							<div className="hb-seg is-small">
								<button type="button" className={startChoice === 'today' ? 'is-on' : ''} onClick={() => set({ start: today })}>
									{t.today}
								</button>
								<button type="button" className={startChoice === 'tomorrow' ? 'is-on' : ''} onClick={() => set({ start: addDays(today, 1) })}>
									{t.tomorrow}
								</button>
							</div>
							<input type="date" value={f.start} onChange={e => e.target.value && set({ start: e.target.value })} aria-label={t.pickDate} />
						</div>
						<div className="hb-field">
							<span>{t.end}</span>
							<div className="hb-seg is-small">
								<button type="button" className={!f.end ? 'is-on' : ''} onClick={() => set({ end: '' })}>
									{t.never}
								</button>
							</div>
							<input type="date" value={f.end} min={f.start} onChange={e => set({ end: e.target.value })} aria-label={t.end} />
						</div>
					</div>
					<label className="hb-field">
						<span>{t.link}</span>
						<input dir="ltr" type="url" inputMode="url" maxLength={600} value={f.link} placeholder={t.linkPh} onChange={e => set({ link: e.target.value })} />
					</label>
					<div className="hb-field">
						<span>{t.subtasks}</span>
						{f.subtasks.length ? (
							<ul className="hb-subs">
								{f.subtasks.map(s => (
									<li key={s.id}>
										<input dir="auto" value={s.text} maxLength={160} onChange={e => set({ subtasks: f.subtasks.map(x => (x.id === s.id ? { ...x, text: e.target.value } : x)) })} />
										<button type="button" className="hb-iconbtn" onClick={() => set({ subtasks: f.subtasks.filter(x => x.id !== s.id) })} aria-label={t.delete}>
											<X size={14} />
										</button>
									</li>
								))}
							</ul>
						) : null}
						<div className="hb-subadd">
							<input
								dir="auto"
								value={sub}
								maxLength={160}
								placeholder={t.subtaskPh}
								onChange={e => setSub(e.target.value)}
								onKeyDown={e => {
									if (e.key === 'Enter') {
										e.preventDefault();
										addSub();
									}
								}}
							/>
							<button type="button" className="hb-iconbtn" onClick={addSub} disabled={!sub.trim()} aria-label={t.subtaskPh}>
								<Plus size={16} />
							</button>
						</div>
					</div>
					<label className="hb-field">
						<span>{t.notes}</span>
						<textarea dir="auto" rows={2} maxLength={4000} value={f.notes} placeholder={t.notesPh} onChange={e => set({ notes: e.target.value })} />
					</label>
				</div>
				<footer className="hb-dialog__foot">
					<button type="button" className="hb-btn is-ghost" onClick={onClose}>
						{t.cancel}
					</button>
					<button type="submit" className="hb-btn is-primary" disabled={!f.title.trim()}>
						{habit ? t.save : t.create}
					</button>
				</footer>
			</form>
		</div>
	);
}

/* ───────── motivation cards ───────── */

function Cards({ t, cards, today, onSave, onRemove }) {
	const [editing, setEditing] = useState(null); // card id or 'new'
	const [draft, setDraft] = useState('');
	const daily = cardOfDay(cards, today);
	const start = (id, text) => {
		setEditing(id);
		setDraft(text);
	};
	const commit = card => {
		const text = draft.trim();
		if (text) onSave({ ...(card || {}), text, tone: card?.tone || CARD_TONES[cards.length % CARD_TONES.length] });
		else if (card) onRemove(card.id);
		setEditing(null);
	};
	return (
		<div className="hb-cards" aria-label={t.cards}>
			{cards.slice(0, MAX_CARDS).map((card, i) => (
				<article key={card.id} className={`hb-card tone-${card.tone}${i === daily ? ' is-daily' : ''}`}>
					{i === daily ? (
						<span className="hb-card__tag">
							<Target size={13} strokeWidth={2.4} aria-hidden />
							{t.cardOfDay}
						</span>
					) : null}
					<span className="hb-card__q" aria-hidden>
						”
					</span>
					{editing === card.id ? (
						<textarea
							autoFocus
							dir="auto"
							className={cardTextClass(draft)}
							value={draft}
							maxLength={280}
							onChange={e => setDraft(e.target.value)}
							onBlur={() => commit(card)}
							onKeyDown={e => {
								if (e.key === 'Enter' && !e.shiftKey) {
									e.preventDefault();
									commit(card);
								}
								if (e.key === 'Escape') setEditing(null);
							}}
						/>
					) : (
						<p dir="auto" className={cardTextClass(card.text)} onDoubleClick={() => start(card.id, card.text)}>
							{card.text}
						</p>
					)}
					<div className="hb-card__tools">
						<button type="button" className="hb-iconbtn" onClick={() => start(card.id, card.text)} aria-label={t.edit}>
							<Pencil size={13} />
						</button>
						<button type="button" className="hb-iconbtn" onClick={() => onRemove(card.id)} aria-label={t.delete}>
							<Trash2 size={13} />
						</button>
					</div>
				</article>
			))}
			{cards.length >= MAX_CARDS ? null : editing === 'new' ? (
				<article className={`hb-card tone-${CARD_TONES[cards.length % CARD_TONES.length]}`}>
					<textarea
						autoFocus
						dir="auto"
						className={cardTextClass(draft)}
						value={draft}
						maxLength={280}
						placeholder={t.cardPh}
						onChange={e => setDraft(e.target.value)}
						onBlur={() => commit(null)}
						onKeyDown={e => {
							if (e.key === 'Enter' && !e.shiftKey) {
								e.preventDefault();
								commit(null);
							}
							if (e.key === 'Escape') setEditing(null);
						}}
					/>
				</article>
			) : (
				<button type="button" className="hb-card hb-card--add" onClick={() => start('new', '')}>
					<Plus size={18} aria-hidden />
					<span>{t.addCard}</span>
				</button>
			)}
		</div>
	);
}

/* ───────── one day box ───────── */

function DayBox({ h, day, today, t, onToggle, onOpen }) {
	const s = dayState(h, day, today);
	const p = progressOn(h, day);
	const press = useRef(0);
	const label = `${h.title} · ${day} · ${t.state[s]}`;
	return (
		<button
			type="button"
			className={`hb-box is-${s}`}
			aria-label={label}
			title={label}
			aria-pressed={s === 'done'}
			onClick={e => (h.subtasks.length ? onOpen(e) : onToggle())}
			onContextMenu={e => {
				e.preventDefault();
				onOpen(e);
			}}
			onPointerDown={e => {
				if (e.pointerType !== 'touch') return;
				const target = e.currentTarget;
				press.current = window.setTimeout(() => {
					press.current = -1;
					onOpen({ currentTarget: target });
				}, 450);
			}}
			onPointerUp={e => {
				if (press.current === -1) e.preventDefault();
				window.clearTimeout(press.current);
			}}
			onPointerLeave={() => window.clearTimeout(press.current)}
		>
			{s === 'done' ? (
				<svg viewBox="0 0 24 24" className="hb-tick" aria-hidden>
					<path d="M5 12.5l4.2 4.2L19 7" />
				</svg>
			) : s === 'partial' ? (
				<span className="hb-part" style={{ '--p': p.done / p.total }}>
					<b>
						{p.done}/{p.total}
					</b>
				</span>
			) : s === 'skip' ? (
				<SkipForward size={13} aria-hidden />
			) : s === 'rest' ? (
				<span className="hb-rest" aria-hidden>
					–
				</span>
			) : h.subtasks.length && s !== 'off' && day <= today ? (
				<span className="hb-subn">0/{h.subtasks.length}</span>
			) : null}
		</button>
	);
}

/* ───────── the tab ───────── */

export default function HabitsTracker({ ar, tickets = [] }) {
	const t = T[ar ? 'ar' : 'en'];
	const store = useHabits();
	useTicketFonts();
	const { today } = store;
	const [focusDay, setFocusDay] = useState(today);
	const [dialog, setDialog] = useState(null); // { habit? }
	const [menu, setMenu] = useState(null); // { id, anchor }
	const [rangeOpen, setRangeOpen] = useState(null); // anchor of the calendar button
	const [toolsSlot, setToolsSlot] = useState(null);
	useEffect(() => {
		setToolsSlot(document.getElementById('wa-idle-tools-slot'));
	}, []);
	const [cell, setCell] = useState(null); // { id, day, anchor }
	const [showArchived, setShowArchived] = useState(false);
	const [undo, setUndo] = useState(null);
	const [drag, setDrag] = useState(null); // { id, order }
	const [fresh, setFresh] = useState(null); // "id|day" just checked
	const bodyRef = useRef(null);

	const days = useMemo(() => planWindow(store.planStart, focusDay), [store.planStart, focusDay]);
	const list = useMemo(() => activeHabits(store.habits), [store.habits]);
	const archived = useMemo(() => store.habits.filter(h => h.archived && !h.deletedAt), [store.habits]);
	const shown = drag ? drag.order.map(id => list.find(h => h.id === id)).filter(Boolean) : list;
	const sum = useMemo(() => todaySummary(store.habits, today), [store.habits, today]);
	const windowPct = useMemo(() => {
		let planned = 0;
		let done = 0;
		list.forEach(h =>
			days.forEach(d => {
				if (d > today) return;
				const s = dayState(h, d, today);
				if (s === 'done') (done += 1), (planned += 1);
				else if (s === 'missed') planned += 1;
			}),
		);
		return planned ? Math.round((done / planned) * 100) : null;
	}, [list, days, today]);
	const dailyTickets = useMemo(() => tickets.filter(x => x.repeat === 'daily'), [tickets]);

	// keep today's column in view on phones: just after the sticky names (the grid's scroll-padding keeps yesterday beside it)
	useEffect(() => {
		const el = bodyRef.current?.querySelector('.hb-th.is-today');
		el?.scrollIntoView({ block: 'nearest', inline: 'start' });
	}, [days, store.ready]);

	const toggle = (id, day) => {
		const h = store.habits.find(x => x.id === id);
		const wasDone = h?.log[day]?.s === 'done';
		store.updateHabit(id, x => toggleDay(x, day));
		if (!wasDone) {
			setFresh(`${id}|${day}`);
			navigator.vibrate?.(8);
		}
	};

	const range = `${fmtDay(days[0], ar, { day: 'numeric', month: 'short' })} – ${fmtDay(days[days.length - 1], ar, { day: 'numeric', month: 'short' })}`;
	const tools = (
		<div className="hb-tools">
			<button
				type="button"
				className={`hb-toolbtn${rangeOpen ? ' is-on' : ''}${days.includes(today) ? '' : ' is-away'}`}
				onClick={e => setRangeOpen(rangeOpen ? null : anchorOf(e))}
				aria-label={range}
				title={range}
				aria-expanded={Boolean(rangeOpen)}
			>
				<CalendarDays size={18} />
			</button>
			<HabitTimer
				ar={ar}
				habits={list}
				onMarkDone={id => {
					store.updateHabit(id, x => (x.log[today]?.s === 'done' ? x : toggleDay(x, today)));
					setFresh(`${id}|${today}`);
				}}
			/>
			<button type="button" className="hb-toolbtn is-primary" onClick={() => setDialog({})}>
				<Plus size={17} strokeWidth={2.4} aria-hidden />
				<span>{t.newHabit}</span>
			</button>
		</div>
	);
	const menuHabit = menu ? store.habits.find(h => h.id === menu.id) : null;
	const cellHabit = cell ? store.habits.find(h => h.id === cell.id) : null;

	// drag to reorder (the grip in the name cell)
	const startDrag = (e, id) => {
		e.preventDefault();
		const rows = [...(bodyRef.current?.querySelectorAll('tbody tr[data-id]') || [])];
		const mids = rows.map(r => {
			const b = r.getBoundingClientRect();
			return b.top + b.height / 2;
		});
		let order = list.map(h => h.id);
		setDrag({ id, order });
		const move = ev => {
			const y = ev.clientY;
			let to = mids.findIndex(m => y < m);
			if (to < 0) to = mids.length - 1;
			const from = order.indexOf(id);
			if (to !== from) {
				order = order.filter(x => x !== id);
				order.splice(to, 0, id);
				setDrag({ id, order: [...order] });
			}
		};
		const up = () => {
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
			store.reorder(order);
			setDrag(null);
		};
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up);
	};

	useEffect(() => {
		if (!fresh) return undefined;
		const id = window.setTimeout(() => setFresh(null), 700);
		return () => window.clearTimeout(id);
	}, [fresh]);

	const del = h => {
		store.removeHabit(h.id);
		setUndo({ text: t.deleted(h.title), run: () => store.updateHabit(h.id, x => ({ ...x, deletedAt: undefined })) });
	};
	useEffect(() => {
		if (!undo) return undefined;
		const id = window.setTimeout(() => setUndo(null), 6000);
		return () => window.clearTimeout(id);
	}, [undo]);

	const empty = store.ready && !list.length && !archived.length;

	return (
		<div className={`hb ${cardArabicFont.variable} ${cardLatinFont.variable}`} dir={ar ? 'rtl' : 'ltr'}>
			<div className="hb-top">
				<Cards t={t} cards={store.cards} today={today} onSave={store.saveCard} onRemove={store.removeCard} />
			</div>

			{/* calendar + new habit: up next to the Habits / Wall switch when that corner exists */}
			{toolsSlot ? createPortal(tools, toolsSlot) : <div className="hb-bar">{tools}</div>}
			{rangeOpen ? (
				<Floating anchor={rangeOpen} onClose={() => setRangeOpen(null)} width={250} className="hb-rangepop">
					<div className="hb-rangepop__nav">
						<button type="button" className="hb-iconbtn" onClick={() => setFocusDay(addDays(days[0], -1))} aria-label={t.prev} title={t.prev}>
							<ChevronLeft size={18} className="hb-flip" />
						</button>
						<b>{range}</b>
						<button type="button" className="hb-iconbtn" onClick={() => setFocusDay(addDays(days[days.length - 1], 1))} aria-label={t.next} title={t.next}>
							<ChevronRight size={18} className="hb-flip" />
						</button>
					</div>
					<button type="button" className="hb-btn is-small" disabled={days.includes(today)} onClick={() => setFocusDay(today)}>
						<CalendarDays size={14} aria-hidden />
						{t.backToday}
					</button>
				</Floating>
			) : null}

			{empty ? (
				<div className="hb-empty">
					{/* a tiny preview: a week filling up and turning into a chain */}
					<div className="hb-empty__art" aria-hidden>
						{['green', 'amber', 'blue'].map((cl, r) => (
							<div key={cl} className="hb-empty__row" data-color={cl}>
								<span className="hb-icon is-small">{['📖', '🤲', '🇬🇧'][r]}</span>
								{Array.from({ length: 7 }, (_, i) => (
									<span key={i} className="hb-empty__box" style={{ '--d': `${0.25 + r * 0.18 + i * 0.12}s` }} data-on={i < 6 - r ? '1' : '0'} />
								))}
							</div>
						))}
					</div>
					<h3 className="hb-empty__title">{t.emptyTitle}</h3>
					<ul className="hb-empty__points">
						{t.emptyPoints.map(x => (
							<li key={x}>
								<Check size={14} strokeWidth={3} aria-hidden />
								{x}
							</li>
						))}
					</ul>
					<p>{t.empty}</p>
					<div className="hb-empty__acts">
						{dailyTickets.length ? (
							<button type="button" className="hb-btn is-primary" onClick={() => store.addHabits(dailyTickets.map((x, i) => habitFromTicket(x, today, i)))}>
								<Sparkles size={16} aria-hidden />
								{t.importTickets(dailyTickets.length)}
							</button>
						) : null}
						<button type="button" className="hb-btn" onClick={() => setDialog({})}>
							<Plus size={16} aria-hidden />
							{t.newHabit}
						</button>
					</div>
				</div>
			) : (
				<div className="hb-gridwrap" ref={bodyRef}>
					{/* the frame keeps the rounded edge; the scroller inside keeps its scrollbar off the edge */}
					<div className="hb-gridscroll">
					<table className="hb-grid" style={{ '--cols': days.length }}>
						<thead>
							<tr>
								<th className="hb-name hb-corner" scope="col">
									<div className="hb-corner__in">
										<span className={`hb-ring${sum.planned && sum.done === sum.planned ? ' is-full' : ''}`} style={{ '--p': sum.pct / 100 }} aria-hidden>
											<span>{sum.planned && sum.done === sum.planned ? <Check size={16} strokeWidth={3} /> : `${sum.pct}%`}</span>
										</span>
										<span className="hb-corner__txt">
											<b>{t.todayDone(sum.done, sum.planned)}</b>
											<small>
												{t.thisPlan}: {windowPct == null ? '—' : `${windowPct}%`}
											</small>
										</span>
									</div>
								</th>
								{days.map(d => {
									const isToday = d === today;
									return (
										<th key={d} scope="col" className={`hb-th${isToday ? ' is-today' : ''}${d < today ? ' is-past' : ''}`}>
											{isToday ? <span className="hb-today-pill">{t.today}</span> : <small>{fmtDay(d, ar, { weekday: 'short' })}</small>}
											<b>{parseDay(d).getDate()}</b>
										</th>
									);
								})}
							</tr>
						</thead>
						<tbody>
							{shown.map(h => {
								const st = streak(h, today);
								const kept = adherence(h, today);
								const paused = isPaused(h, today);
								const snoozed = h.snoozedUntil && h.snoozedUntil > today;
								const states = days.map(d => dayState(h, d, today));
								const planned = states.filter(s => s !== 'off' && s !== 'rest' && s !== 'skip').length;
								const doneN = states.filter(s => s === 'done').length;
								const doneToday = dayState(h, today, today) === 'done';
								const tone = kept == null ? 'new' : kept >= 80 ? 'high' : kept >= 50 ? 'mid' : 'low';
								return (
									<tr
										key={h.id}
										data-id={h.id}
										data-color={h.color}
										className={`${drag?.id === h.id ? 'is-dragging' : ''}${paused || snoozed ? ' is-resting' : ''}${doneToday ? ' is-done-today' : ''}`}
									>
										<th scope="row" className="hb-name">
											<div className="hb-name__in">
												<span className="hb-grip" onPointerDown={e => startDrag(e, h.id)} title={t.dragToReorder} aria-hidden>
													<GripVertical size={15} />
												</span>
												<span className="hb-icon" data-color={h.color}>
													{h.icon || h.title.trim().charAt(0).toUpperCase()}
													{doneToday ? (
														<span className="hb-icon__done" aria-hidden>
															<Check size={10} strokeWidth={3.5} />
														</span>
													) : null}
												</span>
												<span className="hb-name__text">
													<span className={`hb-title ${langClass(h.title)}`} dir="auto" onMouseEnter={e => { const t = e.currentTarget; t.title = t.scrollWidth > t.clientWidth + 1 ? h.title : ''; }}>
														{h.pinned ? <Pin size={12} className="hb-pin" aria-hidden /> : null}
														{h.title}
													</span>
													<span className="hb-meta">
														{paused ? (
															<span className="hb-tag">
																<Pause size={11} aria-hidden />
																{t.paused}
															</span>
														) : snoozed ? (
															<span className="hb-tag">
																<BellOff size={11} aria-hidden />
																{t.snoozedTill(fmtDay(h.snoozedUntil, ar, { day: 'numeric', month: 'short' }))}
															</span>
														) : (
															<>
																<span className={`hb-streak${st ? ' is-on' : ''}`}>
																	<Flame size={12} aria-hidden />
																	{st}
																</span>
																<span className={`hb-kept is-${tone}`}>{t.kept(kept)}</span>
															</>
														)}
														{h.subtasks.length ? (
															<span className="hb-kept">
																<ListChecks size={11} aria-hidden /> {h.subtasks.length}
															</span>
														) : null}
													</span>
												</span>
												{h.link ? (
													<a className="hb-iconbtn hb-link" href={/^https?:/i.test(h.link) ? h.link : `https://${h.link}`} target="_blank" rel="noreferrer noopener" title={t.openLink} aria-label={t.openLink}>
														<ExternalLink size={15} />
													</a>
												) : null}
												<button type="button" className="hb-iconbtn" onClick={e => setMenu({ id: h.id, anchor: anchorOf(e) })} aria-label={t.menu} title={t.menu}>
													<MoreHorizontal size={17} />
												</button>
											</div>
										</th>
										{days.map((d, i) => (
											<td
												key={d}
												className={`hb-td${d === today ? ' is-today' : ''}${fresh === `${h.id}|${d}` ? ' is-fresh' : ''}${
													// a run of done days is drawn as one linked chain
													states[i] === 'done' && states[i - 1] === 'done' ? ' is-linked' : ''
												}`}
											>
												<DayBox h={h} day={d} today={today} t={t} onToggle={() => toggle(h.id, d)} onOpen={e => setCell({ id: h.id, day: d, anchor: anchorOf(e) })} />
												{fresh === `${h.id}|${d}` ? (
													<span className="hb-burst" aria-hidden>
														{Array.from({ length: 8 }, (_, k) => (
															<i key={k} style={{ '--a': `${k * 45}deg` }} />
														))}
													</span>
												) : null}
											</td>
										))}
									</tr>
								);
							})}
						</tbody>
						{/* how much of each day got done: a quick look at good and quiet days */}
						<tfoot>
							<tr>
								<th className="hb-name hb-foot-label" scope="row">
									{t.dayDone}
								</th>
								{days.map(d => {
									let planned = 0;
									let done = 0;
									list.forEach(h => {
										const s = dayState(h, d, today);
										if (s === 'done') (done += 1), (planned += 1);
										else if (s === 'open' || s === 'missed' || s === 'partial') planned += 1;
									});
									const pct = planned ? done / planned : 0;
									return (
										<td key={d} className={`hb-foot${d === today ? ' is-today' : ''}${d > today ? ' is-future' : ''}`}>
											<span className="hb-foot__bar" style={{ '--p': pct }} title={`${done}/${planned}`}>
												<i />
											</span>
											<small>{d > today ? '' : `${Math.round(pct * 100)}%`}</small>
										</td>
									);
								})}
							</tr>
						</tfoot>
					</table>
					</div>
				</div>
			)}

			{archived.length ? (
				<div className="hb-archive">
					<button type="button" className="hb-linkbtn" onClick={() => setShowArchived(v => !v)} aria-expanded={showArchived}>
						<Archive size={14} aria-hidden />
						{t.archived(archived.length)}
					</button>
					{showArchived ? (
						<ul>
							{archived.map(h => (
								<li key={h.id}>
									<span className="hb-icon is-small" data-color={h.color}>
										{h.icon || h.title.charAt(0)}
									</span>
									<span dir="auto" className={langClass(h.title)}>
										{h.title}
									</span>
									<span className="hb-kept">{t.kept(adherence(h, today))}</span>
									<button type="button" className="hb-iconbtn" onClick={() => store.updateHabit(h.id, x => ({ ...x, archived: false }))} title={t.restore} aria-label={t.restore}>
										<ArchiveRestore size={15} />
									</button>
									<button type="button" className="hb-iconbtn is-danger" onClick={() => window.confirm(t.confirmDelete(h.title)) && del(h)} title={t.delete} aria-label={t.delete}>
										<Trash2 size={15} />
									</button>
								</li>
							))}
						</ul>
					) : null}
				</div>
			) : null}

			{menu && menuHabit ? (
				<Floating anchor={menu.anchor} onClose={() => setMenu(null)} width={220}>
					{(() => {
						const h = menuHabit;
						const paused = isPaused(h, today);
						const snoozed = h.snoozedUntil && h.snoozedUntil > today;
						const run = fn => () => {
							fn();
							setMenu(null);
						};
						return (
							<>
								<button type="button" role="menuitem" onClick={run(() => setDialog({ habit: h }))}>
									<Pencil size={15} aria-hidden />
									{t.edit}
								</button>
								<button type="button" role="menuitem" onClick={run(() => store.updateHabit(h.id, x => ({ ...x, pinned: !x.pinned })))}>
									{h.pinned ? <PinOff size={15} aria-hidden /> : <Pin size={15} aria-hidden />}
									{h.pinned ? t.unpin : t.pin}
								</button>
								<div className="hb-float__sep" />
								{snoozed ? (
									<button type="button" role="menuitem" onClick={run(() => store.updateHabit(h.id, x => snooze(x, today, 0)))}>
										<BellOff size={15} aria-hidden />
										{t.unsnooze}
									</button>
								) : (
									<div className="hb-float__group">
										<span>
											<BellOff size={15} aria-hidden />
											{t.snooze}
										</span>
										<div className="hb-float__chips">
											{[1, 3, 7].map(n => (
												<button key={n} type="button" onClick={run(() => store.updateHabit(h.id, x => snooze(x, today, n)))}>
													{t.snoozeFor[n]}
												</button>
											))}
										</div>
									</div>
								)}
								<button type="button" role="menuitem" onClick={run(() => store.updateHabit(h.id, x => (paused ? resume(x, today) : pause(x, today))))}>
									{paused ? <Play size={15} aria-hidden /> : <Pause size={15} aria-hidden />}
									{paused ? t.resume : t.pause}
								</button>
								<div className="hb-float__sep" />
								<button type="button" role="menuitem" onClick={run(() => store.updateHabit(h.id, x => ({ ...x, archived: true, pinned: false })))}>
									<Archive size={15} aria-hidden />
									{t.archive}
								</button>
								<button type="button" role="menuitem" className="is-danger" onClick={run(() => window.confirm(t.confirmDelete(h.title)) && del(h))}>
									<Trash2 size={15} aria-hidden />
									{t.delete}
								</button>
							</>
						);
					})()}
				</Floating>
			) : null}

			{cell && cellHabit ? (
				<Floating anchor={cell.anchor} onClose={() => setCell(null)} width={250} className="hb-cellpop">
					{(() => {
						const h = cellHabit;
						const d = cell.day;
						const s = dayState(h, d, today);
						const p = progressOn(h, d);
						const done = s === 'done';
						return (
							<>
								<header>
									<b dir="auto" className={langClass(h.title)}>
										{h.title}
									</b>
									<small>
										{fmtDay(d, ar, { weekday: 'long', day: 'numeric', month: 'short' })} · {t.state[s]}
									</small>
								</header>
								{h.subtasks.length ? (
									<ul className="hb-cellsubs">
										{h.subtasks.map(sub => {
											const on = done || (h.log[d]?.sub || []).includes(sub.id);
											return (
												<li key={sub.id}>
													<button type="button" className={on ? 'is-on' : ''} onClick={() => store.updateHabit(h.id, x => toggleSub(x, d, sub.id))} aria-pressed={on}>
														<span className="hb-cb">{on ? <Check size={12} /> : null}</span>
														<span dir="auto" className={langClass(sub.text)}>
															{sub.text}
														</span>
													</button>
												</li>
											);
										})}
									</ul>
								) : null}
								<div className="hb-cellacts">
									<button type="button" className={`hb-btn is-small${done ? '' : ' is-primary'}`} onClick={() => toggle(h.id, d)}>
										{done ? <Undo2 size={14} aria-hidden /> : <Check size={14} aria-hidden />}
										{done ? t.markUndone : h.subtasks.length && p.done < p.total ? t.allSubs : t.markDone}
									</button>
									<button type="button" className="hb-btn is-small is-ghost" onClick={() => store.updateHabit(h.id, x => skipDay(x, d))}>
										<SkipForward size={14} aria-hidden />
										{s === 'skip' ? t.unskip : t.skip}
									</button>
									{h.log[d] ? (
										<button type="button" className="hb-btn is-small is-ghost" onClick={() => store.updateHabit(h.id, x => clearDay(x, d))}>
											{t.clear}
										</button>
									) : null}
								</div>
								{h.notes ? (
									<p className="hb-cellnote" dir="auto">
										{h.notes}
									</p>
								) : null}
							</>
						);
					})()}
				</Floating>
			) : null}

			{dialog ? (
				<HabitDialog
					t={t}
					ar={ar}
					today={today}
					habit={dialog.habit}
					onClose={() => setDialog(null)}
					onSave={fields => {
						if (dialog.habit) store.updateHabit(dialog.habit.id, x => ({ ...x, ...fields }));
						else store.addHabits([newHabit(fields, today)]);
					}}
				/>
			) : null}

			{undo ? (
				<div className="hb-toast" role="status">
					<span>{undo.text}</span>
					<button
						type="button"
						onClick={() => {
							undo.run();
							setUndo(null);
						}}
					>
						{t.undo}
					</button>
				</div>
			) : null}
		</div>
	);
}
