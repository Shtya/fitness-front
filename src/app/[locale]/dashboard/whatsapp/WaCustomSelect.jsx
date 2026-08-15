'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

export function WaCustomSelect({
	value,
	onChange,
	options = [],
	ariaLabel,
	className = '',
	buttonClassName = '',
	disabled = false,
}) {
	const [open, setOpen] = useState(false);
	const [position, setPosition] = useState(null);
	const rootRef = useRef(null);
	const buttonRef = useRef(null);
	const menuRef = useRef(null);
	const selected = options.find(option => String(option.value) === String(value)) || options[0];

	useEffect(() => {
		if (!open) return undefined;
		const updatePosition = () => {
			const rect = buttonRef.current?.getBoundingClientRect();
			if (!rect) return;
			setPosition({
				top: rect.bottom + 6,
				left: rect.left,
				width: Math.max(rect.width, 180),
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
	}, [open]);

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
				className={`wa-btn-3d flex h-10 w-full items-center justify-between gap-1.5 rounded-[10px] border border-slate-200 bg-white px-2.5 text-xs font-bold text-[#111b21] outline-none disabled:opacity-50 ${buttonClassName}`}
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
					<div
						ref={menuRef}
						role="listbox"
						aria-label={ariaLabel}
						className="fixed z-500 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
						style={position}
					>
						{options.map(option => (
							<button
								key={String(option.value)}
								type="button"
								role="option"
								aria-selected={String(option.value) === String(value)}
								onClick={() => {
									onChange(option.value);
									setOpen(false);
								}}
								className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-start text-xs font-bold transition-colors ${
									String(option.value) === String(value)
										? 'bg-[var(--color-primary-50)] text-[var(--color-primary-600)] dark:bg-slate-800'
										: 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
								}`}
							>
								<span className="truncate">{option.label}</span>
							</button>
						))}
					</div>,
					document.body,
				)}
		</div>
	);
}
