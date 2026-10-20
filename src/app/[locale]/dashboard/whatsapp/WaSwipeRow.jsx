'use client';

import { useEffect, useRef } from 'react';
import { dragRowOffset, ROW_ACTION_WIDTH, settleRowSwipe } from './wa-message-gestures';

const AXIS_LOCK_PX = 16;
const CLICK_SUPPRESS_PX = ROW_ACTION_WIDTH * 0.2;

/**
 * Touch swipe actions for an inbox row (phones only). `startActions` sit under the
 * inline-start edge (revealed by dragging toward inline-end), `endActions` under the
 * inline-end edge. Only one row is open at a time (`openKey` / `onOpenChange`).
 * Logical insets keep both sides correct in RTL and LTR.
 */
export default function WaSwipeRow({
	rowKey,
	openKey,
	onOpenChange,
	startActions = [],
	endActions = [],
	enabled = true,
	children,
}) {
	const contentRef = useRef(null);
	const dragRef = useRef(null);
	const offsetRef = useRef(0);
	const suppressClickRef = useRef(false);
	const isOpen = openKey === rowKey;

	const apply = (offset, animate) => {
		const node = contentRef.current;
		if (!node) return;
		offsetRef.current = offset;
		node.style.transition = animate ? 'transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none';
		node.style.transform = offset ? `translateX(${offset}px)` : '';
		node.parentElement?.setAttribute(
			'data-swipe-side',
			offset === 0 ? '' : (offset > 0) !== isRtl(node) ? 'start' : 'end',
		);
	};

	// Another row opened (or the list closed us): slide back.
	useEffect(() => {
		if (!isOpen && offsetRef.current !== 0) apply(0, true);
	}, [isOpen]);

	if (!enabled) return children;

	const onPointerDown = event => {
		if (event.pointerType !== 'touch') return;
		dragRef.current = {
			id: event.pointerId,
			x: event.clientX,
			y: event.clientY,
			base: offsetRef.current,
			axis: null,
		};
	};
	const onPointerMove = event => {
		const drag = dragRef.current;
		if (!drag || drag.id !== event.pointerId) return;
		const dx = event.clientX - drag.x;
		const dy = event.clientY - drag.y;
		if (!drag.axis) {
			if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
			// A tap after scrolling often has a few pixels of jitter. Treat it as a
			// vertical scroll unless the finger clearly travels sideways.
			if (Math.abs(dx) <= Math.abs(dy) || Math.abs(dx) < AXIS_LOCK_PX) {
				drag.axis = 'y';
				dragRef.current = null;
				return;
			}
			drag.axis = 'x';
		}
		const rtl = isRtl(contentRef.current);
		apply(
			dragRowOffset({
				dx: drag.base + dx,
				rtl,
				startSlots: startActions.length,
				endSlots: endActions.length,
			}),
			false,
		);
	};
	const onPointerEnd = event => {
		const drag = dragRef.current;
		if (!drag || drag.id !== event.pointerId) return;
		dragRef.current = null;
		if (drag.axis !== 'x') return;
		const moved = Math.abs(offsetRef.current);
		// Tiny sideways drags (or leftover scroll jitter) must still open the chat.
		if (moved < CLICK_SUPPRESS_PX) {
			apply(0, true);
			onOpenChange?.(null);
			return;
		}
		suppressClickRef.current = true;
		const rtl = isRtl(contentRef.current);
		const settled = settleRowSwipe({
			dx: offsetRef.current,
			rtl,
			startSlots: startActions.length,
			endSlots: endActions.length,
		});
		apply(settled.offset, true);
		onOpenChange?.(settled.offset ? rowKey : null);
	};
	const onClickCapture = event => {
		if (suppressClickRef.current) {
			suppressClickRef.current = false;
			event.preventDefault();
			event.stopPropagation();
			return;
		}
		if (offsetRef.current !== 0) {
			event.preventDefault();
			event.stopPropagation();
			apply(0, true);
			onOpenChange?.(null);
		}
	};
	const runAction = action => event => {
		event.preventDefault();
		event.stopPropagation();
		apply(0, true);
		onOpenChange?.(null);
		action.onSelect?.();
	};
	const renderPane = (actions, side) =>
		actions.length ? (
			<div
				className={`wa-swipe-row__pane is-${side}`}
				style={{ width: actions.length * ROW_ACTION_WIDTH }}
				aria-hidden={!isOpen}
			>
				{actions.map(action => {
					const Icon = action.icon;
					return (
						<button
							key={action.id}
							type="button"
							tabIndex={isOpen ? 0 : -1}
							className={`wa-swipe-row__action is-${action.tone || 'neutral'}`}
							style={{ width: ROW_ACTION_WIDTH }}
							onClick={runAction(action)}
							data-wa-swipe-action={action.id}
						>
							{Icon ? <Icon size={20} aria-hidden="true" /> : null}
							<span>{action.label}</span>
						</button>
					);
				})}
			</div>
		) : null;

	return (
		<div className="wa-swipe-row" data-swipe-side="">
			{renderPane(startActions, 'start')}
			{renderPane(endActions, 'end')}
			<div
				ref={contentRef}
				className="wa-swipe-row__content"
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerEnd}
				onPointerCancel={onPointerEnd}
				onClickCapture={onClickCapture}
			>
				{children}
			</div>
		</div>
	);
}

function isRtl(node) {
	if (!node || typeof window === 'undefined') return false;
	return window.getComputedStyle(node).direction === 'rtl';
}
