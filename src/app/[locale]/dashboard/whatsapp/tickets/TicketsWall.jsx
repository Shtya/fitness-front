'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Clock3, Plus, Repeat } from 'lucide-react';
import { MAX_TITLE } from './use-daily-tickets';
import { DetailsHint, PushPin, TicketMenu, checkLabel, ticketKeyHandler, useSortable } from './tickets-ui';
import { BrushLine, NoteArt, PageCurl, ProgressRing, StepPath, markNumbers, noteTheme } from './wall-art';
import './tickets-wall.css';

/*
 * Wall view: pastel sticky notes pinned to a corkboard in a thin wooden frame. Mouse/pen drag
 * reorders; keyboard and each note's menu can move notes too. Double-click a note to open it.
 */

const FONT_ID = 'tw-hand-fonts';
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@400;700&family=Kalam:wght@400;700&display=swap';

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

function NotePaper({ ticket, c, ar, theme, editing, draft, setDraft, finishEdit, field, actions }) {
	const split = ticket.steps > 1;
	const daily = ticket.repeat === 'daily';
	// the only mark on a note: the repeat icon on daily tickets
	const Icon = daily ? Repeat : null;
	return (
		<div className={`tw-paper is-${theme.tone} is-${theme.category} ${ticket.pinned ? 'is-pinned' : ''} ${split ? 'has-steps' : ''}`}>
			<NoteArt art={theme.art} />
			<span className="tw-slot" aria-hidden />

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
				<p className="tw-text" dir="auto" onDoubleClick={() => actions.open(ticket.id)}>
					<span>{markNumbers(ticket.title)}</span>
					<BrushLine />
				</p>
			)}

			{split ? <StepPath steps={ticket.steps} progress={ticket.done ? ticket.steps : ticket.progress} rtl={ar} /> : null}

			<div className="tw-bottom">
				<DetailsHint ticket={ticket} c={c} />
			</div>
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

function WallNote({ ticket, c, ar, fresh, baseActions, onDelete, canMove, dragging, onPointerDown }) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(ticket.title);
	const [leaving, setLeaving] = useState(false);
	const [stamped, setStamped] = useState(false);
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
				leaving ? 'is-leaving' : '',
				stamped ? 'is-stamped' : '',
				editing ? 'is-editing' : '',
				dragging ? 'is-dragging' : '',
			].join(' ')}
			onKeyDown={editing ? undefined : ticketKeyHandler(ticket, actions, ar)}
			onPointerDown={editing ? undefined : event => onPointerDown(event, ticket.id)}
		>
			<span className="tw-pin">
				<PushPin color={theme.pin} gold={ticket.pinned} size={38} />
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
			/>
			<PageCurl />
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
