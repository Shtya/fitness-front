'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, CheckCheck, ListChecks, Minus, NotebookPen, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { MAX_ITEM_TEXT, MAX_NOTES, MAX_STEPS, MAX_TITLE, itemId } from './use-daily-tickets';
import { StepBar, StepRing } from './tickets-ui';
import './ticket-dialog.css';

/*
 * The opened card: rename it, work through its steps, and keep notes and a checklist inside it.
 * Everything saves as you go (notes when you pause typing or leave the field).
 */
export default function TicketDialog({ ticket, ar, c, actions, focus, onClose }) {
	const titleId = useId();
	const [title, setTitle] = useState(ticket.title);
	const [notes, setNotes] = useState(ticket.notes || '');
	const [newItem, setNewItem] = useState('');
	const box = useRef(null);
	const notesRef = useRef(null);
	const itemRef = useRef(null);
	const back = useRef(null);
	const notesTimer = useRef(0);
	const latest = useRef(ticket);
	latest.current = ticket;

	// Follow changes made elsewhere (another device, the card itself) unless you are typing there.
	useEffect(() => {
		if (document.activeElement?.dataset?.field !== 'title') setTitle(ticket.title);
	}, [ticket.title]);
	useEffect(() => {
		if (document.activeElement !== notesRef.current) setNotes(ticket.notes || '');
	}, [ticket.notes]);

	useEffect(() => {
		back.current = document.activeElement;
		(focus === 'details' ? notesRef.current : box.current?.querySelector('[data-field="title"]'))?.focus();
		const onKey = event => {
			if (event.key === 'Escape') {
				event.stopPropagation();
				onClose();
			} else if (event.key === 'Tab' && box.current) {
				// Keep focus inside the card while it is open.
				const els = [...box.current.querySelectorAll('button:not([disabled]), input, textarea')];
				const first = els[0];
				const last = els[els.length - 1];
				if (event.shiftKey && document.activeElement === first) {
					event.preventDefault();
					last.focus();
				} else if (!event.shiftKey && document.activeElement === last) {
					event.preventDefault();
					first.focus();
				}
			}
		};
		document.addEventListener('keydown', onKey, true);
		return () => {
			document.removeEventListener('keydown', onKey, true);
			const el = back.current;
			window.setTimeout(() => el?.isConnected && el.focus?.(), 0);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const saveTitle = () => {
		const clean = title.trim();
		if (clean && clean !== ticket.title) actions.rename(ticket.id, clean);
		else setTitle(ticket.title);
	};

	const saveNotes = value => {
		window.clearTimeout(notesTimer.current);
		if (value !== (latest.current.notes || '')) actions.setDetails(ticket.id, { notes: value });
	};

	// Unsaved notes still get saved when the card closes.
	useEffect(
		() => () => {
			window.clearTimeout(notesTimer.current);
			const value = notesRef.current?.value;
			if (typeof value === 'string' && value !== (latest.current.notes || '')) actions.setDetails(latest.current.id, { notes: value });
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	const items = ticket.items || [];
	const setItems = next => actions.setDetails(ticket.id, { items: next });
	const addItem = () => {
		const text = newItem.trim();
		if (!text) return;
		setItems([...items, { id: itemId(), text: text.slice(0, MAX_ITEM_TEXT), done: false }]);
		setNewItem('');
		itemRef.current?.focus();
	};
	const doneItems = items.filter(i => i.done).length;
	const split = ticket.steps > 1;

	return createPortal(
		<div className={`tkd ${document.documentElement.classList.contains('dark') ? 'is-dark' : ''}`} dir={ar ? 'rtl' : 'ltr'} onPointerDown={event => event.target === event.currentTarget && onClose()}>
			<div className="tkd__box" ref={box} role="dialog" aria-modal="true" aria-labelledby={titleId}>
				<header className="tkd__head">
					<span id={titleId} className="tkx-sr">
						{ticket.title}
					</span>
					<input
						data-field="title"
						className="tkd__title"
						value={title}
						maxLength={MAX_TITLE}
						aria-label={c.cardTitle}
						dir="auto"
						onChange={event => setTitle(event.target.value)}
						onBlur={saveTitle}
						onKeyDown={event => {
							if (event.key === 'Enter') {
								event.preventDefault();
								event.currentTarget.blur();
							}
						}}
					/>
					<button type="button" className="tkd__icon" onClick={onClose} aria-label={c.close} title={c.close}>
						<X size={18} aria-hidden />
					</button>
				</header>

				<section className={`tkd__steps ${ticket.done ? 'is-done' : ''}`} aria-label={c.steps}>
					<button
						type="button"
						className="tkd__ring"
						onClick={() => actions.toggle(ticket.id)}
						aria-label={ticket.done ? c.reopen : split ? c.nextStep : c.markDone}
						title={ticket.done ? c.reopen : split ? c.nextStep : c.markDone}
					>
						{ticket.done ? (
							<span className="tkd__ring-done">
								<CheckCheck size={26} strokeWidth={2.6} aria-hidden />
							</span>
						) : (
							<StepRing steps={ticket.steps} progress={ticket.progress} size={64} stroke={5} />
						)}
					</button>
					<div className="tkd__steps-text">
						<strong>{split ? c.stepOf(ticket.progress, ticket.steps) : ticket.done ? c.status.done : c.oneStep}</strong>
						<StepBar ticket={ticket} c={c} />
						<div className="tkd__steps-tools">
							<button type="button" className="tkd__chip" onClick={() => actions.setSteps(ticket.id, ticket.steps - 1)} disabled={ticket.steps <= 1} aria-label={c.removeStep} title={c.removeStep}>
								<Minus size={14} aria-hidden />
							</button>
							<span className="tkd__count">{split ? c.stepsN(ticket.steps) : c.oneStep}</span>
							<button type="button" className="tkd__chip" onClick={() => actions.setSteps(ticket.id, ticket.steps + 1)} disabled={ticket.steps >= MAX_STEPS} aria-label={c.addStep} title={c.addStep}>
								<Plus size={14} aria-hidden />
							</button>
							<button type="button" className="tkd__chip tkd__chip--text" onClick={() => actions.setStatus(ticket.id, 'todo')} disabled={ticket.progress === 0 && !ticket.done}>
								<RotateCcw size={14} aria-hidden />
								{split ? c.resetSteps : c.reopen}
							</button>
						</div>
					</div>
				</section>

				<section className="tkd__section">
					<h3 className="tkd__label">
						<NotebookPen size={15} aria-hidden />
						{c.notes}
					</h3>
					<textarea
						ref={notesRef}
						className="tkd__notes"
						value={notes}
						maxLength={MAX_NOTES}
						placeholder={c.notesPlaceholder}
						dir="auto"
						rows={4}
						onChange={event => {
							const value = event.target.value;
							setNotes(value);
							window.clearTimeout(notesTimer.current);
							notesTimer.current = window.setTimeout(() => saveNotes(value), 700);
						}}
						onBlur={event => saveNotes(event.target.value)}
					/>
				</section>

				<section className="tkd__section">
					<h3 className="tkd__label">
						<ListChecks size={15} aria-hidden />
						{c.checklist}
						{items.length ? <span className="tkd__label-n">{c.itemsDone(doneItems, items.length)}</span> : null}
					</h3>
					{items.length ? (
						<ul className="tkd__items">
							{items.map(item => (
								<li key={item.id} className={item.done ? 'is-done' : ''}>
									<button
										type="button"
										className="tkd__tick"
										aria-pressed={item.done}
										aria-label={item.text}
										onClick={() => setItems(items.map(i => (i.id === item.id ? { ...i, done: !i.done } : i)))}
									>
										<Check size={13} strokeWidth={3} aria-hidden />
									</button>
									<span className="tkd__item-text" dir="auto">
										{item.text}
									</span>
									<button type="button" className="tkd__icon tkd__icon--sm" onClick={() => setItems(items.filter(i => i.id !== item.id))} aria-label={`${c.deleteItem}: ${item.text}`} title={c.deleteItem}>
										<Trash2 size={14} aria-hidden />
									</button>
								</li>
							))}
						</ul>
					) : null}
					<form
						className="tkd__add"
						onSubmit={event => {
							event.preventDefault();
							addItem();
						}}
					>
						<Plus size={15} aria-hidden />
						<input
							ref={itemRef}
							value={newItem}
							maxLength={MAX_ITEM_TEXT}
							placeholder={c.itemPlaceholder}
							aria-label={c.addItem}
							dir="auto"
							onChange={event => setNewItem(event.target.value)}
						/>
						<button type="submit" className="tkd__chip tkd__chip--text" disabled={!newItem.trim()}>
							{c.addItem}
						</button>
					</form>
				</section>
			</div>
		</div>,
		document.body,
	);
}
