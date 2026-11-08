'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, CheckCheck, Clock3, CornerDownLeft, ListChecks, Maximize2, NotebookPen, Plus, Repeat, X } from 'lucide-react';
import { MAX_ITEMS, MAX_ITEM_TEXT, MAX_TITLE, itemId } from './use-daily-tickets';
import { PushPin, TicketMenu, checkLabel, langClass, ticketKeyHandler, useSortable, useTicketFonts } from './tickets-ui';
import { ProgressRing, StepPath, markNumbers, noteTheme } from './wall-art';
import './tickets-wall.css';

/*
 * Wall view: pastel sticky notes pinned to a corkboard in a thin wooden frame. Mouse/pen drag
 * reorders; keyboard and each note's menu can move notes too. Double-click a note to open it.
 */

const doneTime = (ms, ar) => new Intl.DateTimeFormat(ar ? 'ar-EG-u-nu-latn' : 'en-US', { hour: 'numeric', minute: '2-digit' }).format(ms);

function NotePaper({ ticket, c, ar, theme, editing, draft, setDraft, finishEdit, field, actions, itemsOpen, onItemsHover, onItemsClick }) {
	const split = ticket.steps > 1;
	const daily = ticket.repeat === 'daily';
	// the only mark on a note: the repeat icon on daily tickets
	const Icon = daily ? Repeat : null;
	const items = ticket.items || [];
	const doneItems = items.filter(item => item.done).length;
	return (
		<div className={`tw-paper is-${theme.tone} is-${theme.category} ${ticket.pinned ? 'is-pinned' : ''} ${split ? 'has-steps' : ''}`}>
			<div className="tw-top">
				{ticket.done ? (
					<span className="tw-done-chip">
						<span className="tw-done-chip__tick" aria-hidden>
							<Check size={12} strokeWidth={3.2} />
						</span>
						{c.status.done}
					</span>
				) : Icon ? (
					<span className={`tw-icon${daily ? ' is-daily' : ''}`} title={daily ? `${c.repeatDaily} · ${c.dailyHint}` : undefined}>
						<Icon size={14} strokeWidth={2.2} aria-hidden />
						{daily ? <span className="tkx-sr">{c.daily}</span> : null}
					</span>
				) : null}
				<span className="tw-no">#{String(ticket.no).padStart(3, '0')}</span>
				{editing ? null : <CornerCheck ticket={ticket} c={c} onToggleDone={() => actions.toggle(ticket.id)} />}
				<TicketMenu ticket={ticket} c={c} actions={actions} />
			</div>

			{editing ? (
				<textarea
					ref={field}
					className="tw-text tw-text--edit"
					value={draft}
					maxLength={MAX_TITLE}
					rows={3}
					dir="auto"
					onChange={event => setDraft(event.target.value)}
					onKeyDown={event => {
						event.stopPropagation();
						if (event.key === 'Enter' && !event.shiftKey) {
							event.preventDefault();
							finishEdit(true);
						} else if (event.key === 'Escape') {
							finishEdit(false);
						}
					}}
					onBlur={() => finishEdit(true)}
					aria-label={c.edit}
				/>
			) : (
				<p className={`tw-text ${langClass(ticket.title)}`} dir="auto" onDoubleClick={() => actions.open(ticket.id)}>
					<span>{markNumbers(ticket.title)}</span>
				</p>
			)}

			{split ? <StepPath steps={ticket.steps} progress={ticket.done ? ticket.steps : ticket.progress} rtl={ar} /> : null}

			<div className="tw-bottom">
				{items.length ? (
					<button
						type="button"
						className={`tw-items-hint${itemsOpen ? ' is-open' : ''}${doneItems === items.length ? ' is-complete' : ''}`}
						aria-expanded={itemsOpen}
						aria-label={c.itemsDone(doneItems, items.length)}
						title={c.itemsDone(doneItems, items.length)}
						onMouseEnter={onItemsHover}
						onClick={onItemsClick}
						onPointerDown={event => event.stopPropagation()}
					>
						<ListChecks size={13} strokeWidth={2.2} aria-hidden />
						<span className="tw-items-hint__n">
							{doneItems}/{items.length}
						</span>
					</button>
				) : null}
				{ticket.notes ? (
					<span className="tw-notes-hint" title={c.hasNotes}>
						<NotebookPen size={13} strokeWidth={2.2} aria-hidden />
						<span className="tkx-sr">{c.hasNotes}</span>
					</span>
				) : null}
				{ticket.done && ticket.doneAt ? (
					<span className="tw-done-at">
						<Clock3 size={12} strokeWidth={2.4} aria-hidden />
						{doneTime(ticket.doneAt, ar)}
					</span>
				) : null}
			</div>
		</div>
	);
}

/**
 * The checklist, opened from the "0/3" hint: tick, add and remove items right on the wall.
 * It lives outside the paper (which clips), so it can hang below the card, or open upward when
 * the board ends. Order never changes under the pointer; finished items just quiet down.
 */
function ItemsPanel({ ticket, c, ar, up, maxHeight, onPlace, onChangeItems, onFinishTicket, onOpenDetails, onClose }) {
	const items = ticket.items || [];
	const done = items.filter(item => item.done).length;
	const total = items.length;
	const left = total - done;
	const complete = total > 0 && left === 0;
	const [draft, setDraft] = useState('');
	const [leavingIds, setLeavingIds] = useState(() => new Set());
	const [freshId, setFreshId] = useState(null);
	const [burst, setBurst] = useState(0);
	const input = useRef(null);
	const wasComplete = useRef(complete);
	const box = useRef(null);

	/*
	 * Fit inside the board, measured before paint. The card has layout containment (container
	 * queries), so a panel hanging out of it adds nothing the board could scroll to: it has to fit.
	 * Below the card if it can, else above it; else the roomier side with the list scrolling inside.
	 * (No scrolling the board: that would slide the card out from under the pointer and close it.)
	 */
	useLayoutEffect(() => {
		const el = box.current;
		const card = el?.parentElement;
		const board = el?.closest('.tk-scroll');
		if (!el || !card || !board) return;
		const list = el.querySelector('.tw-items__list');
		const natural = el.offsetHeight - (list ? list.clientHeight - list.scrollHeight : 0);
		const room = () => {
			const bx = board.getBoundingClientRect();
			const cr = card.getBoundingClientRect();
			return { below: bx.bottom - 8 - (cr.bottom - 6), above: cr.bottom - 40 - (bx.top + 8) };
		};
		const m = room();
		let place;
		if (natural <= m.below) place = { up: false, maxHeight: null };
		else if (natural <= m.above) place = { up: true, maxHeight: null };
		else if (m.above > m.below) place = { up: true, maxHeight: Math.max(150, Math.floor(m.above)) };
		else place = { up: false, maxHeight: Math.max(150, Math.floor(m.below)) };
		onPlace(place);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [total, complete, ticket.done]);

	// A burst of confetti the moment the last item is ticked (not when opening an already-full list).
	useEffect(() => {
		if (complete && !wasComplete.current) setBurst(n => n + 1);
		wasComplete.current = complete;
	}, [complete]);

	const toggle = id => onChangeItems(items.map(item => (item.id === id ? { ...item, done: !item.done } : item)));
	const remove = id => {
		setLeavingIds(prev => new Set(prev).add(id));
		window.setTimeout(() => {
			onChangeItems((ticket.items || []).filter(item => item.id !== id));
			setLeavingIds(prev => {
				const next = new Set(prev);
				next.delete(id);
				return next;
			});
		}, 220);
	};
	const add = () => {
		const text = draft.trim();
		if (!text || total >= MAX_ITEMS) return;
		const id = itemId();
		onChangeItems([...items, { id, text: text.slice(0, MAX_ITEM_TEXT), done: false }]);
		setFreshId(id);
		setDraft('');
	};

	const t = ar
		? {
				title: 'العناصر',
				left: n => (n === 1 ? 'فاضل عنصر واحد' : n === 2 ? 'فاضل عنصرين' : n <= 10 ? `فاضل ${n} عناصر` : `فاضل ${n} عنصر`),
				allDone: 'كله خلص!',
				finish: 'خلّص التذكرة',
				open: 'افتح التذكرة',
				add: 'ضيف عنصر…',
				remove: 'امسح',
			}
		: {
				title: 'Checklist',
				left: n => (n === 1 ? '1 item left' : `${n} items left`),
				allDone: 'All done!',
				finish: 'Finish ticket',
				open: 'Open ticket',
				add: 'Add an item…',
				remove: 'Remove',
			};

	// progress ring
	const size = 34;
	const stroke = 3.5;
	const r = (size - stroke) / 2;
	const len = 2 * Math.PI * r;
	const pct = total ? done / total : 0;

	return (
		<div
			ref={box}
			style={maxHeight ? { maxHeight } : undefined}
			className={`tw-items${up ? ' is-up' : ''}${complete ? ' is-complete' : ''}`}
			role="group"
			aria-label={c.checklist}
			onPointerDown={event => event.stopPropagation()}
			onDoubleClick={event => event.stopPropagation()}
			onKeyDown={event => {
				if (event.key !== 'Escape') return;
				event.stopPropagation();
				onClose();
			}}
		>
			<div className="tw-items__head">
				<span className="tw-items__ring" aria-hidden>
					<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
						<circle className="tw-items__ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
						<circle
							className="tw-items__ring-fill"
							cx={size / 2}
							cy={size / 2}
							r={r}
							strokeWidth={stroke}
							strokeDasharray={len}
							strokeDashoffset={len * (1 - pct)}
						/>
					</svg>
					{complete ? (
						<Check size={14} strokeWidth={3.2} className="tw-items__ring-check" key="done" />
					) : (
						<span className="tw-items__ring-n" key={done}>
							{done}
						</span>
					)}
				</span>
				<span className="tw-items__titles">
					<b>{t.title}</b>
					<small key={complete ? 'done' : left} aria-live="polite">
						{complete ? t.allDone : t.left(left)}
					</small>
				</span>
				<span className="tw-items__total">
					{done}/{total}
				</span>
				{onOpenDetails ? (
					<button type="button" className="tw-items__open" onClick={onOpenDetails} title={t.open} aria-label={t.open}>
						<Maximize2 size={13} strokeWidth={2.4} aria-hidden />
					</button>
				) : null}
				{burst ? (
					<span className="tw-items__burst" key={burst} aria-hidden>
						{Array.from({ length: 14 }, (_, i) => (
							<i key={i} style={{ '--i': i }} />
						))}
					</span>
				) : null}
			</div>

			<ul className="tw-items__list">
				{items.map((item, index) => (
					<li
						key={item.id}
						className={`tw-item-row${leavingIds.has(item.id) ? ' is-leaving' : ''}${item.id === freshId ? ' is-fresh' : ''}`}
						style={{ '--i': Math.min(index, 10) }}
					>
						<button
							type="button"
							role="checkbox"
							aria-checked={item.done}
							className={`tw-item${item.done ? ' is-done' : ''}`}
							onClick={() => toggle(item.id)}
						>
							<span className="tw-item__box" aria-hidden>
								<svg viewBox="0 0 16 16">
									<path d="M3.6 8.4 L6.6 11.3 L12.4 4.9" />
								</svg>
							</span>
							<span className={`tw-item__text ${langClass(item.text)}`} dir="auto">
								<span className="tw-item__label">{item.text}</span>
							</span>
						</button>
						<button
							type="button"
							className="tw-item__del"
							onClick={() => remove(item.id)}
							aria-label={`${t.remove}: ${item.text}`}
							title={t.remove}
						>
							<X size={13} strokeWidth={2.6} aria-hidden />
						</button>
					</li>
				))}
			</ul>

			<form
				className="tw-items__add"
				onSubmit={event => {
					event.preventDefault();
					add();
				}}
				onClick={() => input.current?.focus()}
			>
				<Plus size={14} strokeWidth={2.6} aria-hidden />
				<input
					ref={input}
					value={draft}
					onChange={event => setDraft(event.target.value)}
					onKeyDown={event => {
						// Escape reaches the panel (closes it); other keys stay out of the card's shortcuts.
						if (event.key !== 'Escape') event.stopPropagation();
					}}
					placeholder={t.add}
					maxLength={MAX_ITEM_TEXT}
					dir="auto"
					className={draft ? langClass(draft) : ''}
					aria-label={c.addItem}
					disabled={total >= MAX_ITEMS}
				/>
				{draft.trim() ? (
					<button type="submit" className="tw-items__add-go" aria-label={c.addItem}>
						<CornerDownLeft size={13} strokeWidth={2.6} aria-hidden />
					</button>
				) : null}
			</form>

			{complete && !ticket.done && onFinishTicket ? (
				<button type="button" className="tw-items__finish" onClick={onFinishTicket}>
					<CheckCheck size={15} strokeWidth={2.6} aria-hidden />
					{t.finish}
				</button>
			) : null}
		</div>
	);
}

/** The done / next-step control at the top of the note: the step ring, or a check. */
function CornerCheck({ ticket, c, onToggleDone }) {
	const split = ticket.steps > 1;
	const daily = ticket.repeat === 'daily';
	return (
		<button
			type="button"
			className={`tw-check${split && !ticket.done ? ' has-steps' : ''}${daily && !split && !ticket.done ? ' is-scheduled' : ''}`}
			onClick={onToggleDone}
			onPointerDown={event => event.stopPropagation()}
			aria-pressed={ticket.done}
			aria-label={checkLabel(ticket, c)}
			title={ticket.done ? c.reopen : split ? c.nextStep : c.markDone}
		>
			{split && !ticket.done ? (
				<ProgressRing steps={ticket.steps} progress={ticket.progress} size={38} stroke={3.5} />
			) : daily && !ticket.done ? (
				<>
					<Clock3 size={17} strokeWidth={2.2} className="tw-check__clock" aria-hidden />
					<Check size={16} strokeWidth={3} className="tw-check__tick" aria-hidden />
				</>
			) : (
				<Check size={16} strokeWidth={3} aria-hidden />
			)}
		</button>
	);
}

function WallNote({ ticket, c, ar, fresh, fadingOut, baseActions, onDelete, canMove, dragging, onPointerDown }) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(ticket.title);
	const [leaving, setLeaving] = useState(false);
	const [stamped, setStamped] = useState(false);
	// checklist panel: null = closed, otherwise which way it opens
	const [itemsPanel, setItemsPanel] = useState(null);
	const openedByHover = useRef(false);
	const field = useRef(null);
	const self = useRef(null);
	const closing = useRef(false);
	const theme = noteTheme(ticket);

	useEffect(() => {
		if (!editing) return;
		closing.current = false;
		field.current?.focus();
		field.current?.select();
	}, [editing]);

	const finishEdit = save => {
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
			window.setTimeout(() => onDelete(ticket), 380);
		},
		canMove,
	};

	const items = ticket.items || [];
	// Opens downward unless the board ends first; then it opens upward over the card.
	// The panel measures itself on open and flips up if the board ends below the card.
	const openItems = () => setItemsPanel({ up: false, maxHeight: null });
	const closeItems = () => {
		openedByHover.current = false;
		setItemsPanel(null);
	};
	const changeItems = next => actions.setDetails(ticket.id, { items: next });
	const showItems = Boolean(itemsPanel) && items.length > 0 && !editing && !dragging;

	return (
		<li
			ref={self}
			data-flip={ticket.id}
			data-note-id={ticket.id}
			tabIndex={0}
			title={canMove ? c.dragHint : undefined}
			aria-label={`${ticket.title}. ${c.status[ticket.status]}${ticket.pinned ? `. ${c.pinned}` : ''}`}
			className={[
				'tw-note',
				`tw-tone-${theme.tone}`,
				ticket.done ? 'is-done' : '',
				`is-${ticket.status}`,
				fresh ? 'is-new' : '',
				fadingOut ? 'is-closing' : '',
				leaving ? 'is-leaving' : '',
				stamped ? 'is-stamped' : '',
				editing ? 'is-editing' : '',
				dragging ? 'is-dragging' : '',
				showItems ? 'is-peeking' : '',
			].join(' ')}
			onKeyDown={editing ? undefined : ticketKeyHandler(ticket, actions, ar)}
			onPointerDown={editing ? undefined : event => onPointerDown(event, ticket.id)}
			onMouseLeave={
				itemsPanel
					? event => {
							// Typing a new item keeps the list open even if the pointer drifts off the card.
							const field = event.currentTarget.querySelector('.tw-items__add input');
							if (field && document.activeElement === field && field.value.trim()) return;
							closeItems();
						}
					: undefined
			}
			onBlur={event => {
				const card = event.currentTarget;
				if (itemsPanel && !card.contains(event.relatedTarget) && !card.matches(':hover')) closeItems();
			}}
		>
			<span className="tw-pin">
				<PushPin color={theme.pin} gold={ticket.pinned} size={30} />
			</span>
			<NotePaper
				ticket={ticket}
				c={c}
				ar={ar}
				theme={theme}
				editing={editing}
				draft={draft}
				setDraft={setDraft}
				finishEdit={finishEdit}
				field={field}
				actions={actions}
				itemsOpen={showItems}
				onItemsHover={() => {
					if (itemsPanel) return;
					openedByHover.current = true;
					openItems();
				}}
				onItemsClick={() => {
					// A hover already opened it: the click (mouse) keeps it; touch and keyboard toggle.
					if (openedByHover.current && itemsPanel) return;
					if (itemsPanel) closeItems();
					else openItems();
				}}
			/>
			{showItems ? (
				<ItemsPanel
					ticket={ticket}
					c={c}
					ar={ar}
					up={itemsPanel.up}
					maxHeight={itemsPanel.maxHeight}
					onPlace={place =>
						setItemsPanel(prev => (!prev || (prev.up === place.up && prev.maxHeight === place.maxHeight) ? prev : { ...prev, ...place }))
					}
					onChangeItems={changeItems}
					onFinishTicket={() => {
						// Straight to done, even for a ticket split into steps.
						setStamped(true);
						actions.setStatus(ticket.id, 'done');
						closeItems();
					}}
					onOpenDetails={() => {
						closeItems();
						actions.open(ticket.id, 'details');
					}}
					onClose={() => {
						closeItems();
						self.current?.focus();
					}}
				/>
			) : null}
		</li>
	);
}

export default function TicketsWall({ ar, c, items, freshId, fadingIds, baseActions, onDelete, canDrag, onReorder, onAddRequest, showAdd }) {
	useTicketFonts();
	const wallRef = useRef(null);
	const ids = useMemo(() => items.map(t => t.id), [items]);
	const byId = useMemo(() => new Map(items.map(t => [t.id, t])), [items]);
	const { dragId, order, onPointerDown } = useSortable({
		containerRef: wallRef,
		ids,
		isPinned: id => Boolean(byId.get(id)?.pinned),
		onCommit: onReorder,
		axis: 'grid',
		rtl: ar,
		enabled: canDrag,
		floatClass: 'tw-float',
		pickSource: li => li.querySelector('.tw-paper'),
	});
	const ordered = order.map(id => byId.get(id)).filter(Boolean);

	return (
		<div className={`tw-frame ${canDrag ? 'can-drag' : ''}`}>
			<div className="tw-board">
				<div className="tw-wall tk-scroll" ref={wallRef}>
					<ul className="tw-grid">
						{ordered.map(ticket => (
							<WallNote
								key={ticket.id}
								ticket={ticket}
								c={c}
								ar={ar}
								fresh={ticket.id === freshId}
								fadingOut={Boolean(fadingIds?.has(ticket.id))}
								baseActions={baseActions}
								onDelete={onDelete}
								canMove={canDrag}
								dragging={dragId === ticket.id}
								onPointerDown={onPointerDown}
							/>
						))}
						{showAdd ? (
							<li className="tw-note tw-note--add" data-flip="__add">
								<button type="button" className="tw-paper tw-paper--add" onClick={onAddRequest}>
									<span className="tw-add__icon" aria-hidden>
										<Plus size={20} />
									</span>
									<span className="tw-add__label">{ar ? 'علّق مهمة جديدة' : 'Pin a new task'}</span>
								</button>
							</li>
						) : null}
					</ul>
				</div>
			</div>
		</div>
	);
}
