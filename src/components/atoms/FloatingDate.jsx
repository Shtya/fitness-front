'use client';

import { useId, useState } from 'react';
import Flatpickr from 'react-flatpickr';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/utils/cn';

function toIso(date) {
	if (!date) return '';
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

export default function FloatingDate({
	label,
	value = '',
	onChange,
	error,
	required = false,
	className = '',
	minDate,
	maxDate,
	disabled = false,
}) {
	const uid = useId();
	const [focused, setFocused] = useState(false);
	const str = value ? String(value) : '';
	const parsed = str ? new Date(`${str}T00:00:00`) : null;
	const valid = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
	const floated = focused || Boolean(valid);
	const hasError = Boolean(error);

	return (
		<div className={cn('relative w-full', className)}>
			<div
				className={cn(
					'relative flex h-11 items-center rounded-[11px] border bg-[color-mix(in_srgb,var(--gm-paper,#fff)_62%,transparent)] px-3 transition-all duration-200',
					'shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]',
					disabled && 'cursor-not-allowed opacity-60',
					hasError
						? 'border-rose-300'
						: focused
							? 'border-[var(--color-primary-500)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary-500)_12%,transparent),inset_0_1px_0_rgba(255,255,255,0.8)]'
							: 'border-[var(--gm-line,rgba(92,143,211,0.22))] hover:border-[color-mix(in_srgb,var(--color-primary-400)_40%,transparent)]',
				)}
			>
				<span className='pointer-events-none me-2 shrink-0 text-[var(--gm-muted,#5879a5)]'>
					<CalendarDays className='size-4' />
				</span>
				<Flatpickr
					id={uid}
					value={valid || null}
					disabled={disabled}
					options={{
						dateFormat: 'd M Y',
						disableMobile: true,
						allowInput: false,
						minDate,
						maxDate,
					}}
					onOpen={() => setFocused(true)}
					onClose={() => setFocused(false)}
					onChange={(dates) => onChange?.(dates?.[0] ? toIso(dates[0]) : '')}
					placeholder=' '
					className='gm-date-input h-full min-w-0 flex-1 cursor-pointer bg-transparent text-[13px] text-[var(--gm-ink,#0b214d)] outline-none'
				/>
				<label
					htmlFor={uid}
					className={cn(
						'pointer-events-none absolute start-9 z-[1] px-1 text-[var(--gm-faint,#7388a7)] transition-all duration-200 ease-[cubic-bezier(0.2,0.75,0.25,1)]',
						floated
							? 'top-0 -translate-y-1/2 rounded-md bg-[var(--gm-paper,#fff)] text-[11px] font-medium text-[var(--gm-muted,#56719a)]'
							: 'top-1/2 -translate-y-1/2 text-[13px]',
						hasError && floated && 'text-rose-500',
					)}
				>
					{label}
					{required ? <span className='ms-0.5 text-rose-500'>*</span> : null}
				</label>
			</div>
			{hasError ? <p className='mt-1 text-xs text-rose-500'>{error}</p> : null}
		</div>
	);
}
