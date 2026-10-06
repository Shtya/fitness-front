'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Plus } from 'lucide-react';
import { cn } from '@/utils/cn';
import { readGmTokens } from '@/utils/gmTokens';

export default function FloatingSelect({
	label,
	options = [],
	value = null,
	onChange,
	disabled = false,
	error,
	className = '',
	icon,
	required = false,
	creatable = false,
	searchable = false,
	createPlaceholder = '',
}) {
	const uid = useId();
	const btnRef = useRef(null);
	const menuRef = useRef(null);
	const [open, setOpen] = useState(false);
	const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
	const [tokens, setTokens] = useState({});
	const [query, setQuery] = useState('');

	const selected = useMemo(() => {
		const found = options.find((o) => String(o.id) === String(value));
		if (found) return found;
		return creatable && value ? { id: value, label: value } : null;
	}, [options, value, creatable]);

	const withSearch = creatable || searchable;
	const q = query.trim().toLowerCase();
	const visibleOptions = useMemo(
		() => (withSearch && q ? options.filter((o) => String(o.label).toLowerCase().includes(q)) : options),
		[options, withSearch, q],
	);
	const canCreate = creatable && q && !options.some((o) => String(o.label).toLowerCase() === q);

	const choose = (id) => {
		onChange?.(id);
		setOpen(false);
		setQuery('');
	};
	const floated = open || Boolean(selected);
	const hasError = Boolean(error);

	const place = useCallback(() => {
		const el = btnRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const menuH = menuRef.current?.offsetHeight || Math.min(options.length * 40 + 12, 240);
		const pad = 8;
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const width = rect.width;
		let left = Math.min(Math.max(pad, rect.left), vw - width - pad);
		let top = rect.bottom + 6;
		if (top + menuH > vh - pad && rect.top - 6 - menuH >= pad) {
			top = rect.top - 6 - menuH;
		} else {
			top = Math.min(top, vh - menuH - pad);
			top = Math.max(pad, top);
		}
		setPos({ top, left, width });
		setTokens(readGmTokens(el));
	}, [options.length]);

	useEffect(() => {
		if (!open) return;
		place();
		const onWin = () => place();
		window.addEventListener('resize', onWin);
		window.addEventListener('scroll', onWin, true);
		return () => {
			window.removeEventListener('resize', onWin);
			window.removeEventListener('scroll', onWin, true);
		};
	}, [open, place]);

	useEffect(() => {
		if (!open) return;
		const onDoc = (e) => {
			if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
			setOpen(false);
		};
		const onKey = (e) => e.key === 'Escape' && setOpen(false);
		document.addEventListener('mousedown', onDoc);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDoc);
			document.removeEventListener('keydown', onKey);
		};
	}, [open]);

	return (
		<div className={cn('relative w-full', className)}>
			<button
				ref={btnRef}
				id={uid}
				type="button"
				disabled={disabled}
				aria-haspopup="listbox"
				aria-expanded={open}
				onClick={() => !disabled && setOpen((v) => !v)}
				className={cn(
					'relative flex h-11 w-full items-center rounded-[11px] border bg-[color-mix(in_srgb,var(--gm-paper,#fff)_62%,transparent)] px-3 text-start transition-all duration-200',
					'shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]',
					disabled && 'cursor-not-allowed opacity-60',
					hasError
						? 'border-rose-300'
						: open
							? 'border-[var(--color-primary-500)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary-500)_12%,transparent)]'
							: 'border-[var(--gm-line,rgba(92,143,211,0.22))] hover:border-[color-mix(in_srgb,var(--color-primary-400)_40%,transparent)]',
				)}
			>
				{icon ? <span className="me-2 shrink-0 text-[var(--gm-muted,#4d71a0)]">{icon}</span> : null}
				<span className={cn('min-w-0 flex-1 truncate text-[13px]', selected ? 'text-[var(--gm-ink-soft,#27456f)]' : 'text-transparent')}>
					{selected?.label || label}
				</span>
				<ChevronDown className={cn('size-4 shrink-0 text-[var(--gm-muted,#4d71a0)] transition-transform', open && 'rotate-180')} />
				<span
					className={cn(
						'pointer-events-none absolute z-[1] px-1 text-[var(--gm-faint,#7388a7)] transition-all duration-200 ease-[cubic-bezier(0.2,0.75,0.25,1)]',
						icon ? 'start-9' : 'start-3',
						floated
							? 'top-0 -translate-y-1/2 rounded-md bg-[var(--gm-paper,#fff)] text-[11px] font-medium text-[var(--gm-muted,#56719a)]'
							: 'top-1/2 -translate-y-1/2 text-[13px]',
					)}
				>
					{label}
					{required ? <span className="ms-0.5 text-rose-500">*</span> : null}
				</span>
			</button>

			{open && typeof document !== 'undefined'
				? createPortal(
					<div
						ref={menuRef}
						role="listbox"
						className="max-h-60 overflow-auto rounded-[12px] border p-1.5"
						style={{
							...tokens,
							position: 'fixed',
							top: pos.top,
							left: pos.left,
							width: pos.width,
							zIndex: 1200000,
							background: 'var(--gm-paper, #fff)',
							borderColor: 'var(--gm-line, rgba(105,153,216,0.22))',
							boxShadow: 'var(--gm-shadow-3, 0 16px 40px rgba(28,77,137,0.14))',
						}}
					>
						{withSearch ? (
							<div className="mb-1.5 flex items-center gap-1.5 border-b pb-1.5" style={{ borderColor: 'var(--gm-line)' }}>
								<input
									autoFocus
									value={query}
									onChange={(e) => setQuery(e.target.value)}
									onKeyDown={(e) => {
										if (e.key !== 'Enter') return;
										e.preventDefault();
										if (canCreate) choose(query.trim());
										else if (visibleOptions[0]) choose(visibleOptions[0].id);
									}}
									placeholder={createPlaceholder}
									className="h-9 min-w-0 flex-1 rounded-[9px] bg-transparent px-2.5 text-[13px] text-(--gm-ink,#0b214d) outline-none placeholder:text-(--gm-faint,#9aadc4)"
								/>
								{canCreate ? (
									<button
										type="button"
										onClick={() => choose(query.trim())}
										className="inline-flex h-8 shrink-0 items-center gap-1 rounded-[9px] px-2.5 text-[12px] font-semibold text-white"
										style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
									>
										<Plus className="size-3.5" />
										<span className="max-w-[120px] truncate">{query.trim()}</span>
									</button>
								) : null}
							</div>
						) : null}
						{visibleOptions.map((opt) => {
							const active = String(opt.id) === String(value);
							return (
								<button
									key={opt.id}
									type="button"
									role="option"
									aria-selected={active}
									onClick={() => choose(opt.id)}
									className={cn(
										'flex w-full items-center justify-between gap-2 rounded-[9px] px-3 py-2 text-start text-[13px] transition-colors',
										active
											? 'bg-[color-mix(in_srgb,var(--color-primary-100)_80%,transparent)] font-semibold text-[var(--color-primary-700)]'
											: 'text-[var(--gm-ink-soft,#29466f)] hover:bg-[color-mix(in_srgb,var(--color-primary-50)_80%,transparent)]',
									)}
								>
									<span className="truncate">{opt.label}</span>
									{active ? <Check className="size-3.5 shrink-0" /> : null}
								</button>
							);
						})}
					</div>,
					document.body,
				)
				: null}

			{hasError ? <p className="mt-1 text-xs text-rose-500">{error}</p> : null}
		</div>
	);
}
