'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowUp, Check, Circle, CircleDot, Flag, MoreHorizontal, Pencil, Pin, PinOff, Play, RotateCcw, Trash2, Undo2 } from 'lucide-react';
import './tickets-ui.css';

/* ─── Menu ───────────────────────────────────────────────────────── */
const GAP = 6;
const EDGE = 8;

/**
 * Small accessible menu. `items`: { id, label, icon, onSelect, checked, danger, hint } or
 * { divider: true } or { heading }. Arrow keys move, Esc closes and returns focus.
 * The list is portalled to <body> and positioned against the trigger, so scrolling boards and
 * clipped cards never cut it off; it flips above the trigger when there is no room below.
 */
export function MiniMenu({ label, icon, text, items, align = 'end', className = '', buttonClassName = 'tkx-iconbtn', disabled, title }) {
	const [open, setOpen] = useState(false);
	const [pos, setPos] = useState(null); // { left, top, up }
	const wrap = useRef(null);
	const btn = useRef(null);
	const list = useRef(null);
	const id = useId();

	const close = (refocus = true) => {
		setOpen(false);
		setPos(null);
		if (refocus) window.setTimeout(() => btn.current?.focus(), 0);
	};

	// Measure the list, then place it next to the trigger inside the viewport.
	const place = () => {
		const b = btn.current;
		const l = list.current;
		if (!b || !l) return;
		const r = b.getBoundingClientRect();
		if (r.bottom < 0 || r.top > window.innerHeight) {
			close(false);
			return;
		}
		const w = l.offsetWidth;
		const h = l.offsetHeight;
		const rtl = (wrap.current?.closest('[dir]')?.getAttribute('dir') || document.documentElement.dir) === 'rtl';
		const toEnd = (align === 'end') !== rtl; // "end" is the right edge in LTR, the left in RTL
		let left = toEnd ? r.right - w : r.left;
		left = Math.min(Math.max(EDGE, left), window.innerWidth - w - EDGE);
		const below = r.bottom + GAP;
		const above = r.top - GAP - h;
		const up = below + h > window.innerHeight - EDGE && above >= EDGE;
		let top = up ? above : below;
		top = Math.min(Math.max(EDGE, top), window.innerHeight - h - EDGE);
		setPos(prev => (prev && prev.left === left && prev.top === top && prev.up === up ? prev : { left, top, up }));
	};

	useLayoutEffect(() => {
		if (!open || !list.current) return undefined;
		// Carry the board's colour tokens and direction into the portal.
		copyCustomProps(wrap.current, list.current);
		const dir = wrap.current?.closest('[dir]')?.getAttribute('dir');
		if (dir) list.current.setAttribute('dir', dir);
		place();
		list.current.querySelector('[role^="menuitem"]:not([disabled])')?.focus({ preventScroll: true });
		const onDown = event => {
			if (!wrap.current?.contains(event.target) && !list.current?.contains(event.target)) close(false);
		};
		const onMove = () => place();
		document.addEventListener('pointerdown', onDown);
		window.addEventListener('scroll', onMove, true);
		window.addEventListener('resize', onMove);
		return () => {
			document.removeEventListener('pointerdown', onDown);
			window.removeEventListener('scroll', onMove, true);
			window.removeEventListener('resize', onMove);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	const onKeyDown = event => {
		const els = [...list.current.querySelectorAll('[role^="menuitem"]:not([disabled])')];
		const i = els.indexOf(document.activeElement);
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			els[(i + 1) % els.length]?.focus();
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			els[(i - 1 + els.length) % els.length]?.focus();
		} else if (event.key === 'Home') {
			event.preventDefault();
			els[0]?.focus();
		} else if (event.key === 'End') {
			event.preventDefault();
			els[els.length - 1]?.focus();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			close();
		} else if (event.key === 'Tab') {
			// The list lives at the end of <body>: hand focus back to the trigger, then let Tab move on.
			close(false);
			btn.current?.focus();
		}
	};

	return (
		<div className={`tkx-menu ${className}`} ref={wrap}>
			<button
				ref={btn}
				type="button"
				className={`${buttonClassName} ${open ? 'is-open' : ''}`}
				aria-haspopup="menu"
				aria-expanded={open}
				aria-controls={open ? id : undefined}
				aria-label={label}
				title={title || label}
				disabled={disabled}
				onClick={event => {
					event.stopPropagation();
					if (open) close(false);
					else setOpen(true);
				}}
			>
				{icon}
				{text ? <span>{text}</span> : null}
			</button>
			{open
				? createPortal(
						<div
							id={id}
							ref={list}
							role="menu"
							aria-label={label}
							className={`tkx-menu__list is-portal ${pos?.up ? 'is-up' : ''}`}
							style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: 0, visibility: 'hidden' }}
							onKeyDown={onKeyDown}
							onPointerDown={event => event.stopPropagation()}
						>
							{items.map((item, i) => {
								if (item.divider) return <div key={`d${i}`} className="tkx-menu__divider" role="separator" />;
								if (item.heading) {
									return (
										<div key={`h${i}`} className="tkx-menu__heading" role="presentation">
											{item.heading}
										</div>
									);
								}
								const checkable = item.checked !== undefined;
								return (
									<button
										key={item.id}
										type="button"
										role={checkable ? 'menuitemradio' : 'menuitem'}
										aria-checked={checkable ? Boolean(item.checked) : undefined}
										className={`tkx-menu__item ${item.danger ? 'is-danger' : ''} ${item.checked ? 'is-checked' : ''}`}
										disabled={item.disabled}
										onClick={event => {
											event.stopPropagation();
											const keep = item.onSelect?.();
											if (keep !== true) close();
											else window.requestAnimationFrame(place);
										}}
									>
										<span className="tkx-menu__icon" aria-hidden>
											{item.icon}
										</span>
										<span className="tkx-menu__label">{item.label}</span>
										{item.hint ? <kbd className="tkx-kbd">{item.hint}</kbd> : null}
										{checkable && item.checked ? <Check size={15} className="tkx-menu__tick" aria-hidden /> : null}
									</button>
								);
							})}
						</div>,
						document.body,
					)
				: null}
		</div>
	);
}

/* ─── Badges ─────────────────────────────────────────────────────── */
export function PriorityBadge({ priority, c, compact }) {
	return (
		<span className={`tkx-prio is-${priority}`} title={c.priorityLong[priority]}>
			<Flag size={11} strokeWidth={2.6} aria-hidden />
			{compact ? <span className="tkx-sr">{c.priorityLong[priority]}</span> : c.priority[priority]}
		</span>
	);
}

export function StatusChip({ status, c }) {
	return (
		<span className={`tkx-status is-${status}`}>
			<span className="tkx-status__dot" aria-hidden />
			{c.status[status]}
		</span>
	);
}

/* ─── 3D push pin ────────────────────────────────────────────────── */
let pinSeq = 0;
export function PushPin({ color, size = 30, gold }) {
	const [gid] = useState(() => `tkpin${(pinSeq += 1)}`);
	const tone = gold ? '#f2b51d' : color;
	return (
		<svg className="tkx-pushpin" width={size} height={size} viewBox="0 0 32 32" aria-hidden>
			<defs>
				<radialGradient id={`${gid}h`} cx="38%" cy="32%" r="70%">
					<stop offset="0" stopColor="#fff" stopOpacity="0.85" />
					<stop offset="0.28" stopColor={tone} />
					<stop offset="1" style={{ stopColor: `color-mix(in srgb, ${tone} 62%, #000)` }} />
				</radialGradient>
				<linearGradient id={`${gid}n`} x1="0" x2="1">
					<stop offset="0" stopColor="#8c9196" />
					<stop offset="0.5" stopColor="#e3e6e8" />
					<stop offset="1" stopColor="#7c8186" />
				</linearGradient>
			</defs>
			{/* needle going into the wall, then its shadow */}
			<path d="M16 17.5 L16 29" stroke={`url(#${gid}n)`} strokeWidth="1.6" strokeLinecap="round" />
			<ellipse cx="17.5" cy="29.4" rx="2.6" ry="0.9" fill="rgba(0,0,0,0.22)" />
			{/* collar + head */}
			<ellipse cx="16" cy="17.2" rx="5.2" ry="1.9" fill={tone} />
			<ellipse cx="16" cy="17.2" rx="5.2" ry="1.9" fill="rgba(0,0,0,0.28)" />
			<path d="M12.2 16.6 C12.6 13.4 13.6 11.6 16 11.6 C18.4 11.6 19.4 13.4 19.8 16.6 Z" fill={tone} />
			<path d="M12.2 16.6 C12.6 13.4 13.6 11.6 16 11.6 C18.4 11.6 19.4 13.4 19.8 16.6 Z" fill="rgba(0,0,0,0.18)" />
			<circle cx="16" cy="8.4" r="5.6" fill={`url(#${gid}h)`} />
			<circle cx="16" cy="8.4" r="5.6" fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="0.6" />
			<ellipse cx="14" cy="6.3" rx="1.9" ry="1.2" fill="#fff" opacity="0.7" />
		</svg>
	);
}

/* ─── Ticket actions ─────────────────────────────────────────────── */
export function ticketMenuItems(ticket, c, actions) {
	const { setStatus, toggle, setPriority, togglePinned, startEdit, move, remove, canMove } = actions;
	const items = [
		ticket.done
			? { id: 'reopen', label: c.reopen, icon: <RotateCcw size={15} />, onSelect: () => toggle(ticket.id), hint: 'Space' }
			: { id: 'done', label: c.markDone, icon: <Check size={15} />, onSelect: () => toggle(ticket.id), hint: 'Space' },
		ticket.status === 'doing'
			? { id: 'todo', label: c.backToTodo, icon: <Circle size={15} />, onSelect: () => setStatus(ticket.id, 'todo'), hint: 'S' }
			: { id: 'start', label: c.start, icon: <Play size={15} />, onSelect: () => setStatus(ticket.id, 'doing'), hint: 'S', disabled: ticket.done },
		{ id: 'pin', label: ticket.pinned ? c.unpin : c.pin, icon: ticket.pinned ? <PinOff size={15} /> : <Pin size={15} />, onSelect: () => togglePinned(ticket.id), hint: 'P' },
		{ id: 'edit', label: c.edit, icon: <Pencil size={15} />, onSelect: () => startEdit(), hint: 'Enter' },
		{ divider: true },
		{ heading: c.filterPriority },
		...['high', 'medium', 'low'].map((p, i) => ({
			id: `p-${p}`,
			label: c.priority[p],
			icon: <CircleDot size={15} className={`tkx-prio-ico is-${p}`} />,
			checked: ticket.priority === p,
			onSelect: () => setPriority(ticket.id, p),
			hint: String(i + 1),
		})),
	];
	if (canMove) {
		items.push(
			{ divider: true },
			{ id: 'up', label: c.moveEarlier, icon: <ArrowUp size={15} />, onSelect: () => move(ticket.id, -1), hint: 'Alt ←' },
			{ id: 'down', label: c.moveLater, icon: <ArrowDown size={15} />, onSelect: () => move(ticket.id, 1), hint: 'Alt →' },
		);
	}
	items.push({ divider: true }, { id: 'del', label: c.del, icon: <Trash2 size={15} />, onSelect: () => remove(ticket), danger: true, hint: 'Del' });
	return items;
}

export function TicketMenu({ ticket, c, actions }) {
	return (
		<MiniMenu
			label={`${c.menu}: ${ticket.title}`}
			title={c.menu}
			icon={<MoreHorizontal size={17} aria-hidden />}
			items={ticketMenuItems(ticket, c, actions)}
			buttonClassName="tkx-iconbtn tkx-iconbtn--ticket"
		/>
	);
}

/** Keyboard shortcuts on a focused ticket (the element itself, not its inner controls). */
export function ticketKeyHandler(ticket, actions, rtl) {
	return event => {
		if (event.target !== event.currentTarget) return;
		const { setStatus, toggle, setPriority, togglePinned, startEdit, move, remove, canMove } = actions;
		const k = event.key;
		let handled = true;
		if (k === 'Enter') startEdit();
		else if (k === ' ') toggle(ticket.id);
		else if (k === 's' || k === 'S') setStatus(ticket.id, ticket.status === 'doing' ? 'todo' : 'doing');
		else if (k === 'p' || k === 'P') togglePinned(ticket.id);
		else if (k === '1' || k === '2' || k === '3') setPriority(ticket.id, ['high', 'medium', 'low'][Number(k) - 1]);
		else if (k === 'Delete' || k === 'Backspace') remove(ticket);
		else if (event.altKey && canMove && (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown')) {
			const earlier = k === 'ArrowUp' || (rtl ? k === 'ArrowRight' : k === 'ArrowLeft');
			move(ticket.id, earlier ? -1 : 1);
			const el = event.currentTarget;
			window.setTimeout(() => el.isConnected && el.focus(), 0);
		} else handled = false;
		if (handled) event.preventDefault();
	};
}

/* ─── FLIP: animate items to their new place after a reorder ─────── */
const FLIP_ID = 'tk-flip';

/**
 * Remembers every [data-flip] item's *layout* box (relative to the container, without any
 * transform) and, when an item lands somewhere else, slides it from where it visibly was.
 * An in-flight slide is read from the computed transform and cancelled before measuring, so
 * rapid re-renders (dragging) never compound. Returns the layout map for hit-testing.
 */
export function useFlip(containerRef, active = true) {
	const layout = useRef(new Map());
	const lastOrder = useRef('');
	useLayoutEffect(() => {
		const root = containerRef.current;
		if (!root) return;
		const base = root.getBoundingClientRect();
		// Only a change of order (drag, add, remove) slides items; a resize or re-wrap just re-measures.
		const order = [...root.querySelectorAll('[data-flip]')].map(el => el.dataset.flip).join('|');
		const reordered = order !== lastOrder.current;
		lastOrder.current = order;
		const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
		const next = new Map();
		root.querySelectorAll('[data-flip]').forEach(el => {
			const id = el.dataset.flip;
			let ox = 0;
			let oy = 0;
			const running = el.getAnimations().filter(a => a.id === FLIP_ID);
			if (running.length) {
				const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
				ox = m.m41;
				oy = m.m42;
				running.forEach(a => a.cancel());
			}
			const r = el.getBoundingClientRect();
			const box = { left: r.left - base.left, top: r.top - base.top, width: r.width, height: r.height };
			box.right = box.left + box.width;
			box.bottom = box.top + box.height;
			next.set(id, box);
			const prev = layout.current.get(id);
			if (!active || reduce || !prev || (!reordered && !running.length)) return;
			const dx = prev.left + ox - box.left;
			const dy = prev.top + oy - box.top;
			if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
			const anim = el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }], {
				duration: 260,
				easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)',
			});
			anim.id = FLIP_ID;
		});
		layout.current = next;
	});
	return layout;
}

/** Move `id` one step within its own group (pinned / not pinned) of the shown order. */
export function stepInOrder(ids, id, delta, isPinned) {
	const i = ids.indexOf(id);
	const j = i + delta;
	if (i < 0 || j < 0 || j >= ids.length || isPinned(ids[j]) !== isPinned(id)) return null;
	const next = ids.slice();
	[next[i], next[j]] = [next[j], next[i]];
	return next;
}

function copyCustomProps(from, to) {
	const cs = getComputedStyle(from);
	for (let i = 0; i < cs.length; i += 1) {
		const name = cs[i];
		if (name.startsWith('--')) to.style.setProperty(name, cs.getPropertyValue(name));
	}
}

/**
 * Pointer drag-and-drop reordering shared by the list and the wall.
 * - Mouse / pen only (touch keeps scrolling; the menu and Alt+arrows move tickets there).
 * - A clone follows the pointer; the real item stays as a placeholder that moves with the order.
 * - Targets come from the stable layout boxes (not the moving pixels), before/after by the
 *   pointer's side of the target's centre; RTL aware.
 * - Pinned and unpinned tickets each reorder within their own group.
 * - Auto-scrolls the board when the pointer nears its top or bottom edge.
 */
export function useSortable({ containerRef, ids, isPinned, onCommit, axis = 'grid', rtl = false, enabled = true, floatClass = '', pickSource }) {
	const [drag, setDrag] = useState(null); // { id, order }
	const layout = useFlip(containerRef, true);
	const live = useRef(null);
	const props = useRef({});
	props.current = { ids, isPinned, onCommit, axis, rtl };

	useEffect(() => () => live.current?.cleanup?.(), []);

	const onPointerDown = (event, id) => {
		if (!enabled || event.button !== 0 || event.pointerType === 'touch') return;
		if (event.target.closest('button, textarea, input, a, [role="menu"], [contenteditable="true"]')) return;
		const item = event.currentTarget;
		const source = pickSource ? pickSource(item) : item;
		const rect = source.getBoundingClientRect();
		const start = { x: event.clientX, y: event.clientY };
		const off = { x: start.x - rect.left, y: start.y - rect.top };
		const scroller = containerRef.current?.closest('.tk-scroll') || containerRef.current;
		let armed = false;
		let last = start;
		let float = null;
		let raf = 0;

		const place = () => {
			if (float) float.style.transform = `translate(${last.x - off.x}px, ${last.y - off.y}px)`;
		};

		const retarget = () => {
			const root = containerRef.current;
			if (!root || !live.current) return;
			const { isPinned: pinned, axis: ax, rtl: isRtl } = props.current;
			const base = root.getBoundingClientRect();
			const px = last.x - base.left;
			const py = last.y - base.top;
			let target = null;
			for (const [key, box] of layout.current) {
				if (key !== id && live.current.order.includes(key) && px >= box.left && px <= box.right && py >= box.top && py <= box.bottom) {
					target = key;
					break;
				}
			}
			if (!target) return;
			const box = layout.current.get(target);
			const after = ax === 'y' ? py > box.top + box.height / 2 : isRtl ? px < box.left + box.width / 2 : px > box.left + box.width / 2;
			const rest = live.current.order.filter(k => k !== id);
			let at = rest.indexOf(target) + (after ? 1 : 0);
			const pinnedCount = rest.filter(pinned).length;
			at = pinned(id) ? Math.min(at, pinnedCount) : Math.max(at, pinnedCount);
			rest.splice(at, 0, id);
			if (rest.join('|') === live.current.order.join('|')) return;
			live.current.order = rest;
			setDrag({ id, order: rest });
		};

		const loop = () => {
			const r = scroller.getBoundingClientRect();
			const edge = 64;
			let dy = 0;
			if (last.y < r.top + edge) dy = -Math.ceil(((r.top + edge - last.y) / edge) * 14);
			else if (last.y > r.bottom - edge) dy = Math.ceil(((last.y - (r.bottom - edge)) / edge) * 14);
			if (dy) {
				const before = scroller.scrollTop;
				scroller.scrollTop += dy;
				if (scroller.scrollTop !== before) retarget();
			}
			raf = requestAnimationFrame(loop);
		};

		const arm = () => {
			armed = true;
			window.getSelection?.().removeAllRanges();
			live.current = { id, order: props.current.ids.slice(), cleanup };
			setDrag({ id, order: live.current.order });
			float = document.createElement('div');
			float.className = floatClass;
			float.setAttribute('aria-hidden', 'true');
			const dir = item.closest('[dir]')?.getAttribute('dir');
			if (dir) float.setAttribute('dir', dir);
			copyCustomProps(source, float);
			float.style.width = `${rect.width}px`;
			const clone = source.cloneNode(true);
			// A copy for the eye only: no ids, no hooks the board looks for, nothing focusable.
			for (const n of [clone, ...clone.querySelectorAll('*')]) {
				for (const attr of ['id', 'data-flip', 'data-note-id', 'tabindex']) n.removeAttribute(attr);
				if (n.matches?.('button, input, textarea, a')) n.setAttribute('tabindex', '-1');
			}
			float.appendChild(clone);
			document.body.appendChild(float);
			document.body.classList.add('tk-dragging-body');
			place();
			raf = requestAnimationFrame(loop);
		};

		const move = e => {
			last = { x: e.clientX, y: e.clientY };
			if (!armed) {
				if (Math.hypot(last.x - start.x, last.y - start.y) < 6) return;
				arm();
			}
			place();
			retarget();
		};

		function cleanup() {
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
			window.removeEventListener('pointercancel', cancel);
			window.removeEventListener('keydown', onKey, true);
			cancelAnimationFrame(raf);
			float?.remove();
			float = null;
			document.body.classList.remove('tk-dragging-body');
		}

		function finish(commit) {
			const state = live.current;
			cleanup();
			live.current = null;
			setDrag(null);
			if (!armed || !state || !commit) return;
			if (state.order.join('|') !== props.current.ids.join('|')) props.current.onCommit(state.order);
			// The pointerup that ends a drag must not count as a click on whatever is under it.
			const swallow = ev => {
				ev.stopPropagation();
				ev.preventDefault();
			};
			window.addEventListener('click', swallow, { capture: true, once: true });
			window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
		}

		function up() {
			finish(true);
		}

		function cancel() {
			finish(false);
		}

		function onKey(e) {
			if (e.key === 'Escape' && armed) {
				e.preventDefault();
				e.stopPropagation();
				finish(false);
			}
		}

		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up);
		window.addEventListener('pointercancel', cancel);
		window.addEventListener('keydown', onKey, true);
	};

	const order = drag?.order || ids;
	return { dragId: drag?.id || null, order, onPointerDown, layout };
}

export { Undo2 };
