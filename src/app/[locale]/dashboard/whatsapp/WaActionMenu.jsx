'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, MoreHorizontal } from 'lucide-react';

function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

function scrollNodeByDelta(node, deltaY) {
	if (!node) return false;
	const maxScroll = node.scrollHeight - node.clientHeight;
	if (maxScroll <= 0) return false;
	const next = clamp(node.scrollTop + deltaY, 0, maxScroll);
	if (next === node.scrollTop) return false;
	node.scrollTop = next;
	return true;
}

export function WaActionMenu({
	actions = [],
	ariaLabel = 'Actions',
	triggerLabel,
	className = '',
	buttonClassName = '',
	disabled = false,
	size = 'md',
	iconOnly = false,
}) {
	const [open, setOpen] = useState(false);
	const [position, setPosition] = useState(null);
	const rootRef = useRef(null);
	const buttonRef = useRef(null);
	const menuRef = useRef(null);
	const touchYRef = useRef(null);
	const compact = size === 'sm';
	const visibleActions = useMemo(() => actions.filter(action => !action.hidden), [actions]);
	const activeCount = visibleActions.filter(action => action.active).length;

	const runAction = (event, action) => {
		event.preventDefault();
		event.stopPropagation();
		if (action?.disabled) return;
		action.onClick?.(event);
		setOpen(false);
	};

	useEffect(() => {
		if (!open) return undefined;
		const updatePosition = () => {
			const rect = buttonRef.current?.getBoundingClientRect();
			if (!rect) return;
			const gap = 8;
			const margin = 8;
			const viewportH = window.innerHeight || 720;
			const viewportW = window.innerWidth || 1280;
			const width = Math.min(Math.max(compact ? 248 : 268, rect.width), viewportW - margin * 2);
			const spaceBelow = Math.max(0, viewportH - rect.bottom - margin - gap);
			const spaceAbove = Math.max(0, rect.top - margin - gap);
			const openUp = spaceBelow < 200 && spaceAbove > spaceBelow;
			const available = Math.max(160, openUp ? spaceAbove : spaceBelow);
			const maxHeight = Math.min(420, available);
			const top = openUp ? Math.max(margin, rect.top - gap - maxHeight) : rect.bottom + gap;
			let left = rect.right - width;
			left = Math.max(margin, Math.min(left, viewportW - width - margin));
			setPosition({ top, left, width, maxHeight });
		};
		updatePosition();
		const closeOnOutsideClick = event => {
			if (!rootRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) {
				setOpen(false);
			}
		};
		const closeOnEscape = event => {
			if (event.key === 'Escape') setOpen(false);
		};
		const onWheelCapture = event => {
			const menu = menuRef.current;
			if (!menu || !menu.contains(event.target)) return;
			if (scrollNodeByDelta(menu, event.deltaY)) event.preventDefault();
			event.stopPropagation();
		};
		const onTouchStartCapture = event => {
			const menu = menuRef.current;
			if (!menu || !menu.contains(event.target)) return;
			touchYRef.current = event.touches[0]?.clientY ?? null;
		};
		const onTouchMoveCapture = event => {
			const menu = menuRef.current;
			if (!menu || !menu.contains(event.target) || touchYRef.current == null) return;
			const y = event.touches[0]?.clientY;
			if (y == null) return;
			const deltaY = touchYRef.current - y;
			touchYRef.current = y;
			if (scrollNodeByDelta(menu, deltaY)) event.preventDefault();
			event.stopPropagation();
		};
		document.addEventListener('pointerdown', closeOnOutsideClick);
		document.addEventListener('keydown', closeOnEscape);
		document.addEventListener('wheel', onWheelCapture, { capture: true, passive: false });
		document.addEventListener('touchstart', onTouchStartCapture, { capture: true, passive: true });
		document.addEventListener('touchmove', onTouchMoveCapture, { capture: true, passive: false });
		window.addEventListener('resize', updatePosition);
		window.addEventListener('scroll', updatePosition, true);
		return () => {
			document.removeEventListener('pointerdown', closeOnOutsideClick);
			document.removeEventListener('keydown', closeOnEscape);
			document.removeEventListener('wheel', onWheelCapture, true);
			document.removeEventListener('touchstart', onTouchStartCapture, true);
			document.removeEventListener('touchmove', onTouchMoveCapture, true);
			window.removeEventListener('resize', updatePosition);
			window.removeEventListener('scroll', updatePosition, true);
		};
	}, [open, compact, visibleActions.length]);

	return (
		<div ref={rootRef} className={`relative ${className}`}>
			<button
				ref={buttonRef}
				type="button"
				disabled={disabled || !visibleActions.length}
				aria-haspopup="menu"
				aria-expanded={open}
				aria-label={ariaLabel}
				onClick={() => setOpen(current => !current)}
				className={
					iconOnly
						? `wa-action-menu-trigger wa-toolbar-icon-btn outline-none disabled:opacity-50 ${
								activeCount ? 'is-active' : ''
							} ${buttonClassName}`
						: `wa-action-menu-trigger wa-btn-3d inline-flex items-center gap-1.5 border border-[var(--wa-border,#e9edef)] bg-white font-semibold text-[var(--wa-text,#111b21)] outline-none transition-colors hover:bg-[var(--wa-hover,#f5f6f6)] disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 ${
								compact ? 'h-9 rounded-[10px] px-2.5 text-[12px]' : 'h-10 rounded-[10px] px-3 text-xs'
							} ${activeCount ? 'border-[var(--wa-accent,#00a884)]/30 bg-[var(--wa-accent,#00a884)]/10 text-[var(--wa-accent,#00a884)] dark:bg-slate-800' : ''} ${buttonClassName}`
				}
			>
				<MoreHorizontal size={iconOnly ? 20 : 16} strokeWidth={iconOnly ? 1.75 : 2} className="shrink-0" aria-hidden="true" />
				{iconOnly ? null : (
					<>
						<span className="max-w-[7rem] truncate">{triggerLabel || ariaLabel}</span>
						{activeCount ? (
							<span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--wa-accent,#00a884)] px-1 text-[10px] font-bold text-white">
								{activeCount}
							</span>
						) : null}
						<ChevronDown size={14} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
					</>
				)}
				{iconOnly && activeCount ? (
					<span className="wa-toolbar-icon-btn__badge">{activeCount > 9 ? '9+' : activeCount}</span>
				) : null}
			</button>
			{open &&
				position &&
				typeof document !== 'undefined' &&
				createPortal(
					<>
						<div
							aria-hidden="true"
							className="fixed inset-0 z-[1599]"
							onPointerDown={() => setOpen(false)}
						/>
						<div
							ref={menuRef}
							role="menu"
							aria-label={ariaLabel}
							onPointerDown={event => event.stopPropagation()}
							className="wa-action-menu-panel fixed z-[1600] overflow-y-auto overscroll-contain"
							style={{
								top: position.top,
								left: position.left,
								width: position.width,
								maxHeight: position.maxHeight,
							}}
						>
							{visibleActions.map((action, index) => {
								const Icon = action.icon;
								const isDisabled = Boolean(action.disabled);
								const tone = action.tone || (action.active ? 'active' : 'default');
								const showDivider = Boolean(action.dividerBefore) && index > 0;
								return (
									<div key={action.id}>
										{showDivider ? <div className="wa-action-menu-divider" aria-hidden="true" /> : null}
										<button
											type="button"
											role="menuitem"
											disabled={isDisabled}
											onPointerDown={event => runAction(event, action)}
											onClick={event => runAction(event, action)}
											className={`wa-action-menu-item ${
												isDisabled
													? 'is-disabled'
													: tone === 'danger'
														? 'is-danger'
														: tone === 'active'
															? 'is-active'
															: ''
											}`}
										>
											<span className="wa-action-menu-item__icon" aria-hidden="true">
												{Icon ? (
													<Icon
														size={18}
														strokeWidth={1.9}
														className="shrink-0"
														fill={action.iconFill ? 'currentColor' : 'none'}
													/>
												) : null}
											</span>
											<span className="wa-action-menu-item__body">
												<span className="wa-action-menu-item__label">{action.label}</span>
												{action.description ? (
													<span className="wa-action-menu-item__desc">{action.description}</span>
												) : null}
											</span>
											{action.active && !isDisabled ? (
												<span className="wa-action-menu-item__check" aria-hidden="true">
													<Check size={15} strokeWidth={2.4} />
												</span>
											) : (
												<span className="wa-action-menu-item__check is-empty" aria-hidden="true" />
											)}
										</button>
									</div>
								);
							})}
						</div>
					</>,
					document.body,
				)}
		</div>
	);
}
