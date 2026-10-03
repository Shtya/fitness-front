'use client';

import { createContext, useContext } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AlertTriangle, ChevronLeft, ChevronRight, Inbox, Loader2, RefreshCw, X } from 'lucide-react';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/facebook-engagement/fb-engagement-api';
import { useFbT } from './fb-i18n';

export const FbPortalContext = createContext(null);

export const inputClass =
	'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[var(--color-primary-500)] focus:ring-4 focus:ring-[var(--color-primary-500)]/15 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500';

export const textareaClass = cn(inputClass, 'h-auto min-h-[96px] resize-y py-2.5 leading-6');

export const outlineButtonClass =
	'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800';

export const ghostButtonClass =
	'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white';

export function Panel({ title, description, actions, children, className, bodyClassName }) {
	return (
		<section
			className={cn(
				'rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60',
				className,
			)}
		>
			{(title || actions) && (
				<header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
					<div className="min-w-0">
						{title && <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">{title}</h2>}
						{description && <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">{description}</p>}
					</div>
					{actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
				</header>
			)}
			<div className={cn('p-5', bodyClassName)}>{children}</div>
		</section>
	);
}

const TONES = {
	slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
	primary: 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)] dark:bg-[var(--color-primary-500)]/15 dark:text-[var(--color-primary-300)]',
	emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
	amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
	rose: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
	blue: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
	orange: 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
};

export function StatCard({ icon: Icon, label, value, hint, tone = 'primary', loading }) {
	return (
		<div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60">
			<div className="flex items-center justify-between gap-3">
				<span className="text-[13px] font-medium text-slate-500 dark:text-slate-400">{label}</span>
				{Icon && (
					<span className={cn('grid size-9 place-items-center rounded-xl', TONES[tone])}>
						<Icon className="size-[18px]" aria-hidden />
					</span>
				)}
			</div>
			{loading ? (
				<Skeleton className="mt-3 h-8 w-20 bg-slate-100 dark:bg-slate-800" />
			) : (
				<p className="mt-2 text-[28px] font-semibold leading-none tracking-tight text-slate-900 tabular-nums dark:text-white">
					{value}
				</p>
			)}
			{hint && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
		</div>
	);
}

const STATUS_TONE = {
	draft: 'slate',
	pending: 'amber',
	queued: 'amber',
	processing: 'blue',
	published: 'emerald',
	completed: 'emerald',
	completed_with_errors: 'orange',
	failed: 'rose',
	cancelled: 'slate',
	connected: 'emerald',
	active: 'emerald',
	expired: 'rose',
	error: 'rose',
	revoked: 'slate',
	disconnected: 'slate',
};

export function StatusBadge({ status, className }) {
	const t = useFbT();
	const live = status === 'processing';
	return (
		<span
			className={cn(
				'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
				TONES[STATUS_TONE[status] || 'slate'],
				className,
			)}
		>
			<span className={cn('size-1.5 rounded-full bg-current', live && 'animate-pulse')} aria-hidden />
			{t(`status_${status}`)}
		</span>
	);
}

export function Tag({ tone = 'slate', children, className }) {
	return (
		<span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium', TONES[tone], className)}>
			{children}
		</span>
	);
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }) {
	return (
		<div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
			<span className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
				<Icon className="size-6" aria-hidden />
			</span>
			<h3 className="mt-4 text-[15px] font-semibold text-slate-900 dark:text-white">{title}</h3>
			{description && <p className="mt-1 max-w-md text-[13px] leading-6 text-slate-500 dark:text-slate-400">{description}</p>}
			{action && <div className="mt-5">{action}</div>}
		</div>
	);
}

export function ErrorState({ error, onRetry, className }) {
	const t = useFbT();
	return (
		<div
			role="alert"
			className={cn(
				'flex flex-col items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/60 px-6 py-8 text-center dark:border-rose-500/30 dark:bg-rose-500/10',
				className,
			)}
		>
			<AlertTriangle className="size-6 text-rose-500" aria-hidden />
			<p className="text-sm font-medium text-rose-700 dark:text-rose-300">{apiErrorMessage(error, t('genericError'))}</p>
			{onRetry && (
				<Button size="sm" variant="ghost" className={ghostButtonClass} onClick={onRetry}>
					<RefreshCw aria-hidden />
					{t('retry')}
				</Button>
			)}
		</div>
	);
}

export function SkeletonList({ rows = 4, className }) {
	return (
		<div className={cn('space-y-3', className)} aria-busy="true">
			{Array.from({ length: rows }, (_, index) => (
				<Skeleton key={index} className="h-14 w-full rounded-xl bg-slate-100 dark:bg-slate-800" />
			))}
		</div>
	);
}

export function FbDialog({ open, onOpenChange, title, description, children, footer, size = 'md' }) {
	const container = useContext(FbPortalContext);
	const t = useFbT();
	return (
		<DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
			<DialogPrimitive.Portal container={container || undefined}>
				<DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[1000] bg-slate-950/50 backdrop-blur-[2px]" />
				<DialogPrimitive.Content
					className={cn(
						'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
						'fixed left-1/2 top-1/2 z-[1001] flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col',
						'rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl duration-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100',
						size === 'lg' ? 'max-w-2xl' : size === 'sm' ? 'max-w-sm' : 'max-w-lg',
					)}
				>
					<div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
						<div className="min-w-0">
							<DialogPrimitive.Title className="text-base font-semibold">{title}</DialogPrimitive.Title>
							{description ? (
								<DialogPrimitive.Description className="mt-1 text-[13px] leading-6 text-slate-500 dark:text-slate-400">
									{description}
								</DialogPrimitive.Description>
							) : (
								<DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
							)}
						</div>
						<DialogPrimitive.Close
							className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)] dark:hover:bg-slate-800 dark:hover:text-white"
							aria-label={t('close')}
						>
							<X className="size-4" aria-hidden />
						</DialogPrimitive.Close>
					</div>
					<div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
					{footer && (
						<div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-3 sm:flex-row sm:justify-end dark:border-slate-800">
							{footer}
						</div>
					)}
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, destructive = true, loading, onConfirm }) {
	const t = useFbT();
	return (
		<FbDialog
			open={open}
			onOpenChange={onOpenChange}
			title={title}
			description={description}
			size="sm"
			footer={
				<>
					<Button variant="ghost" className={ghostButtonClass} onClick={() => onOpenChange(false)} disabled={loading}>
						{t('cancel')}
					</Button>
					<Button variant={destructive ? 'destructive' : 'default'} onClick={onConfirm} disabled={loading}>
						{loading && <Loader2 className="animate-spin" aria-hidden />}
						{confirmLabel}
					</Button>
				</>
			}
		/>
	);
}

export function Pagination({ page, limit, total, onChange }) {
	const t = useFbT();
	const pages = Math.max(1, Math.ceil((total || 0) / (limit || 1)));
	if (pages <= 1) return null;
	return (
		<nav className="flex items-center justify-between gap-3 pt-4 text-[13px] text-slate-500 dark:text-slate-400" aria-label={t('pagination')}>
			<span className="tabular-nums">{t('pageOf', { page, pages, total })}</span>
			<div className="flex items-center gap-1">
				<Button
					size="icon-sm"
					variant="ghost"
					className={ghostButtonClass}
					onClick={() => onChange(page - 1)}
					disabled={page <= 1}
					aria-label={t('previous')}
				>
					<ChevronLeft className="rtl:rotate-180" aria-hidden />
				</Button>
				<Button
					size="icon-sm"
					variant="ghost"
					className={ghostButtonClass}
					onClick={() => onChange(page + 1)}
					disabled={page >= pages}
					aria-label={t('next')}
				>
					<ChevronRight className="rtl:rotate-180" aria-hidden />
				</Button>
			</div>
		</nav>
	);
}

export function PageAvatar({ account, className }) {
	const initial = String(account?.name || '?').trim().charAt(0).toUpperCase();
	if (account?.pictureUrl) {
		return (
			<img
				src={account.pictureUrl}
				alt=""
				className={cn('size-9 shrink-0 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700', className)}
				referrerPolicy="no-referrer"
			/>
		);
	}
	return (
		<span
			className={cn(
				'grid size-9 shrink-0 place-items-center rounded-full bg-[#1877F2] text-sm font-semibold text-white',
				className,
			)}
			aria-hidden
		>
			{initial}
		</span>
	);
}

export function ProgressBar({ published = 0, failed = 0, pending = 0, total = 0, className }) {
	const safeTotal = Math.max(total, 1);
	const segments = [
		{ key: 'published', value: published, className: 'bg-emerald-500' },
		{ key: 'failed', value: failed, className: 'bg-rose-500' },
		{ key: 'pending', value: pending, className: 'bg-amber-400' },
	];
	return (
		<div
			className={cn('flex h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800', className)}
			role="progressbar"
			aria-valuemin={0}
			aria-valuemax={total}
			aria-valuenow={published + failed}
		>
			{segments.map((segment) =>
				segment.value > 0 ? (
					<span
						key={segment.key}
						className={cn('h-full transition-[width] duration-500 ease-out', segment.className)}
						style={{ width: `${(segment.value / safeTotal) * 100}%` }}
					/>
				) : null,
			)}
		</div>
	);
}

export function Field({ label, hint, htmlFor, children, className }) {
	return (
		<div className={cn('space-y-1.5', className)}>
			{label && (
				<label htmlFor={htmlFor} className="block text-[13px] font-medium text-slate-700 dark:text-slate-300">
					{label}
				</label>
			)}
			{children}
			{hint && <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{hint}</p>}
		</div>
	);
}

export function useFbFormat() {
	const locale = useLocale();
	return {
		dateTime(value) {
			if (!value) return '—';
			return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
		},
		relative(value) {
			if (!value) return '—';
			const diffSeconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
			const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
			const abs = Math.abs(diffSeconds);
			if (abs < 60) return formatter.format(diffSeconds, 'second');
			if (abs < 3600) return formatter.format(Math.round(diffSeconds / 60), 'minute');
			if (abs < 86400) return formatter.format(Math.round(diffSeconds / 3600), 'hour');
			return formatter.format(Math.round(diffSeconds / 86400), 'day');
		},
		number(value) {
			return new Intl.NumberFormat(locale).format(Number(value) || 0);
		},
	};
}
