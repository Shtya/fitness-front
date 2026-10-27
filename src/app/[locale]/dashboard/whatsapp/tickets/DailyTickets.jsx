'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CalendarDays, Check, CheckCheck, Eye, EyeOff, List, ListChecks, Moon, Pin, Plus, Repeat, Sun, Ticket, Trash2, Undo2, X } from 'lucide-react';
import { MAX_TITLE, dayKey } from './use-daily-tickets';
import { COPY, mergeSubsetOrder, sortTickets } from './tickets-model';
import { DetailsHint, MiniMenu, RepeatBadge, StatusChip, StepBar, StepRing, TicketMenu, checkLabel, stepInOrder, ticketKeyHandler, useSortable } from './tickets-ui';
import TicketDialog from './TicketDialog';
import TicketsWall from './TicketsWall';
import './daily-tickets.css';

const T = {
	en: {
		newTicket: 'New ticket',
		heading: 'Today’s tickets',
		placeholder: 'What are you working on today?',
		fieldLabel: 'New ticket title',
		add: 'Add ticket',
		priority: 'Priority',
		opened: time => `Opened ${time}`,
		closed: time => `Done ${time}`,
		carried: 'From yesterday',
		carriedOn: date => `From ${date}`,
		stamp: 'Completed',
		deleted: title => `Deleted “${title}”`,
		undo: 'Undo',
		dismiss: 'Dismiss',
		editHint: 'Enter to save, Esc to cancel',
		views: 'View',
		viewList: 'Tickets',
		viewWall: 'Wall',
		greet: { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening' },
		count: n => (n === 1 ? '1 task' : `${n} tasks`),
		doneCount: n => `${n} done`,
		hideDone: 'Hide completed',
		showDone: 'Show completed',
		allDoneHidden: n => (n === 1 ? '1 completed task is hidden' : `${n} completed tasks are hidden`),
	},
	ar: {
		newTicket: 'تذكرة جديدة',
		heading: 'تذاكر اليوم',
		placeholder: 'بتشتغل على إيه النهارده؟',
		fieldLabel: 'عنوان التذكرة الجديدة',
		add: 'إضافة تذكرة',
		priority: 'الأولوية',
		opened: time => `اتفتحت ${time}`,
		closed: time => `اتقفلت ${time}`,
		carried: 'من امبارح',
		carriedOn: date => `من ${date}`,
		stamp: 'مكتملة',
		deleted: title => `اتحذفت «${title}»`,
		undo: 'تراجع',
		dismiss: 'إغلاق',
		editHint: 'Enter للحفظ، Esc للإلغاء',
		views: 'طريقة العرض',
		viewList: 'تذاكر',
		viewWall: 'الحائط',
		greet: { morning: 'صباح الخير', afternoon: 'نهارك سعيد', evening: 'مساء الخير' },
		count: n => (n === 1 ? 'مهمة واحدة' : n === 2 ? 'مهمتين' : n >= 3 && n <= 10 ? `${n} مهام` : `${n} مهمة`),
		doneCount: n => `${n} مكتملة`,
		hideDone: 'إخفاء المكتملة',
		showDone: 'إظهار المكتملة',
		allDoneHidden: n => (n === 1 ? 'في مهمة مكتملة مخفية' : `في ${n} مهام مكتملة مخفية`),
	},
};

const VIEW_KEY = 'wa-daily-tickets:view';
function readView() {
	try {
		return window.localStorage.getItem(VIEW_KEY) === 'wall' ? 'wall' : 'list';
	} catch {
		return 'list';
	}
}

const HIDE_DONE_KEY = 'wa-daily-tickets:hide-done';
function readHideDone() {
	try {
		return window.localStorage.getItem(HIDE_DONE_KEY) === '1';
	} catch {
		return false;
	}
}

/* A ticket completed while "hide completed" is on stays long enough to see it close. */
const DONE_LINGER_MS = 1600;

const locale = ar => (ar ? 'ar-EG-u-nu-latn' : 'en-GB');
const timeOf = (ms, ar) => new Intl.DateTimeFormat(ar ? 'ar-EG-u-nu-latn' : 'en-US', { hour: 'numeric', minute: '2-digit' }).format(ms);

function carriedLabel(day, ar) {
	const t = T[ar ? 'ar' : 'en'];
	const y = new Date();
	y.setDate(y.getDate() - 1);
	if (day === dayKey(y)) return t.carried;
	const [Y, M, D] = day.split('-').map(Number);
	return t.carriedOn(new Intl.DateTimeFormat(locale(ar), { day: 'numeric', month: 'short' }).format(new Date(Y, M - 1, D)));
}

function greetingFor(date, t) {
	const h = date.getHours();
	if (h >= 5 && h < 12) return t.greet.morning;
	if (h >= 12 && h < 17) return t.greet.afternoon;
	return t.greet.evening;
}

const isTyping = el => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);

/** The composer: title + steps, Enter adds. Used in the corner popover and on the board. */
function Composer({ ar, onAdd, autoFocus, compact, inputRef }) {
	const t = T[ar ? 'ar' : 'en'];
	const c = COPY[ar ? 'ar' : 'en'];
	const id = useId();
	const [value, setValue] = useState('');
	const [steps, setSteps] = useState(1);
	const [daily, setDaily] = useState(false);
	const ownInput = useRef(null);
	const input = inputRef || ownInput;
	useEffect(() => {
		if (autoFocus) input.current?.focus();
	}, [autoFocus, input]);
	const submit = event => {
		event.preventDefault();
		if (!value.trim()) return;
		onAdd(value, { steps, repeat: daily ? 'daily' : 'none' });
		setValue('');
		setSteps(1);
		input.current?.focus();
	};
	return (
		<form className={`tk-composer ${compact ? 'tk-composer--compact' : ''}`} onSubmit={submit}>
			<label htmlFor={id} className="tk-sr">
				{t.fieldLabel}
			</label>
			<List className="tk-composer__icon" size={20} aria-hidden />
			<input
				ref={input}
				id={id}
				className="tk-composer__input"
				value={value}
				onChange={event => setValue(event.target.value)}
				placeholder={t.placeholder}
				maxLength={MAX_TITLE}
				autoComplete="off"
				enterKeyHint="done"
			/>
			{value.length > MAX_TITLE - 20 ? <span className="tk-composer__count">{MAX_TITLE - value.length}</span> : null}
			<MiniMenu
				label={`${c.steps}: ${steps === 1 ? c.oneStep : c.stepsN(steps)}`}
				title={c.stepsHint}
				icon={<ListChecks size={15} aria-hidden />}
				text={compact ? null : steps === 1 ? c.oneStep : c.stepsN(steps)}
				buttonClassName={`tkx-chipbtn tk-composer__prio tk-composer__steps ${steps > 1 ? 'is-split' : ''}`}
				items={[
					{ heading: c.stepsHint },
					...[1, 2, 3, 4, 5, 6, 8, 10].map(n => ({
						id: `s${n}`,
						label: n === 1 ? c.oneStep : c.stepsN(n),
						checked: steps === n,
						onSelect: () => setSteps(n),
					})),
				]}
			/>
			<button
				type="button"
				className={`tkx-chipbtn tk-composer__prio tk-composer__daily ${daily ? 'is-on' : ''}`}
				aria-pressed={daily}
				onClick={() => setDaily(v => !v)}
				title={`${c.repeatDaily} · ${c.dailyHint}`}
				aria-label={c.repeatDaily}
			>
				<Repeat size={15} aria-hidden />
				{compact ? null : <span>{c.daily}</span>}
			</button>
			<button type="submit" className="tk-composer__add" disabled={!value.trim()} aria-label={t.add}>
				<Plus size={17} aria-hidden />
				<span>{t.add}</span>
			</button>
		</form>
	);
}

/** Corner button shown while there are no tickets: opens a small composer. */
export function TicketsLauncher({ ar, onAdd }) {
	const t = T[ar ? 'ar' : 'en'];
	const [open, setOpen] = useState(false);
	const wrap = useRef(null);
	useEffect(() => {
		if (!open) return undefined;
		const onDown = event => {
			// The composer's steps menu is portalled to <body>; picking from it is still "inside".
			if (!wrap.current?.contains(event.target) && !event.target.closest?.('.tkx-menu__list')) setOpen(false);
		};
		const onKey = event => {
			if (event.key === 'Escape') setOpen(false);
		};
		document.addEventListener('pointerdown', onDown);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('pointerdown', onDown);
			document.removeEventListener('keydown', onKey);
		};
	}, [open]);
	return (
		<div className="tk-launch" ref={wrap}>
			<button type="button" className="tk-launch__btn" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-haspopup="dialog">
				<Ticket size={18} aria-hidden />
				<span>{t.newTicket}</span>
			</button>
			{open ? (
				<div className="tk-pop" role="dialog" aria-label={t.newTicket}>
					<Composer
						ar={ar}
						compact
						autoFocus
						onAdd={(title, opts) => {
							onAdd(title, opts);
							setOpen(false);
						}}
					/>
				</div>
			) : null}
		</div>
	);
}

function TicketCard({ ticket, ar, c, fresh, fadingOut, baseActions, onDelete, canMove, dragging, onPointerDown }) {
	const t = T[ar ? 'ar' : 'en'];
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(ticket.title);
	const [leaving, setLeaving] = useState(false);
	const [stamped, setStamped] = useState(false);
	const input = useRef(null);
	const self = useRef(null);
	const closing = useRef(false);
	const today = dayKey();

	useEffect(() => {
		if (!editing) return;
		closing.current = false;
		input.current?.focus();
		input.current?.select();
	}, [editing]);

	const finishEdit = save => {
		// Enter/Esc unmount the field, which can fire a late blur: only the first call counts.
		if (closing.current) return;
		closing.current = true;
		if (save && draft.trim() && draft.trim() !== ticket.title) baseActions.rename(ticket.id, draft);
		else setDraft(ticket.title);
		setEditing(false);
		window.setTimeout(() => self.current?.focus(), 0);
	};

	const actions = {
		...baseActions,
		toggle: id => {
			if (!ticket.done) setStamped(true);
			baseActions.toggle(id);
		},
		startEdit: () => {
			setDraft(ticket.title);
			setEditing(true);
		},
		remove: () => {
			setLeaving(true);
			window.setTimeout(() => onDelete(ticket), 240);
		},
		canMove,
	};

	return (
		<li
			ref={self}
			data-flip={ticket.id}
			tabIndex={0}
			aria-label={`${ticket.title}. ${c.status[ticket.status]}${ticket.pinned ? `. ${c.pinned}` : ''}`}
			onKeyDown={editing ? undefined : ticketKeyHandler(ticket, actions, ar)}
			onPointerDown={editing ? undefined : event => onPointerDown(event, ticket.id)}
			className={[
				'tk',
				dragging ? 'is-dragging' : '',
				ticket.done ? 'is-done' : '',
				`is-${ticket.status}`,
				`is-${ticket.priority}`,
				ticket.pinned ? 'is-pinned' : '',
				fresh ? 'is-new' : '',
				fadingOut ? 'is-closing' : '',
				leaving ? 'is-leaving' : '',
				stamped ? 'is-stamped' : '',
				ticket.steps > 1 ? 'has-steps' : '',
			].join(' ')}
		>
			<div className="tk__clip">
				<div className="tk__shape">
					<div className="tk__stub">
						<button
							type="button"
							className={`tk__check ${ticket.steps > 1 && !ticket.done ? 'has-steps' : ''}`}
							onClick={() => actions.toggle(ticket.id)}
							aria-pressed={ticket.done}
							aria-label={checkLabel(ticket, c)}
							title={ticket.steps > 1 ? c.stepOf(ticket.progress, ticket.steps) : undefined}
						>
							{ticket.steps > 1 && !ticket.done ? (
								<>
									<StepRing steps={ticket.steps} progress={ticket.progress} size={40} stroke={3.5} />
								</>
							) : (
								<Check size={18} strokeWidth={3} aria-hidden />
							)}
						</button>
						<span className="tk__no" aria-hidden>
							#{String(ticket.no).padStart(3, '0')}
						</span>
					</div>

					<div className="tk__body">
						{editing ? (
							<form
								className="tk__edit"
								onSubmit={event => {
									event.preventDefault();
									finishEdit(true);
								}}
							>
								<input
									ref={input}
									className="tk__edit-input"
									value={draft}
									maxLength={MAX_TITLE}
									onChange={event => setDraft(event.target.value)}
									onKeyDown={event => {
										event.stopPropagation();
										if (event.key === 'Escape') finishEdit(false);
									}}
									onBlur={() => finishEdit(true)}
									aria-label={c.edit}
									aria-describedby={`${ticket.id}-hint`}
								/>
								<span id={`${ticket.id}-hint`} className="tk__edit-hint">
									{t.editHint}
								</span>
							</form>
						) : (
							<p className="tk__title" onDoubleClick={() => actions.open(ticket.id)}>
								{ticket.pinned ? <Pin size={14} className="tk__pinned" fill="currentColor" aria-label={c.pinned} /> : null}
								<span>{ticket.title}</span>
							</p>
						)}
						<div className="tk__meta">
							{ticket.status !== 'todo' ? <StatusChip status={ticket.status} c={c} /> : null}
							<RepeatBadge ticket={ticket} c={c} />
							<DetailsHint ticket={ticket} c={c} />
							<span>{ticket.done ? t.closed(timeOf(ticket.doneAt, ar)) : t.opened(timeOf(ticket.createdAt, ar))}</span>
							{ticket.day !== today && !ticket.done ? <span className="tk__tag">{carriedLabel(ticket.day, ar)}</span> : null}
						</div>
						<StepBar ticket={ticket} c={c} />
					</div>

					{ticket.done ? (
						<span className="tk__stamp" aria-hidden>
							<CheckCheck size={14} strokeWidth={2.6} />
							{t.stamp}
						</span>
					) : null}

				</div>
				<div className="tk__actions">
					<TicketMenu ticket={ticket} c={c} actions={actions} />
				</div>
			</div>
		</li>
	);
}

/** The board that replaces the Relay scene once there is at least one ticket. */
export function TicketsBoard({ ar, store, onDelete, leaving, focusComposer }) {
	const t = T[ar ? 'ar' : 'en'];
	const c = COPY[ar ? 'ar' : 'en'];
	const { tickets } = store;
	const [freshId, setFreshId] = useState(null);
	const [view, setView] = useState('list');
	const [hideSaveError, setHideSaveError] = useState(false);
	const [opened, setOpened] = useState(null); // { id, focus }
	const composerInput = useRef(null);
	const listRef = useRef(null);

	const [hideDone, setHideDone] = useState(false);
	const [lingering, setLingering] = useState(() => new Set());
	const doneBefore = useRef(null);

	useEffect(() => {
		setView(readView());
		setHideDone(readHideDone());
	}, []);
	const chooseView = next => {
		setView(next);
		try {
			window.localStorage.setItem(VIEW_KEY, next);
		} catch {
			/* not saved: the choice still applies to this visit */
		}
	};
	const toggleHideDone = () => {
		const next = !hideDone;
		setHideDone(next);
		setLingering(new Set());
		try {
			window.localStorage.setItem(HIDE_DONE_KEY, next ? '1' : '0');
		} catch {
			/* not saved: the choice still applies to this visit */
		}
	};

	// Whatever closed a ticket (check, menu, dialog), it fades out only after its done state shows.
	useEffect(() => {
		const done = new Set(tickets.filter(x => x.done).map(x => x.id));
		const prev = doneBefore.current;
		doneBefore.current = done;
		if (!prev || !hideDone) return undefined;
		const closed = [...done].filter(id => !prev.has(id));
		if (!closed.length) return undefined;
		setLingering(cur => new Set([...cur, ...closed]));
		const timer = window.setTimeout(() => {
			setLingering(cur => {
				const next = new Set(cur);
				closed.forEach(id => next.delete(id));
				return next;
			});
		}, DONE_LINGER_MS);
		return () => window.clearTimeout(timer);
	}, [tickets, hideDone]);

	// Your own order, pinned tickets first.
	const sorted = useMemo(() => sortTickets(tickets), [tickets]);
	const sortedIds = useMemo(() => sorted.map(t => t.id), [sorted]);
	const visible = useMemo(() => (hideDone ? sorted.filter(t => !t.done || lingering.has(t.id)) : sorted), [sorted, hideDone, lingering]);
	const visibleIds = useMemo(() => visible.map(t => t.id), [visible]);
	const byId = useMemo(() => new Map(visible.map(t => [t.id, t])), [visible]);
	const isPinned = id => Boolean(byId.get(id)?.pinned);
	const doneCount = useMemo(() => tickets.filter(t => t.done).length, [tickets]);
	const hiddenCount = tickets.length - visible.length;

	// Reorders only see the shown tickets; hidden ones keep their slots.
	const commitOrder = ids => store.setOrder(visibleIds.length === sortedIds.length ? ids : mergeSubsetOrder(sortedIds, ids));

	// Keyboard / menu alternative to dragging: one step within the ticket's own group.
	const moveVisible = (id, delta) => {
		const next = stepInOrder(visibleIds, id, delta, isPinned);
		if (next) commitOrder(next);
	};

	const list = useSortable({
		containerRef: listRef,
		ids: visibleIds,
		isPinned,
		onCommit: commitOrder,
		axis: 'y',
		rtl: ar,
		enabled: view === 'list',
		floatClass: 'tk-float',
	});
	const listItems = list.order.map(id => byId.get(id)).filter(Boolean);

	const baseActions = {
		toggle: store.toggle,
		setStatus: store.setStatus,
		setSteps: store.setSteps,
		setDetails: store.setDetails,
		setRepeat: store.setRepeat,
		togglePinned: store.togglePinned,
		rename: store.rename,
		move: moveVisible,
		open: (id, focus) => setOpened({ id, focus }),
	};
	const openedTicket = opened ? tickets.find(x => x.id === opened.id) : null;

	// "N" jumps to the add field. Ignored while typing or when a ticket has focus.
	useEffect(() => {
		const onKey = event => {
			if (event.metaKey || event.ctrlKey || event.altKey || isTyping(document.activeElement)) return;
			if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
			if ((event.key === 'n' || event.key === 'N') && !document.activeElement?.closest?.('[data-flip]')) {
				event.preventDefault();
				composerInput.current?.focus();
			}
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, []);

	const now = new Date();
	const date = new Intl.DateTimeFormat(locale(ar), { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
	const total = tickets.length;

	return (
		<section className={`tk-board ${view === 'wall' ? 'is-wall' : 'is-list'} ${leaving ? 'is-leaving' : ''}`} aria-labelledby="tk-heading">
			<header className="tk-board__head">
				<div className="tk-board__titles">
					<p className="tk-board__greet">
						{greetingFor(now, t)}
						{now.getHours() >= 5 && now.getHours() < 17 ? <Sun size={17} aria-hidden /> : <Moon size={16} aria-hidden />}
					</p>
					<h2 id="tk-heading" className="tk-board__title">
						{t.heading}
					</h2>
					<p className="tk-board__date">
						<CalendarDays size={15} aria-hidden />
						<span>{date}</span>
						<span className="tk-board__dot" aria-hidden />
						<span>{t.count(total)}</span>
						{doneCount ? (
							<>
								<span className="tk-board__dot" aria-hidden />
								<span className="tk-board__done">
									<CheckCheck size={15} aria-hidden />
									{t.doneCount(doneCount)}
								</span>
							</>
						) : null}
					</p>
				</div>
				<div className="tk-board__tools">
					<button
						type="button"
						className={`tk-hide-done${hideDone ? ' is-on' : ''}`}
						aria-pressed={hideDone}
						onClick={toggleHideDone}
						title={hideDone ? t.showDone : t.hideDone}
					>
						{hideDone ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
						<span className="tk-hide-done__label">{t.hideDone}</span>
						{hideDone && hiddenCount ? <span className="tk-hide-done__n">{hiddenCount}</span> : null}
					</button>
					<div className="tk-view" role="group" aria-label={t.views}>
						<button type="button" className={view === 'list' ? 'is-on' : ''} aria-pressed={view === 'list'} onClick={() => chooseView('list')}>
							<Ticket size={16} aria-hidden />
							<span>{t.viewList}</span>
						</button>
						<button type="button" className={view === 'wall' ? 'is-on' : ''} aria-pressed={view === 'wall'} onClick={() => chooseView('wall')}>
							<Pin size={16} aria-hidden />
							<span>{t.viewWall}</span>
						</button>
					</div>
				</div>
				</header>

			{store.saveError && !hideSaveError ? (
				<div className="tkx-alert" role="alert">
					<AlertTriangle size={17} aria-hidden />
					<span>{c.saveError}</span>
					<button type="button" className="tkx-iconbtn" onClick={() => setHideSaveError(true)} aria-label={c.dismiss}>
						<X size={15} aria-hidden />
					</button>
				</div>
			) : null}

			<Composer
				ar={ar}
				inputRef={composerInput}
				autoFocus={focusComposer}
				onAdd={(title, opts) => {
					const created = store.add(title, opts);
					if (!created) return;
					setFreshId(created.id);
				}}
			/>

			{hideDone && hiddenCount && !visible.length ? (
				<div className="tk-hidden-note" role="status">
					<CheckCheck size={18} aria-hidden />
					<span>{t.allDoneHidden(hiddenCount)}</span>
					<button type="button" onClick={toggleHideDone}>
						{t.showDone}
					</button>
				</div>
			) : null}

			<div className="tk-content" key={view}>
				{view === 'wall' ? (
					<TicketsWall
						ar={ar}
						c={c}
						items={visible}
						freshId={freshId}
						fadingIds={hideDone ? lingering : null}
						baseActions={baseActions}
						onDelete={onDelete}
						canDrag
						onReorder={commitOrder}
						onAddRequest={() => composerInput.current?.focus()}
						showAdd
					/>
				) : (
					<ul className="tk-list tk-scroll can-drag" ref={listRef}>
						{listItems.map(ticket => (
							<TicketCard
								key={ticket.id}
								ticket={ticket}
								ar={ar}
								c={c}
								fresh={ticket.id === freshId}
								fadingOut={hideDone && lingering.has(ticket.id)}
								baseActions={baseActions}
								onDelete={onDelete}
								canMove
								dragging={list.dragId === ticket.id}
								onPointerDown={list.onPointerDown}
							/>
						))}
					</ul>
				)}
			</div>

			{openedTicket ? <TicketDialog key={openedTicket.id} ticket={openedTicket} ar={ar} c={c} actions={baseActions} focus={opened.focus} onClose={() => setOpened(null)} /> : null}
		</section>
	);
}

/** "Deleted … Undo" — lives in the pane so it survives the board unmounting. */
export function TicketsToast({ ar, item, onUndo, onDismiss }) {
	const t = T[ar ? 'ar' : 'en'];
	useEffect(() => {
		if (!item) return undefined;
		const id = window.setTimeout(onDismiss, 6000);
		return () => window.clearTimeout(id);
	}, [item, onDismiss]);
	return (
		<div className="tk-toast-region" role="status" aria-live="polite">
			{item ? (
				<div className="tk-toast" key={item.key}>
					<Trash2 size={16} aria-hidden />
					<span className="tk-toast__text">{t.deleted(item.items?.[0]?.title || '')}</span>
					<button type="button" className="tk-toast__undo" onClick={onUndo}>
						<Undo2 size={15} aria-hidden />
						{t.undo}
					</button>
					<button type="button" className="tk-toast__close" onClick={onDismiss} aria-label={t.dismiss}>
						<X size={15} aria-hidden />
					</button>
					<span className="tk-toast__timer" aria-hidden />
				</div>
			) : null}
		</div>
	);
}
