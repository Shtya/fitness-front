'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Clock3, ListChecks, NotebookPen, Plus, Repeat } from 'lucide-react';
import { MAX_TITLE } from './use-daily-tickets';
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
 * The checklist, opened from the "0/3" hint: tick items right on the wall. It lives outside the
 * paper (which clips), so it can hang below the card, or above the hint when the board ends.
 */
function ItemsPanel({ ticket, c, up, onToggleItem, onClose }) {
	const items = ticket.items || [];
	const done = items.filter(item => item.done).length;
	const pct = items.length ? Math.round((done / items.length) * 100) : 0;
	return (
		<div
			className={`tw-items${up ? ' is-up' : ''}`}
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
				<span>{c.checklist}</span>
				<span className="tw-items__count">
					{done}/{items.length}
				</span>
			</div>
			<span className="tw-items__bar" aria-hidden>
				<span style={{ width: `${pct}%` }} />
			</span>
			<ul className="tw-items__list">
				{items.map(item => (
					<li key={item.id}>
						<button
							type="button"
							role="checkbox"
							aria-checked={item.done}
							className={`tw-item${item.done ? ' is-done' : ''}`}
							onClick={() => onToggleItem(item.id)}
						>
							<span className="tw-item__box" aria-hidden>
								<Check size={11} strokeWidth={3.4} />
							</span>
							<span className={`tw-item__text ${langClass(item.text)}`} dir="auto">
								{item.text}
							</span>
						</button>
					</li>
				))}
			</ul>
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
	const openItems = () => {
		const card = self.current;
		const board = card?.closest('.tk-scroll');
		let up = false;
		if (card && board) {
			const r = card.getBoundingClientRect();
			const b = board.getBoundingClientRect();
			const needed = Math.min(300, 64 + items.length * 34);
			up = r.bottom + needed > b.bottom && r.top - b.top > r.bottom + needed - b.bottom;
		}
		setItemsPanel({ up });
	};
	const closeItems = () => {
		openedByHover.current = false;
		setItemsPanel(null);
	};
	const toggleItem = itemId =>
		actions.setDetails(ticket.id, { items: items.map(item => (item.id === itemId ? { ...item, done: !item.done } : item)) });
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
			onMouseLeave={itemsPanel ? closeItems : undefined}
			onBlur={event => {
				if (itemsPanel && !openedByHover.current && !event.currentTarget.contains(event.relatedTarget)) closeItems();
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
			{showItems ? <ItemsPanel ticket={ticket} c={c} up={itemsPanel.up} onToggleItem={toggleItem} onClose={closeItems} /> : null}
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
