'use client';

import { HelpCircle } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function HelpTip({ text, side = 'top' }) {
	if (!text) return null;
	return (
		<Tooltip delayDuration={120}>
			<TooltipTrigger asChild>
				<button
					type="button"
					className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-800 hover:text-emerald-300"
					aria-label="شرح الإعداد"
					onClick={(e) => e.preventDefault()}
				>
					<HelpCircle className="h-3.5 w-3.5" />
				</button>
			</TooltipTrigger>
			<TooltipContent
				side={side}
				sideOffset={6}
				className="z-[300] max-w-[240px] border border-zinc-700 bg-zinc-950 px-3 py-2 text-[11px] leading-relaxed text-zinc-100 shadow-xl"
			>
				<p dir="rtl" className="text-right font-[family-name:var(--font-arabic)]">
					{text}
				</p>
			</TooltipContent>
		</Tooltip>
	);
}

export function LabelWithHelp({ children, help, className }) {
	return (
		<span
			className={cn(
				'inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-zinc-400',
				className,
			)}
		>
			{children}
			<HelpTip text={help} />
		</span>
	);
}

export function ControlRow({
	label,
	value,
	min,
	max,
	step = 1,
	onChange,
	suffix = '',
	help,
	tooltip,
}) {
	const tip = help || tooltip;
	const display =
		typeof value === 'number' && !Number.isInteger(step)
			? Number(value).toFixed(
					String(step).includes('.') ? String(step).split('.')[1].length : 2,
				)
			: value;

	return (
		<div className="space-y-1.5">
			<div className="flex items-center justify-between gap-2">
				<LabelWithHelp help={tip}>{label}</LabelWithHelp>
				<div className="flex items-center gap-1">
					<Input
						type="number"
						value={display}
						min={min}
						max={max}
						step={step}
						onChange={(e) => {
							const next = Number(e.target.value);
							if (Number.isFinite(next)) onChange(Math.min(max, Math.max(min, next)));
						}}
						className="h-7 w-16 border-zinc-800 bg-zinc-950/80 px-1.5 text-right text-xs text-zinc-200"
					/>
					{suffix ? <span className="text-[10px] text-zinc-500">{suffix}</span> : null}
				</div>
			</div>
			<Slider
				value={[Number(value) || 0]}
				min={min}
				max={max}
				step={step}
				onValueChange={(v) => onChange(v[0])}
				className={cn('py-1')}
			/>
		</div>
	);
}

export function Section({ title, children, defaultOpen = true }) {
	return (
		<details open={defaultOpen} className="group border-b border-zinc-800/80 py-2">
			<summary className="flex cursor-pointer list-none items-center justify-between py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-300">
				{title}
				<span className="text-zinc-600 transition group-open:rotate-45">+</span>
			</summary>
			<div className="space-y-3 pb-3 pt-2">{children}</div>
		</details>
	);
}
