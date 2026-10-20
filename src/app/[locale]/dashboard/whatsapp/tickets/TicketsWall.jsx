'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Check, CheckCheck, Pin, Plus } from 'lucide-react';
import { MAX_TITLE, dayKey } from './use-daily-tickets';
import { DetailsHint, PushPin, StatusChip, StepBar, StepRing, TicketMenu, checkLabel, ticketKeyHandler, useSortable } from './tickets-ui';
import './tickets-wall.css';

/*
 * Wall view: pastel sticky notes pinned to a corkboard in a thin wooden frame. Mouse/pen drag
 * reorders; keyboard and each note's menu can move notes too. Double-click a note to open it.
 */

const FONT_ID = 'tw-hand-fonts';
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@400;700&family=Caveat:wght@500;700&display=swap';
const PINS = ['#e5484d', '#3b82f6', '#22a861', '#a855f7', '#f5b400', '#0ea5a4', '#db2777'];
const TONES = ['yellow', 'blue', 'pink', 'green'];

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

const timeOf = (ms, ar) => new Intl.DateTimeFormat(ar ? 'ar-EG-u-nu-latn' : 'en-US', { hour: 'numeric', minute: '2-digit' }).format(ms);

function whenLabel(ticket, c, ar) {
	if (ticket.done && ticket.doneAt) return c.doneAt(timeOf(ticket.doneAt, ar));
	if (ticket.day !== dayKey()) return c.fromYesterday;
	return c.today(timeOf(ticket.createdAt, ar));
}

function NotePaper({ ticket, c, ar, tone, editing, draft, setDraft, finishEdit, field, actions, onToggleDone }) {
	return (
		<div
			className={`tw-paper is-${tone} ${ticket.pinned ? 'is-pinned' : ''} ${ticket.steps > 1 ? 'has-steps' : ''}`}
		>
			<div className="tw-top">
				{ticket.status !== 'todo' ? <StatusChip status={ticket.status} c={c} /> : null}
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
				<p className="tw-text" dir="auto" onDoubleClick={() => actions.open(ticket.id)}>
					<span>{ticket.title}</span>
				</p>
			)}

			

			<div className="tw-bottom">
				<span className={`tw-when ${ticket.day !== dayKey() && !ticket.done ? 'is-carried' : ''}`}>
					<CalendarDays size={14} aria-hidden />
					{whenLabel(ticket, c, ar)}
				</span>
				<DetailsHint ticket={ticket} c={c} />
				<button
					type="button"
					className={`tw-check ${ticket.steps > 1 && !ticket.done ? 'has-steps' : ''}`}
					onClick={onToggleDone}
					aria-pressed={ticket.done}
					aria-label={checkLabel(ticket, c)}
					title={ticket.done ? c.reopen : ticket.steps > 1 ? c.nextStep : c.markDone}
				>
					{ticket.steps > 1 && !ticket.done ? <StepRing steps={ticket.steps} progress={ticket.progress} size={36} stroke={3} /> : <Check size={15} strokeWidth={3} aria-hidden />}
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

function WallNote({ ticket, c, ar, fresh, baseActions, onDelete, canMove, dragging, onPointerDown }) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(ticket.title);
	const [leaving, setLeaving] = useState(false);
	const [stamped, setStamped] = useState(false);
	const field = useRef(null);
	const self = useRef(null);
	const closing = useRef(false);
	const h = hash(ticket.id);
	const tilt = ((h % 7) - 3) * 0.7;
	const tone = TONES[h % TONES.length];

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
			title={canMove ? c.dragHint : undefined}
			aria-label={`${ticket.title}. ${c.status[ticket.status]}${ticket.pinned ? `. ${c.pinned}` : ''}`}
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
			style={{ '--tilt': `${tilt}deg` }}
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
				tone={tone}
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
