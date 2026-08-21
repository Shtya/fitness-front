'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

/**
 * Radix Dialog uses react-remove-scroll, which preventDefault()s wheel/touchmove
 * on portaled menus outside the dialog. Manually apply the delta so the list still scrolls.
 */
function scrollNodeByDelta(node, deltaY) {
	if (!node) return false;
	const maxScroll = node.scrollHeight - node.clientHeight;
	if (maxScroll <= 0) return false;
	const next = clamp(node.scrollTop + deltaY, 0, maxScroll);
	if (next === node.scrollTop) return false;
	node.scrollTop = next;
	return true;
}

export function WaCustomSelect({
	value,
	onChange,
	options = [],
	ariaLabel,
	className = '',
	buttonClassName = '',
	disabled = false,
	size = 'md',
}) {
	const [open, setOpen] = useState(false);
	const [position, setPosition] = useState(null);
	const rootRef = useRef(null);
	const buttonRef = useRef(null);
	const menuRef = useRef(null);
	const touchYRef = useRef(null);
	const selected =
		options.find(option => String(option.value) === String(value)) ||
		(value == null || value === '' ? options[0] : null);
	const hasDescriptions = options.some(option => option.description);
	const compact = size === 'sm';

	const pickOption = (event, option) => {
		event.preventDefault();
		event.stopPropagation();
		if (option?.disabled) return;
		onChange?.(option.value);
		setOpen(false);
	};

	useEffect(() => {
		if (!open) return undefined;
		const updatePosition = () => {
			const rect = buttonRef.current?.getBoundingClientRect();
			if (!rect) return;
			const gap = 4;
			const margin = 8;
			const viewportH = window.innerHeight || 720;
			const viewportW = window.innerWidth || 1280;
			const width = Math.min(Math.max(rect.width, compact ? 200 : 180), viewportW - margin * 2);
			const spaceBelow = Math.max(0, viewportH - rect.bottom - margin - gap);
			const spaceAbove = Math.max(0, rect.top - margin - gap);
			const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
			const available = Math.max(120, openUp ? spaceAbove : spaceBelow);
			const maxHeight = Math.min(320, available);
			const top = openUp ? Math.max(margin, rect.top - gap - maxHeight) : rect.bottom + gap;
			let left = rect.left;
			left = Math.max(margin, Math.min(left, viewportW - width - margin));
			setPosition({
				top,
				left,
				width,
				maxHeight,
			});
		};
		updatePosition();
		const closeOnOutsideClick = event => {
			if (
				!rootRef.current?.contains(event.target) &&
				!menuRef.current?.contains(event.target)
			) {
				setOpen(false);
			}
		};
		const closeOnEscape = event => {
			if (event.key === 'Escape') setOpen(false);
		};
		// Capture-phase wheel so we scroll even when Dialog's remove-scroll cancels the event.
		const onWheelCapture = event => {
			const menu = menuRef.current;
			if (!menu || !menu.contains(event.target)) return;
			if (scrollNodeByDelta(menu, event.deltaY)) {
				event.preventDefault();
			}
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
			if (scrollNodeByDelta(menu, deltaY)) {
				event.preventDefault();
			}
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
	}, [open, options.length, hasDescriptions, compact]);

	return (
		<div ref={rootRef} className={`relative ${className}`}>
			<button
				ref={buttonRef}
				type="button"
				disabled={disabled}
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-label={ariaLabel}
				onClick={() => setOpen(current => !current)}
				className={`wa-btn-3d flex w-full items-center justify-between gap-1.5 border border-slate-200 bg-white px-2.5 font-bold text-[#111b21] outline-none disabled:opacity-50 ${
					compact ? 'h-8 rounded-lg text-[11px]' : 'h-10 rounded-[10px] text-xs'
				} ${buttonClassName}`}
			>
				<span className="min-w-0 truncate">{selected?.label || ''}</span>
				<ChevronDown
					size={14}
					className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
				/>
			</button>
			{open &&
				position &&
				typeof document !== 'undefined' &&
				createPortal(
					<>
						<div
							aria-hidden="true"
							data-wa-select-menu="true"
							className="fixed inset-0 z-[1599]"
							style={{ pointerEvents: 'auto' }}
							onPointerDown={event => {
								event.preventDefault();
								event.stopPropagation();
								setOpen(false);
							}}
						/>
						<div
							ref={menuRef}
							role="listbox"
							data-wa-select-menu="true"
							aria-label={ariaLabel}
							onPointerDown={event => event.stopPropagation()}
							className="fixed z-[1600] overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-1 shadow-[0_12px_32px_rgba(11,20,26,0.18)] dark:border-slate-700 dark:bg-slate-900"
							style={{
								top: position.top,
								left: position.left,
								width: position.width,
								maxHeight: position.maxHeight,
								pointerEvents: 'auto',
								WebkitOverflowScrolling: 'touch',
							}}
						>
							{options.map(option => {
								const isSelected = String(option.value) === String(value);
								const isDisabled = Boolean(option.disabled);
								return (
									<button
										key={String(option.value)}
										type="button"
										role="option"
										disabled={isDisabled}
										aria-disabled={isDisabled || undefined}
										aria-selected={isSelected}
										onPointerDown={event => pickOption(event, option)}
										onClick={event => pickOption(event, option)}
										className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start leading-none transition-colors ${
											isDisabled
												? 'cursor-not-allowed text-slate-300 opacity-50 dark:text-slate-600'
												: isSelected
													? 'bg-emerald-50 text-emerald-700 dark:bg-slate-800 dark:text-emerald-300'
													: 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
										}`}
									>
										<span className="min-w-0 flex-1">
											<span className="block truncate text-xs font-semibold leading-4">{option.label}</span>
											{option.description ? (
												<span className="mt-0.5 block truncate text-[10px] font-medium leading-4 text-slate-400">
													{option.description}
												</span>
											) : null}
										</span>
										<span className="grid h-4 w-4 shrink-0 place-items-center">
											{isSelected && !isDisabled ? (
												<Check size={14} className="text-emerald-600" />
											) : null}
										</span>
									</button>
								);
							})}
						</div>
					</>,
					document.body,
				)}
		</div>
	);
}
