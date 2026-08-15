'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';
import { STUDIO } from '../ai-content-studio/components/studio-theme';

export function EmailMemoSelect({
	value,
	onChange,
	options = [],
	placeholder = '',
	ariaLabel,
	disabled = false,
	searchable = false,
	className = '',
}) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [position, setPosition] = useState(null);
	const rootRef = useRef(null);
	const buttonRef = useRef(null);
	const menuRef = useRef(null);
	const selected = options.find((option) => String(option.value) === String(value));
	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!searchable || !q) return options;
		return options.filter((option) => String(option.label || '').toLowerCase().includes(q));
	}, [options, query, searchable]);

	useEffect(() => {
		if (!open) {
			setQuery('');
			return undefined;
		}
		const updatePosition = () => {
			const rect = buttonRef.current?.getBoundingClientRect();
			if (!rect) return;
			const width = Math.max(rect.width, 220);
			const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
			const spaceBelow = window.innerHeight - rect.bottom;
			const placeUp = spaceBelow < 280 && rect.top > spaceBelow;
			setPosition({
				top: placeUp ? undefined : rect.bottom + 6,
				bottom: placeUp ? window.innerHeight - rect.top + 6 : undefined,
				left,
				width,
			});
		};
		updatePosition();
		const closeOnOutsideClick = (event) => {
			if (!rootRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) {
				setOpen(false);
			}
		};
		const closeOnEscape = (event) => {
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
		<div ref={rootRef} className={`relative min-w-0 ${className}`}>
			<button
				ref={buttonRef}
				type="button"
				disabled={disabled}
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-label={ariaLabel}
				onClick={() => setOpen((current) => !current)}
				className="flex h-[42px] w-full items-center justify-between gap-2 rounded-[14px] border border-[#E5E7EB] bg-white px-3.5 text-start text-sm font-semibold text-[#1a1a1a] outline-none transition disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
				style={{ boxShadow: open ? STUDIO.shadow3d : undefined }}
			>
				<span className={`min-w-0 truncate ${selected ? '' : 'font-medium text-[#9CA3AF]'}`}>
					{selected?.label || placeholder}
				</span>
				<ChevronDown size={16} className={`shrink-0 text-[#6366F1] transition-transform ${open ? 'rotate-180' : ''}`} />
			</button>
			{open &&
				position &&
				typeof document !== 'undefined' &&
				createPortal(
					<div
						ref={menuRef}
						role="listbox"
						aria-label={ariaLabel}
						className="fixed z-[90] overflow-hidden rounded-[16px] border border-[#E5E7EB] bg-white p-1 dark:border-slate-700 dark:bg-slate-900"
						style={{
							top: position.top,
							bottom: position.bottom,
							left: position.left,
							width: position.width,
							boxShadow: '0 22px 50px -24px rgba(15,23,42,0.42), 0 10px 22px -12px rgba(15,23,42,0.16)',
						}}
					>
						{searchable ? (
							<div className="relative mb-1 px-1 pt-1">
								<Search size={13} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
								<input
									autoFocus
									className="h-8 w-full rounded-lg border border-[#E5E7EB] bg-slate-50 ps-8 pe-2 text-xs outline-none focus:border-[#6366F1]"
									value={query}
									onChange={(e) => setQuery(e.target.value)}
									onKeyDown={(e) => e.stopPropagation()}
								/>
							</div>
						) : null}
						<div className="max-h-64 overflow-auto py-0.5">
							{filtered.length === 0 ? (
								<p className="px-3 py-2 text-xs text-[#6B7280]">—</p>
							) : (
								filtered.map((option) => {
									const active = String(option.value) === String(value);
									return (
										<button
											key={String(option.value)}
											type="button"
											role="option"
											aria-selected={active}
											onClick={() => {
												onChange(option.value);
												setOpen(false);
											}}
											className={`flex w-full items-center justify-between gap-2 rounded-[10px] px-2.5 py-2 text-start text-[13px] font-semibold ${
												active
													? 'bg-indigo-50 text-indigo-700'
													: 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
											}`}
										>
											<span className="min-w-0 truncate">{option.label}</span>
											{active ? <Check size={14} className="shrink-0" /> : null}
										</button>
									);
								})
							)}
						</div>
					</div>,
					document.body,
				)}
		</div>
	);
}
