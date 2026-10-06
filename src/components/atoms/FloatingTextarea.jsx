'use client';

import { useId, useState } from 'react';
import { cn } from '@/utils/cn';

export default function FloatingTextarea({
	label,
	value = '',
	onChange,
	onBlur,
	name,
	disabled = false,
	error,
	className = '',
	required = false,
	placeholder,
	rows = 4,
}) {
	const uid = useId();
	const [focused, setFocused] = useState(false);
	const str = value == null ? '' : String(value);
	const floated = focused || str.length > 0;
	const hasError = Boolean(error);

	return (
		<div className={cn('relative w-full', className)}>
			<div
				className={cn(
					'relative rounded-[11px] border bg-[color-mix(in_srgb,var(--gm-paper,#fff)_62%,transparent)] px-3 pt-3 pb-2 transition-all duration-200',
					'shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]',
					disabled && 'cursor-not-allowed opacity-60',
					hasError
						? 'border-rose-300'
						: focused
							? 'border-[var(--color-primary-500)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary-500)_12%,transparent),inset_0_1px_0_rgba(255,255,255,0.8)]'
							: 'border-[var(--gm-line,rgba(92,143,211,0.22))] hover:border-[color-mix(in_srgb,var(--color-primary-400)_40%,transparent)]',
				)}
			>
				<textarea
					id={uid}
					name={name}
					rows={rows}
					value={str}
					disabled={disabled}
					required={required}
					placeholder={placeholder || ' '}
					onChange={(e) => onChange?.(e.target.value)}
					onFocus={() => setFocused(true)}
					onBlur={(e) => {
						setFocused(false);
						onBlur?.(e);
					}}
					className={cn(
						'w-full resize-none bg-transparent text-[13px] text-[var(--gm-ink,#0b214d)] outline-none placeholder:text-[var(--gm-faint,#9aadc4)]',
						!placeholder && 'placeholder:text-transparent',
					)}
				/>
				<label
					htmlFor={uid}
					className={cn(
						'pointer-events-none absolute start-3 z-[1] px-1 text-[var(--gm-faint,#7388a7)] transition-all duration-200 ease-[cubic-bezier(0.2,0.75,0.25,1)]',
						floated
							? 'top-0 -translate-y-1/2 rounded-md bg-[var(--gm-paper,#fff)] text-[11px] font-medium text-[var(--gm-muted,#56719a)]'
							: 'top-3.5 text-[13px]',
						hasError && floated && 'text-rose-500',
					)}
				>
					{label}
					{required ? <span className="ms-0.5 text-rose-500">*</span> : null}
				</label>
			</div>
			{hasError ? <p className="mt-1 text-xs text-rose-500">{error}</p> : null}
		</div>
	);
}
