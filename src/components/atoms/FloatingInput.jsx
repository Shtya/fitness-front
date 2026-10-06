'use client';

import { useId, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

export default function FloatingInput({
	label,
	value = '',
	onChange,
	onBlur,
	type = 'text',
	name,
	disabled = false,
	error,
	clearable = true,
	icon,
	suffix,
	className = '',
	inputClassName = '',
	required = false,
	autoComplete,
	placeholder,
	onPaste,
	inputMode,
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
				{icon ? (
					<span className="pointer-events-none me-2 shrink-0 text-[var(--gm-muted,#5879a5)]">{icon}</span>
				) : null}
				<input
					id={uid}
					name={name}
					type={type}
					value={str}
					disabled={disabled}
					required={required}
					autoComplete={autoComplete}
					inputMode={inputMode}
					onPaste={onPaste}
					placeholder={placeholder || ' '}
					onChange={(e) => onChange?.(e.target.value)}
					onFocus={() => setFocused(true)}
					onBlur={(e) => {
						setFocused(false);
						onBlur?.(e);
					}}
					className={cn(
						'peer h-full w-full bg-transparent text-[13px] text-[var(--gm-ink,#0b214d)] outline-none placeholder:text-[var(--gm-faint,#9aadc4)]',
						!placeholder && 'placeholder:text-transparent',
						inputClassName,
					)}
				/>
				<label
					htmlFor={uid}
					className={cn(
						'pointer-events-none absolute z-[1] px-1 text-[var(--gm-faint,#7388a7)] transition-all duration-200 ease-[cubic-bezier(0.2,0.75,0.25,1)]',
						icon ? 'start-9' : 'start-3',
						floated
							? 'top-0 -translate-y-1/2 rounded-md bg-[var(--gm-paper,#fff)] text-[11px] font-medium text-[var(--gm-muted,#56719a)]'
							: 'top-1/2 -translate-y-1/2 text-[13px]',
						hasError && floated && 'text-rose-500',
					)}
				>
					{label}
					{required ? <span className="ms-0.5 text-rose-500">*</span> : null}
				</label>
				{clearable && str && !disabled && !suffix ? (
					<button
						type="button"
						aria-label="Clear"
						onClick={() => onChange?.('')}
						className="ms-1 grid size-6 shrink-0 place-items-center rounded-md text-[var(--gm-muted,#7388a7)] hover:bg-[var(--gm-paper,#fff)] hover:text-rose-500"
					>
						<X className="size-3.5" />
					</button>
				) : null}
				{suffix ? <div className="ms-1 flex shrink-0 items-center gap-0.5">{suffix}</div> : null}
			</div>
			{hasError ? <p className="mt-1 text-xs text-rose-500">{error}</p> : null}
		</div>
	);
}
