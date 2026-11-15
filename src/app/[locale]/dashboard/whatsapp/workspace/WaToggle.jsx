'use client';



export function Toggle({ checked, onChange, label, size = 'md', disabled = false }) {
	const compact = size === 'sm';
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={label}
			disabled={disabled}
			onClick={() => {
				if (disabled) return;
				onChange(!checked);
			}}
			className={`relative shrink-0 overflow-hidden rounded-full transition-colors ${
				compact ? 'h-5 w-9' : 'h-6 w-11'
			} ${checked ? 'bg-[var(--color-primary-500)]' : 'bg-slate-200 dark:bg-slate-700'} ${
				disabled ? 'cursor-not-allowed opacity-60' : ''
			}`}
		>
			<span
				className={`absolute rounded-full bg-white shadow-md transition-all duration-200 ${
					compact
						? `top-0.5 h-4 w-4 ${checked ? 'start-[18px]' : 'start-0.5'}`
						: `top-0.5 h-5 w-5 ${checked ? 'start-[22px]' : 'start-0.5'}`
				}`}
			/>
		</button>
	);
}
