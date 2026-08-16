'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

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
			const rowHeight = hasDescriptions ? 52 : 36;
			const estimatedHeight = Math.min(options.length * rowHeight + 8, 280);
			const spaceBelow = viewportH - rect.bottom - margin;
			const openUp = spaceBelow < estimatedHeight && rect.top > spaceBelow;
			let top = openUp ? rect.top - gap - estimatedHeight : rect.bottom + gap;
			top = Math.max(margin, Math.min(top, viewportH - estimatedHeight - margin));
			let left = rect.left;
			left = Math.max(margin, Math.min(left, viewportW - width - margin));
			setPosition({
				top,
				left,
				width,
				maxHeight: Math.min(280, viewportH - margin * 2),
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
		document.addEventListener('pointerdown', closeOnOutsideClick);
		document.addEventListener('keydown', closeOnEscape);
		window.addEventListener('resize', updatePosition);
		window.addEventListener('scroll', updatePosition, true);
		return () => {
			document.removeEventListener('pointerdown', closeOnOutsideClick);
			document.removeEventListener('keydown', closeOnEscape);
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
							className="fixed inset-0 z-[1399]"
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
							className="fixed z-[1400] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-[0_12px_32px_rgba(11,20,26,0.18)] dark:border-slate-700 dark:bg-slate-900"
							style={{ ...position, pointerEvents: 'auto' }}
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
