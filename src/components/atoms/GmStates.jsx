'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';

const initials = name => String(name || '?').trim().charAt(0).toUpperCase() || '?';

export function MetaTile({ icon: Icon, label, children }) {
	return (
		<div className='gm-cred justify-start!'>
			<span className='gm-cred__icon shrink-0'><Icon className='size-4' /></span>
			<div className='min-w-0'>
				<p className='gm-cred__label'>{label}</p>
				<div className='gm-cred__value'>{children}</div>
			</div>
		</div>
	);
}

export function Avatar({ name }) {
	return (
		<span
			className='grid size-9 shrink-0 place-items-center rounded-[11px] text-[13px] font-bold text-white'
			style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
		>
			{initials(name)}
		</span>
	);
}

export function ErrorBox({ message, onRetry, retryLabel, busy = false }) {
	return (
		<div className='flex flex-wrap items-center gap-2 rounded-[14px] border border-rose-200/60 bg-[color-mix(in_srgb,var(--gm-danger)_8%,var(--gm-paper))] px-3.5 py-3 text-sm text-rose-700'>
			<AlertCircle className='size-4 shrink-0' />
			<span className='min-w-0 flex-1'>{message}</span>
			{onRetry && (
				<button type='button' onClick={onRetry} disabled={busy} className='gm-btn-ghost gm-btn-compact inline-flex items-center gap-1.5 disabled:opacity-60'>
					<RefreshCw className={`size-3.5 ${busy ? 'animate-spin' : ''}`} />
					{retryLabel}
				</button>
			)}
		</div>
	);
}

export function EmptyBlock({ icon: Icon, title, desc }) {
	return (
		<div className='flex flex-col items-center gap-1.5 rounded-[14px] border border-dashed border-(--gm-line) px-4 py-8 text-center'>
			<span className='gm-plan__icon size-10! rounded-[12px]!'><Icon className='size-4.5' /></span>
			<p className='text-[13px] font-semibold gm-ink-soft'>{title}</p>
			{desc && <p className='max-w-xs text-[12px] gm-faint'>{desc}</p>}
		</div>
	);
}

export function RowSkeleton({ rows = 4 }) {
	return Array.from({ length: rows }).map((_, i) => (
		<div key={i} className='flex items-center gap-3 rounded-[12px] px-2.5 py-2'>
			<span className='gm-skel size-9 shrink-0 rounded-[11px]!' />
			<div className='flex-1 space-y-1.5'>
				<span className='gm-skel block h-3 w-1/3' />
				<span className='gm-skel block h-2.5 w-1/2' />
			</div>
		</div>
	));
}
