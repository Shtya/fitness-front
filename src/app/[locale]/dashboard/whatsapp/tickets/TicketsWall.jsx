'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, CheckCheck, GripVertical, Pin, Plus } from 'lucide-react';
import { MAX_TITLE, dayKey } from './use-daily-tickets';
import { PriorityBadge, PushPin, StatusChip, TicketMenu, ticketKeyHandler, useSortable } from './tickets-ui';
import './tickets-wall.css';

/*
 * Wall view: paper notes hanging on twine inside a slim oak frame, each held by a push pin.
 * Notes are laid out in rows (no overlap); the twine sags and every note hangs where the string
 * actually is. Mouse/pen can drag notes to reorder; keyboard and the note menu can move them too.
 */

const FONT_ID = 'tw-hand-fonts';
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@400;700&family=Caveat:wght@500;700&display=swap';
const PINS = ['#e5484d', '#3b82f6', '#22a861', '#a855f7', '#f97316', '#0ea5a4', '#db2777'];

// Twine path: M0 4 Q50 32 100 4 in a 100×20 box stretched to STRING_H px → y(t) = 4 + 56·t·(1−t).
const STRING_H = 22;
const sagAt = t => (4 + 56 * t * (1 - t)) * (STRING_H / 20);

function hash(str) {
	let h = 0;
	for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) | 0;
	return Math.abs(h);
}

function useHandFonts() {
	useEffect(() => {
		if (document.getElementById(FONT_ID)) return;
		const link = document.createElement('link');
		link.id = FONT_ID;
		link.rel = 'stylesheet';
		link.href = FONT_HREF;
		document.head.appendChild(link);
	}, []);
}

/** Columns from the wall's own width: one column turns the wall into a stacked list. */
function useColumns(ref) {
	const [cols, setCols] = useState(3);
	useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return undefined;
		const measure = () => {
			const w = el.clientWidth;
			setCols(w < 400 ? 1 : Math.max(2, Math.min(5, Math.floor(w / 178))));
		};
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, [ref]);
	return cols;
}

function NotePaper({ ticket, c, ar, editing, draft, setDraft, finishEdit, field, actions, onToggleDone }) {
	const carried = ticket.day !== dayKey() && !ticket.done;
	return (
		<div className={`tw-paper is-${ticket.priority} ${ticket.pinned ? 'is-pinned' : ''}`}>
			<div className="tw-top">
				<PriorityBadge priority={ticket.priority} c={c} />
				{ticket.pinned ? (
					<span className="tw-pinned" title={c.pinned}>
						<Pin size={12} fill="currentColor" aria-hidden />
						<span className="tkx-sr">{c.pinned}</span>
					</span>
				) : null}
				<span className="tw-no">#{String(ticket.no).padStart(3, '0')}</span>
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
				<p className="tw-text" dir="auto" onDoubleClick={actions.startEdit}>
					<span>{ticket.title}</span>
				</p>
			)}

			<div className="tw-bottom">
				<StatusChip status={ticket.status} c={c} />
				{carried ? <span className="tw-carried">{ar ? 'من امبارح' : 'From yesterday'}</span> : null}
				<button
					type="button"
					className="tw-check"
					onClick={onToggleDone}
					aria-pressed={ticket.done}
					aria-label={`${ticket.done ? c.reopen : c.markDone}: ${ticket.title}`}
					title={ticket.done ? c.reopen : c.markDone}
				>
					<Check size={15} strokeWidth={3} aria-hidden />
				</button>
			</div>

			{ticket.done ? (
				<span className="tw-stamp" aria-hidden>
					<CheckCheck size={13} strokeWidth={2.8} />
					{c.status.done}
				</span>
			) : null}
		</div>
	);
}

function WallNote({ ticket, c, ar, y, fresh, baseActions, onDelete, canMove, dragging, onPointerDown }) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(ticket.title);
	const [leaving, setLeaving] = useState(false);
	const [stamped, setStamped] = useState(false);
	const field = useRef(null);
	const self = useRef(null);
	const closing = useRef(false);
	const h = hash(ticket.id);
	const tilt = ((h % 7) - 3) * 0.9;

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

	return (
		<li
			ref={self}
			data-flip={ticket.id}
			data-note-id={ticket.id}
			tabIndex={0}
			aria-label={`${ticket.title}. ${c.status[ticket.status]}. ${c.priorityLong[ticket.priority]}${ticket.pinned ? `. ${c.pinned}` : ''}`}
			className={[
				'tw-note',
				ticket.done ? 'is-done' : '',
				`is-${ticket.status}`,
				fresh ? 'is-new' : '',
				leaving ? 'is-leaving' : '',
				stamped ? 'is-stamped' : '',
				editing ? 'is-editing' : '',
				dragging ? 'is-dragging' : '',
			].join(' ')}
			style={{ '--y': `${y}px`, '--tilt': `${tilt}deg` }}
			onKeyDown={editing ? undefined : ticketKeyHandler(ticket, actions, ar)}
			onPointerDown={editing ? undefined : event => onPointerDown(event, ticket.id)}
		>
			<span className="tw-pin">
				<PushPin color={PINS[h % PINS.length]} gold={ticket.pinned} size={ticket.pinned ? 34 : 30} />
			</span>
			<NotePaper
				ticket={ticket}
				c={c}
				ar={ar}
				editing={editing}
				draft={draft}
				setDraft={setDraft}
				finishEdit={finishEdit}
				field={field}
				actions={actions}
				onToggleDone={() => actions.toggle(ticket.id)}
			/>
		</li>
	);
}

export default function TicketsWall({ ar, c, items, freshId, baseActions, onDelete, canDrag, onReorder, onAddRequest, showAdd }) {
	useHandFonts();
	const wallRef = useRef(null);
	const cols = useColumns(wallRef);
	const stacked = cols === 1;
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

	// While dragging, the note already sits where it would land.
	const ordered = order.map(id => byId.get(id)).filter(Boolean);

	const slots = [...ordered.map(ticket => ({ ticket })), ...(showAdd ? [{ add: true }] : [])];
	const rows = [];
	for (let i = 0; i < slots.length; i += cols) rows.push(slots.slice(i, i + cols));

	return (
		<div className={`tw-frame ${stacked ? 'is-stacked' : ''} ${canDrag ? 'can-drag' : ''}`}>
			<div className="tw-wall" ref={wallRef}>
				{rows.map((row, r) => (
					<div className="tw-row" key={r}>
						{stacked ? null : (
							<svg className="tw-string" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden>
								<path d="M0 4 Q50 32 100 4" />
							</svg>
						)}
						<ul className="tw-row__notes" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
							{row.map((slot, i) => {
								const y = stacked ? 0 : sagAt((i + 0.5) / cols);
								if (slot.add) {
									return (
										<li key="add" className="tw-note tw-note--add" data-flip="__add" style={{ '--y': `${y}px`, '--tilt': '0deg' }}>
											<button type="button" className="tw-paper tw-paper--add" onClick={onAddRequest}>
												<Plus size={20} aria-hidden />
												<span>{ar ? 'علّق مهمة جديدة' : 'Pin a new task'}</span>
												<kbd className="tkx-kbd">N</kbd>
											</button>
										</li>
									);
								}
								return (
									<WallNote
										key={slot.ticket.id}
										ticket={slot.ticket}
										c={c}
										ar={ar}
										y={y}
										fresh={slot.ticket.id === freshId}
										baseActions={baseActions}
										onDelete={onDelete}
										canMove={canDrag}
										dragging={dragId === slot.ticket.id}
										onPointerDown={onPointerDown}
									/>
								);
							})}
						</ul>
					</div>
				))}
			</div>

			{canDrag && items.length > 1 && !stacked ? (
				<p className="tw-hint">
					<GripVertical size={13} aria-hidden />
					{c.dragHint}
				</p>
			) : null}
		</div>
	);
}
