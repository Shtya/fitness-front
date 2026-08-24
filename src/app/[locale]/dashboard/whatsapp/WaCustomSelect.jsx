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

// Above TaskBoardCardDrawer (z-100000) and its lightbox (z-100001).
const DEFAULT_MENU_Z = 100050;

export function WaCustomSelect({
	value,
	onChange,
	options = [],
	ariaLabel,
	className = '',
	buttonClassName = '',
	disabled = false,
	size = 'md',
	fitContent = false,
	menuZIndex = DEFAULT_MENU_Z,
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

	const renderOptionIcon = (option, selectedState = false) => {
		const Icon = option?.icon;
		if (!Icon) return null;
		return (
			<span
				className={`grid shrink-0 place-items-center rounded-lg border ${
					fitContent ? 'h-7 w-7' : 'h-8 w-8'
				} ${
					selectedState
						? 'border-emerald-200/80 bg-white text-emerald-600 shadow-sm dark:border-emerald-800/50 dark:bg-slate-900'
						: 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
				}`}
			>
				<Icon size={15} strokeWidth={2.1} className="shrink-0" />
			</span>
		);
	};

	useEffect(() => {
		if (!open) return undefined;
		const updatePosition = () => {
			const rect = buttonRef.current?.getBoundingClientRect();
			if (!rect) return;
			const gap = 6;
			const margin = 8;
			const viewportH = window.innerHeight || 720;
			const viewportW = window.innerWidth || 1280;
			const minW = hasDescriptions ? 260 : compact ? 220 : 240;
			const width = Math.min(Math.max(rect.width, minW), viewportW - margin * 2);
			const spaceBelow = Math.max(0, viewportH - rect.bottom - margin - gap);
			const spaceAbove = Math.max(0, rect.top - margin - gap);
			const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
			const available = Math.max(140, openUp ? spaceAbove : spaceBelow);
			const maxHeight = Math.min(360, available);
			const top = openUp ? Math.max(margin, rect.top - gap - maxHeight) : rect.bottom + gap;
			let left = rect.left;
			left = Math.max(margin, Math.min(left, viewportW - width - margin));
			setPosition({
				top,
				left,
				width,
				maxHeight,
				openUp,
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
				className={`wa-custom-select-trigger flex ${fitContent ? 'w-auto' : 'w-full'} items-center justify-between gap-2 border border-slate-200 bg-white px-3 font-semibold text-[#111b21] shadow-[0_1px_0_#eef0f2] outline-none transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:shadow-none dark:hover:border-slate-600 dark:hover:bg-slate-800 ${
					compact ? 'h-8 rounded-lg text-[11px]' : 'h-10 rounded-xl text-[13px]'
				} ${open ? 'border-slate-300 ring-2 ring-slate-900/5 dark:ring-white/10' : ''} ${buttonClassName}`}
			>
				<span className="flex min-w-0 items-center gap-2">
					{selected?.icon ? renderOptionIcon(selected, Boolean(selected?.value)) : null}
					<span className="min-w-0 truncate">{selected?.label || ''}</span>
				</span>
				<span
					className={`grid shrink-0 place-items-center rounded-md bg-slate-100 text-slate-500 transition-colors dark:bg-slate-800 dark:text-slate-300 ${
						compact ? 'h-5 w-5' : 'h-6 w-6'
					} ${open ? 'bg-slate-200 text-slate-700 dark:bg-slate-700' : ''}`}
				>
					<ChevronDown
						size={compact ? 12 : 14}
						className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
					/>
				</span>
			</button>
			{open &&
				position &&
				typeof document !== 'undefined' &&
				createPortal(
					<>
						<div
							aria-hidden="true"
							data-wa-select-menu="true"
							className="fixed inset-0"
							style={{ zIndex: menuZIndex, pointerEvents: 'auto' }}
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
							className={`wa-custom-select-menu fixed overflow-y-auto overscroll-contain rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-[0_18px_48px_rgba(15,23,42,0.16),0_4px_12px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.03] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_18px_48px_rgba(0,0,0,0.45)] dark:ring-white/[0.04] ${
								position.openUp ? 'wa-custom-select-menu--up' : 'wa-custom-select-menu--down'
							}`}
							style={{
								top: position.top,
								left: position.left,
								width: position.width,
								maxHeight: position.maxHeight,
								zIndex: menuZIndex + 1,
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
										className={`group flex w-full items-center gap-2.5 rounded-xl px-3 text-start transition-all duration-150 ${
											hasDescriptions ? 'py-2.5' : 'py-2.5'
										} ${
											isDisabled
												? 'cursor-not-allowed text-slate-300 opacity-45 dark:text-slate-600'
												: isSelected
													? 'bg-emerald-50 text-emerald-800 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.22)] dark:bg-emerald-950/40 dark:text-emerald-200 dark:shadow-[inset_0_0_0_1px_rgba(16,185,129,0.28)]'
													: 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white'
										}`}
									>
										{option.icon ? renderOptionIcon(option, isSelected) : null}
										<span className="min-w-0 flex-1">
											<span
												className={`block truncate leading-5 ${
													isSelected
														? 'text-[13px] font-semibold'
														: 'text-[13px] font-medium'
												}`}
											>
												{option.label}
											</span>
											{option.description ? (
												<span
													className={`mt-0.5 block truncate text-[11px] font-medium leading-4 ${
														isSelected
															? 'text-emerald-700/70 dark:text-emerald-300/70'
															: 'text-slate-400 group-hover:text-slate-500 dark:text-slate-500'
													}`}
												>
													{option.description}
												</span>
											) : null}
										</span>
										<span
											className={`grid h-5 w-5 shrink-0 place-items-center rounded-full transition-colors ${
												isSelected && !isDisabled
													? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
													: 'bg-transparent text-transparent'
											}`}
										>
											{isSelected && !isDisabled ? (
												<Check size={12} strokeWidth={3} />
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
