'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Loader2, MoreVertical, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

/* Small building blocks shared by the Learn views (library, courses, lectures, roadmaps). */

/**
 * Progress as a highlighter stroke over a pencil line: the one marked element of the tab.
 * `size` is 'sm' (rows) or 'lg' (the desk header).
 */
export function HighlighterBar({ value, size = 'sm' }) {
	return (
		<span className={`lrn-hl is-${size}`} aria-hidden>
			<span className="lrn-hl__ink" style={{ '--hl-w': `${Math.max(0, Math.min(100, value))}%` }} />
		</span>
	);
}

/**
 * A small anchored menu of actions (closes on outside click / Escape / scroll).
 * Fixed to the viewport from its button: the shelf and lecture lists clip their rows (rounded
 * frame), so an absolutely placed menu was cut off at the list edge. Opens upward when there is
 * no room below.
 */
export function RowMenu({ c, items }) {
	const [open, setOpen] = useState(false);
	const [place, setPlace] = useState(null); // { top, left, right, up }
	const root = useRef(null);
	const button = useRef(null);
	const list = useRef(null);

	useLayoutEffect(() => {
		if (!open || !button.current) return;
		const b = button.current.getBoundingClientRect();
		const h = list.current?.offsetHeight || 0;
		const up = b.bottom + 4 + h > window.innerHeight - 8 && b.top - 4 - h > 8;
		const rtl = getComputedStyle(button.current).direction === 'rtl';
		setPlace({
			top: up ? b.top - 4 - h : b.bottom + 4,
			// the menu's end edge lines up with the button's end edge
			...(rtl ? { left: Math.max(8, b.left) } : { right: Math.max(8, window.innerWidth - b.right) }),
		});
	}, [open]);

	useEffect(() => {
		if (!open) return undefined;
		const onDown = event => {
			if (!root.current?.contains(event.target)) setOpen(false);
		};
		const onKey = event => {
			if (event.key === 'Escape') setOpen(false);
		};
		const close = () => setOpen(false);
		document.addEventListener('pointerdown', onDown);
		document.addEventListener('keydown', onKey);
		window.addEventListener('scroll', close, true);
		window.addEventListener('resize', close);
		return () => {
			document.removeEventListener('pointerdown', onDown);
			document.removeEventListener('keydown', onKey);
			window.removeEventListener('scroll', close, true);
			window.removeEventListener('resize', close);
		};
	}, [open]);

	useEffect(() => {
		if (!open) setPlace(null);
	}, [open]);
	return (
		<span className="lrn-menu" ref={root}>
			<button
				ref={button}
				type="button"
				className={`lrn-icon-btn${open ? ' is-open' : ''}`}
				aria-haspopup="menu"
				aria-expanded={open}
				title={c.more}
				aria-label={c.more}
				onClick={event => {
					event.stopPropagation();
					setOpen(v => !v);
				}}
			>
				<MoreVertical size={17} />
			</button>
			{open ? (
				<span
					ref={list}
					className="lrn-menu__list"
					role="menu"
					// measured first (hidden), then placed
					style={place ? { top: place.top, left: place.left, right: place.right } : { visibility: 'hidden' }}
				>
					{items.filter(Boolean).map(item => (
						<button
							key={item.label}
							type="button"
							role="menuitem"
							className={item.danger ? 'is-danger' : ''}
							disabled={item.disabled}
							onClick={event => {
								event.stopPropagation();
								setOpen(false);
								item.onSelect();
							}}
						>
							<item.icon size={15} aria-hidden />
							{item.label}
						</button>
					))}
				</span>
			) : null}
		</span>
	);
}

export function Modal({ title, onClose, children, footer, c }) {
	useEffect(() => {
		const onKey = event => {
			if (event.key === 'Escape') onClose();
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [onClose]);
	return (
		<div className="lrn-scrim" role="presentation" onClick={onClose}>
			<div className="lrn-modal" role="dialog" aria-modal="true" aria-label={title} onClick={event => event.stopPropagation()}>
				<header className="lrn-modal__head">
					<h3>{title}</h3>
					<button type="button" className="lrn-icon-btn" onClick={onClose} aria-label={c.close} title={c.close}>
						<X size={18} />
					</button>
				</header>
				<div className="lrn-modal__body">{children}</div>
				{footer ? <footer className="lrn-modal__foot">{footer}</footer> : null}
			</div>
		</div>
	);
}

export function ConfirmDialog({ c, title, onClose, onConfirm }) {
	const [busy, setBusy] = useState(false);
	return (
		<Modal
			c={c}
			title={title}
			onClose={onClose}
			footer={
				<>
					<button type="button" className="lrn-btn is-ghost" onClick={onClose}>
						{c.cancel}
					</button>
					<button
						type="button"
						className="lrn-btn is-danger"
						disabled={busy}
						onClick={async () => {
							setBusy(true);
							try {
								await onConfirm();
								onClose();
							} catch {
								toast.error(c.actionFailed);
								setBusy(false);
							}
						}}
					>
						{busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Trash2 size={15} aria-hidden />}
						{c.delete}
					</button>
				</>
			}
		>
			<p className="lrn-confirm">{c.confirmHint}</p>
		</Modal>
	);
}

export function EmptyState({ icon: Icon, title, text, action }) {
	return (
		<div className="lrn-empty">
			<span className="lrn-empty__icon" aria-hidden>
				<Icon size={26} />
			</span>
			{title ? <h3>{title}</h3> : null}
			{text ? <p>{text}</p> : null}
			{action || null}
		</div>
	);
}

