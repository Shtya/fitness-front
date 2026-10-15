'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, MoreHorizontal, Reply } from 'lucide-react';

const BAR_GAP = 8;
const VIEWPORT_MARGIN = 10;

/**
 * Compact action bar that appears when a message is tapped on a phone: quick
 * reactions, reply, copy and "more" (the full long-press sheet). Closes on an
 * outside tap, scroll, resize or Escape.
 */
export default function MessageQuickActions({
	open,
	anchorRect,
	mine = false,
	locale = 'en',
	reactions = [],
	canCopy = false,
	canReact = true,
	onReact,
	onReply,
	onCopy,
	onMore,
	onClose,
}) {
	const barRef = useRef(null);
	const [pos, setPos] = useState(null);
	const ar = locale === 'ar';

	useLayoutEffect(() => {
		if (!open || !anchorRect) {
			setPos(null);
			return;
		}
		const node = barRef.current;
		const width = node?.offsetWidth || 280;
		const height = node?.offsetHeight || 48;
		const viewportW = window.innerWidth || 390;
		const viewportH = window.innerHeight || 780;
		const above = anchorRect.top - height - BAR_GAP;
		const top =
			above >= VIEWPORT_MARGIN
				? above
				: Math.min(viewportH - height - VIEWPORT_MARGIN, anchorRect.bottom + BAR_GAP);
		const preferredLeft = mine ? anchorRect.right - width : anchorRect.left;
		const left = Math.min(
			Math.max(VIEWPORT_MARGIN, preferredLeft),
			viewportW - width - VIEWPORT_MARGIN,
		);
		setPos({ top, left });
	}, [open, anchorRect, mine]);

	useEffect(() => {
		if (!open) return undefined;
		const close = () => onClose?.();
		const onPointerDown = event => {
			if (barRef.current?.contains(event.target)) return;
			onClose?.();
		};
		const onKey = event => {
			if (event.key === 'Escape') onClose?.();
		};
		// Next tick: the tap that opened the bar must not immediately close it.
		const timer = window.setTimeout(() => {
			document.addEventListener('pointerdown', onPointerDown, true);
		}, 0);
		window.addEventListener('scroll', close, true);
		window.addEventListener('resize', close);
		document.addEventListener('keydown', onKey);
		return () => {
			window.clearTimeout(timer);
			document.removeEventListener('pointerdown', onPointerDown, true);
			window.removeEventListener('scroll', close, true);
			window.removeEventListener('resize', close);
			document.removeEventListener('keydown', onKey);
		};
	}, [open, onClose]);

	if (!open || typeof document === 'undefined') return null;
	const run = handler => event => {
		event.preventDefault();
		event.stopPropagation();
		handler?.();
	};

	return createPortal(
		<div
			ref={barRef}
			role="toolbar"
			aria-label={ar ? 'إجراءات سريعة للرسالة' : 'Quick message actions'}
			data-wa-quick-actions=""
			className="wa-quick-actions"
			style={{
				top: pos?.top ?? -9999,
				left: pos?.left ?? -9999,
				visibility: pos ? 'visible' : 'hidden',
			}}
		>
			{canReact
				? reactions.map(emoji => (
					<button
						key={emoji}
						type="button"
						className="wa-quick-actions__emoji"
						aria-label={`${ar ? 'تفاعل' : 'React'} ${emoji}`}
						onClick={run(() => onReact?.(emoji))}
					>
						{emoji}
					</button>
				))
				: null}
			{canReact ? <span className="wa-quick-actions__divider" aria-hidden="true" /> : null}
			<button
				type="button"
				className="wa-quick-actions__btn"
				aria-label={ar ? 'رد' : 'Reply'}
				title={ar ? 'رد' : 'Reply'}
				onClick={run(onReply)}
			>
				<Reply size={18} />
			</button>
			{canCopy ? (
				<button
					type="button"
					className="wa-quick-actions__btn"
					aria-label={ar ? 'نسخ' : 'Copy'}
					title={ar ? 'نسخ' : 'Copy'}
					onClick={run(onCopy)}
				>
					<Copy size={17} />
				</button>
			) : null}
			<button
				type="button"
				className="wa-quick-actions__btn"
				aria-label={ar ? 'المزيد' : 'More'}
				title={ar ? 'المزيد' : 'More'}
				onClick={run(onMore)}
			>
				<MoreHorizontal size={18} />
			</button>
		</div>,
		document.body,
	);
}
