'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Check, CheckCircle2, Copy, FileCode2, HelpCircle, Info, KeyRound, Lightbulb, Loader2, RefreshCw, SearchX, ShieldQuestion, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useProjectMind } from './ProjectMindContext';

/* ------------------------------ layout bits ------------------------------ */

export function PageHeader({ title, subtitle, actions }) {
	return (
		<div className="flex flex-wrap items-start justify-between gap-3">
			<div className="min-w-0">
				<h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">{title}</h1>
				{subtitle ? <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-400">{subtitle}</p> : null}
			</div>
			{actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
		</div>
	);
}

export function Panel({ className, children, as: Tag = 'section', ...rest }) {
	return (
		<Tag className={cn('rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900', className)} {...rest}>
			{children}
		</Tag>
	);
}

export function PanelTitle({ children, hint }) {
	return (
		<div className="mb-3 flex items-center justify-between gap-2">
			<h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{children}</h2>
			{hint ? <span className="text-xs text-slate-500 dark:text-slate-400">{hint}</span> : null}
		</div>
	);
}

/* ------------------------------ states ------------------------------ */

export function EmptyState({ icon: Icon = SearchX, title, body, action }) {
	return (
		<div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center dark:border-slate-700">
			<Icon className="size-8 text-slate-400" aria-hidden />
			<p className="text-sm font-medium text-slate-800 dark:text-slate-100">{title}</p>
			{body ? <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">{body}</p> : null}
			{action ? <div className="mt-2">{action}</div> : null}
		</div>
	);
}

export function ErrorState({ message, onRetry }) {
	const t = useTranslations('projectmind.common');
	return (
		<div role="alert" className="flex flex-col items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-6 py-8 text-center dark:border-red-900/60 dark:bg-red-950/30">
			<XCircle className="size-7 text-red-500" aria-hidden />
			<p className="text-sm font-medium text-red-800 dark:text-red-200">{t('errorTitle')}</p>
			<p className="max-w-md text-sm text-red-700/90 dark:text-red-300/90">{message}</p>
			{onRetry ? (
				<Button variant="outline" size="sm" onClick={onRetry}>
					<RefreshCw /> {t('retry')}
				</Button>
			) : null}
		</div>
	);
}

export function SkeletonRows({ rows = 4, className }) {
	return (
		<div className={cn('space-y-3', className)} aria-busy="true" aria-live="polite">
			{Array.from({ length: rows }).map((_, i) => (
				<Skeleton key={i} className="h-12 w-full rounded-lg" />
			))}
		</div>
	);
}

export function Spinner({ className }) {
	return <Loader2 className={cn('size-4 animate-spin motion-reduce:animate-none', className)} aria-hidden />;
}

/** Shown on every page that needs a project: none yet → onboarding link, still importing → progress. */
export function RequireProject({ children, needReady = false }) {
	const t = useTranslations('projectmind.common');
	const { project, loading, error, refetch } = useProjectMind();
	if (loading) return <SkeletonRows rows={5} />;
	if (error) return <ErrorState message={error?.response?.data?.message || error.message} onRetry={refetch} />;
	if (!project) {
		return (
			<EmptyState
				icon={FileCode2}
				title={t('noProjectTitle')}
				body={t('noProjectBody')}
				action={
					<Button asChild>
						<Link href="/dashboard/projectmind/projects">{t('createProject')}</Link>
					</Button>
				}
			/>
		);
	}
	if (needReady && project.status !== 'ready') {
		return (
			<EmptyState
				icon={project.status === 'failed' ? XCircle : Loader2}
				title={t(`notReady.${project.status}`)}
				body={project.statusMessage || t('notReadyBody')}
				action={
					<Button asChild variant="outline">
						<Link href="/dashboard/projectmind/projects">{t('openProjects')}</Link>
					</Button>
				}
			/>
		);
	}
	return children;
}

/* ------------------------------ badges ------------------------------ */

const STATUS_STYLE = {
	draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
	importing: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
	analyzing: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
	ready: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
	failed: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
};

export function StatusPill({ status }) {
	const t = useTranslations('projectmind.status');
	const busy = status === 'importing' || status === 'analyzing';
	return (
		<span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_STYLE[status] || STATUS_STYLE.draft)}>
			{busy ? <Spinner className="size-3" /> : <span className="size-1.5 rounded-full bg-current" aria-hidden />}
			{t(status)}
		</span>
	);
}

const LABEL_STYLE = {
	verified: { cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200', Icon: CheckCircle2 },
	inferred: { cls: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200', Icon: Info },
	missing: { cls: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200', Icon: XCircle },
	recommended: { cls: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200', Icon: Lightbulb },
	unverified: { cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200', Icon: HelpCircle },
};

export function LabelBadge({ label }) {
	const t = useTranslations('projectmind.labels');
	const s = LABEL_STYLE[label] || LABEL_STYLE.unverified;
	return (
		<span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide', s.cls)}>
			<s.Icon className="size-3" aria-hidden />
			{t(label)}
		</span>
	);
}

/** Confidence is always presented as a heuristic, never as a percentage of correctness. */
export function ConfidenceBadge({ confidence }) {
	const t = useTranslations('projectmind.chat');
	if (!confidence) return null;
	const cls = { high: 'text-emerald-700 dark:text-emerald-300', medium: 'text-amber-700 dark:text-amber-300', low: 'text-slate-600 dark:text-slate-300' }[confidence.level];
	return (
		<span className={cn('inline-flex items-center gap-1 text-xs font-medium', cls)} title={confidence.basis}>
			<ShieldQuestion className="size-3.5" aria-hidden />
			{t('confidence', { level: t(`level.${confidence.level}`) })}
			<span className="font-normal text-slate-500 dark:text-slate-400">· {t('heuristic')}</span>
		</span>
	);
}

const PRIORITY_STYLE = {
	critical: 'bg-red-600 text-white',
	high: 'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200',
	medium: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
	low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
};

export function PriorityBadge({ priority }) {
	const t = useTranslations('projectmind.gaps.priority');
	return <span className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-semibold', PRIORITY_STYLE[priority] || PRIORITY_STYLE.low)}>{t(priority)}</span>;
}

/* ------------------------------ source references ------------------------------ */

export function explorerHref(path, start, end) {
	const q = new URLSearchParams({ path });
	if (start) q.set('line', end && end !== start ? `${start}-${end}` : String(start));
	return `/dashboard/projectmind/explorer?${q.toString()}`;
}

/** Clickable path:line chip that deep-links into the Codebase Explorer. Paths and numbers stay LTR inside RTL text. */
export function SourceChip({ path, startLine, endLine, n }) {
	return (
		<Link
			href={explorerHref(path, startLine, endLine)}
			className="inline-flex max-w-full items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs text-slate-700 hover:border-[var(--color-primary-400)] hover:bg-[var(--color-primary-50)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary-500)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
		>
			{n ? <span className="font-semibold text-[var(--color-primary-700)] dark:text-[var(--color-primary-300)]">[{n}]</span> : null}
			<FileCode2 className="size-3 shrink-0" aria-hidden />
			<bdi dir="ltr" className="truncate font-mono">
				{path}
				{startLine ? `:${startLine}${endLine && endLine !== startLine ? `-${endLine}` : ''}` : ''}
			</bdi>
		</Link>
	);
}

/* ------------------------------ misc ------------------------------ */

export function CopyButton({ text, label, className }) {
	const t = useTranslations('projectmind.common');
	const [done, setDone] = useState(false);
	return (
		<Button
			type="button"
			variant="ghost"
			size="sm"
			className={className}
			onClick={async () => {
				try {
					await navigator.clipboard.writeText(text);
					setDone(true);
					setTimeout(() => setDone(false), 1500);
				} catch {
					toast.error(t('copyFailed'));
				}
			}}
		>
			{done ? <Check /> : <Copy />}
			<span>{done ? t('copied') : label || t('copy')}</span>
		</Button>
	);
}

export function ConfirmDialog({ open, onOpenChange, title, body, confirmLabel, onConfirm, destructive = true, busy = false }) {
	const t = useTranslations('projectmind.common');
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{body}</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
						{t('cancel')}
					</Button>
					<Button variant={destructive ? 'destructive' : 'default'} onClick={onConfirm} disabled={busy}>
						{busy ? <Spinner /> : null} {confirmLabel || t('confirm')}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/** Banner shown when the workspace has no AI provider key: features degrade honestly, nothing is faked. */
export function AiKeyBanner({ status, compact = false }) {
	const t = useTranslations('projectmind.common');
	if (!status || status.configured) return null;
	if (compact) {
		return (
			<p role="status" title={t('noKeyBody')} className="inline-flex max-w-full items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
				<KeyRound className="size-3.5 shrink-0" aria-hidden />
				<span className="truncate">{t('noKeyTitle')}</span>
			</p>
		);
	}
	return (
		<div role="status" className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
			<KeyRound className="mt-0.5 size-4 shrink-0" aria-hidden />
			<div>
				<p className="font-medium">{t('noKeyTitle')}</p>
				<p className="text-amber-800/90 dark:text-amber-200/90">{t('noKeyBody')}</p>
			</div>
		</div>
	);
}

export function InlineWarning({ children }) {
	return (
		<p className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
			<AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
			<span>{children}</span>
		</p>
	);
}

export function formatBytes(bytes) {
	const n = Number(bytes) || 0;
	if (n < 1024) return `${n} B`;
	if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
	return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDate(value, locale) {
	if (!value) return '—';
	try {
		return new Intl.DateTimeFormat(locale || undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
	} catch {
		return String(value);
	}
}

/** Small status indicator dot for compact UI (project switcher). */
const DOT = { ready: 'bg-emerald-500', failed: 'bg-red-500', importing: 'bg-sky-500 animate-pulse', analyzing: 'bg-violet-500 animate-pulse', draft: 'bg-slate-400' };
export function StatusDot({ status }) {
	const t = useTranslations('projectmind.status');
	return <span className={cn('size-2 shrink-0 rounded-full motion-reduce:animate-none', DOT[status] || DOT.draft)} role="img" aria-label={status ? t(status) : ''} />;
}

/** Circular gauge. `value` 0-100 or null (renders an empty track and "n/a"). Pure SVG, themed by currentColor. */
export function Ring({ value, size = 76, stroke = 8, label, className }) {
	const r = (size - stroke) / 2;
	const c = 2 * Math.PI * r;
	const v = value === null || value === undefined ? 0 : Math.max(0, Math.min(100, value));
	return (
		<div className={cn('relative grid place-items-center', className)} style={{ width: size, height: size }} role="img" aria-label={`${label}: ${value ?? 'n/a'}${value === null || value === undefined ? '' : '%'}`}>
			<svg width={size} height={size} className="-rotate-90" aria-hidden>
				<circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-slate-200 dark:stroke-slate-700" />
				<circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} className="stroke-[var(--color-primary-600)] transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none dark:stroke-[var(--color-primary-400)]" />
			</svg>
			<span className="absolute text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-50">{value === null || value === undefined ? '—' : `${Math.round(v)}%`}</span>
		</div>
	);
}
