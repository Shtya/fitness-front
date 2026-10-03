'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { Check, ChevronDown, Copy, Search, Sparkles, FileCode2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function formatBytes(bytes) {
	const n = Number(bytes) || 0;
	if (n < 1024) return `${n} B`;
	if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
	return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function shortUrl(url, max = 70) {
	try {
		const u = new URL(url);
		const text = `${u.hostname.replace(/^www\./, '')}${u.pathname}`;
		return text.length > max ? `${text.slice(0, max - 1)}…` : text;
	} catch {
		return String(url || '').slice(0, max);
	}
}

export function includesQuery(query, ...values) {
	const q = String(query || '').trim().toLowerCase();
	if (!q) return true;
	return values.some((v) => String(v ?? '').toLowerCase().includes(q));
}

export function Panel({ title, icon: Icon, actions, children, className, bodyClassName, subtitle }) {
	return (
		<section
			className={cn(
				'rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900/60',
				className,
			)}
		>
			{(title || actions) && (
				<header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
					<div className="flex min-w-0 items-center gap-2">
						{Icon && <Icon className="size-4 shrink-0 text-indigo-500" aria-hidden />}
						<div className="min-w-0">
							<h3 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
							{subtitle && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
						</div>
					</div>
					{actions && <div className="flex flex-wrap items-center gap-1.5">{actions}</div>}
				</header>
			)}
			<div className={cn('p-4', bodyClassName)}>{children}</div>
		</section>
	);
}

export function CopyButton({ value, label, className, size = 'sm' }) {
	const t = useTranslations('siteInspector');
	const [copied, setCopied] = useState(false);
	const onCopy = async (event) => {
		event.stopPropagation();
		try {
			await navigator.clipboard.writeText(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
			setCopied(true);
			setTimeout(() => setCopied(false), 1200);
		} catch {
			toast.error(t('copyFailed'));
		}
	};
	return (
		<button
			type="button"
			onClick={onCopy}
			title={t('copy')}
			aria-label={label || t('copy')}
			className={cn(
				'inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white',
				size === 'xs' ? 'h-6 px-1.5 text-[11px]' : 'h-7 px-2 text-xs',
				className,
			)}
		>
			{copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
			{label && <span>{copied ? t('copied') : label}</span>}
		</button>
	);
}

const TONES = {
	slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
	indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
	emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
	amber: 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
	rose: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
	violet: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
	sky: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
};

export function Pill({ children, tone = 'slate', className, title }) {
	return (
		<span title={title} className={cn('inline-flex max-w-full items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium', TONES[tone], className)}>
			{children}
		</span>
	);
}

/** Marks data as publicly extracted vs AI-reconstructed. */
export function SourceLabel({ kind = 'extracted', className }) {
	const t = useTranslations('siteInspector');
	const ai = kind === 'ai';
	return (
		<span
			title={ai ? t('aiInferredHint') : t('extractedHint')}
			className={cn(
				'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
				ai
					? 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300'
					: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
				className,
			)}
		>
			{ai ? <Sparkles className="size-3" /> : <FileCode2 className="size-3" />}
			{ai ? t('aiInferred') : t('extracted')}
		</span>
	);
}

export function Expandable({ title, meta, children, defaultOpen = false, actions, className }) {
	const [open, setOpen] = useState(defaultOpen);
	return (
		<div className={cn('rounded-xl border border-slate-200/80 dark:border-slate-800', className)}>
			<div className="flex items-center gap-2 px-3 py-2">
				<button
					type="button"
					onClick={() => setOpen((v) => !v)}
					aria-expanded={open}
					className="flex min-w-0 flex-1 items-center gap-2 text-start"
				>
					<ChevronDown className={cn('size-4 shrink-0 text-slate-400 transition-transform', !open && '-rotate-90 rtl:rotate-90')} />
					<span className="min-w-0 truncate text-[13px] font-medium text-slate-800 dark:text-slate-200">{title}</span>
					{meta && <span className="shrink-0 text-xs text-slate-400">{meta}</span>}
				</button>
				{actions}
			</div>
			{open && <div className="border-t border-slate-100 p-3 dark:border-slate-800">{children}</div>}
		</div>
	);
}

export function SearchInput({ value, onChange, placeholder, className }) {
	return (
		<label className={cn('relative block', className)}>
			<Search className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
			<input
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className="h-8 w-full rounded-lg border border-slate-200 bg-white ps-8 pe-2 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
			/>
		</label>
	);
}

export function EmptyState({ children, icon: Icon }) {
	return (
		<div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
			{Icon && <Icon className="size-5 text-slate-300 dark:text-slate-600" />}
			{children}
		</div>
	);
}

export function StatTile({ label, value, hint, icon: Icon, tone = 'indigo' }) {
	return (
		<div className="flex min-w-0 items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900/60">
			{Icon && (
				<span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', TONES[tone])}>
					<Icon className="size-4" />
				</span>
			)}
			<div className="min-w-0">
				<p className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
				<p className="truncate text-lg font-semibold text-slate-900 dark:text-white">{value}</p>
				{hint && <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{hint}</p>}
			</div>
		</div>
	);
}

export function KeyValue({ rows, mono = true }) {
	const visible = rows.filter(([, v]) => v !== undefined && v !== null && v !== '');
	if (!visible.length) return null;
	return (
		<dl className="grid grid-cols-[minmax(90px,auto)_1fr] gap-x-3 gap-y-1.5 text-xs">
			{visible.map(([k, v]) => (
				<div key={k} className="contents">
					<dt className="text-slate-500 dark:text-slate-400">{k}</dt>
					<dd className={cn('min-w-0 break-words text-slate-800 dark:text-slate-200', mono && 'font-mono text-[11px]')} dir="ltr">
						{v}
					</dd>
				</div>
			))}
		</dl>
	);
}

export function Swatch({ hex, label, sub, count }) {
	return (
		<div className="group flex min-w-0 items-center gap-2.5 rounded-xl border border-slate-200/80 p-2 dark:border-slate-800">
			<span className="size-9 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-[conic-gradient(#e2e8f0_25%,#fff_0_50%,#e2e8f0_0_75%,#fff_0)] bg-[length:10px_10px] dark:border-white/10">
				<span className="block size-full" style={{ backgroundColor: hex }} />
			</span>
			<div className="min-w-0 flex-1">
				<p className="truncate font-mono text-xs font-semibold text-slate-800 dark:text-slate-100" dir="ltr">
					{hex}
				</p>
				<p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
					{label}
					{sub ? ` · ${sub}` : ''}
					{count ? ` · ×${count}` : ''}
				</p>
			</div>
			<CopyButton value={hex} size="xs" className="opacity-0 group-hover:opacity-100 focus:opacity-100" />
		</div>
	);
}

export function ConfidenceBar({ value }) {
	const tone = value >= 85 ? 'bg-emerald-500' : value >= 60 ? 'bg-indigo-500' : 'bg-amber-500';
	return (
		<div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" title={`${value}%`}>
			<div className={cn('h-full rounded-full transition-[width] duration-700', tone)} style={{ width: `${value}%` }} />
		</div>
	);
}

export function Chips({ items, empty = '—', tone = 'slate', max = 40 }) {
	if (!items?.length) return <span className="text-xs text-slate-400">{empty}</span>;
	return (
		<div className="flex flex-wrap gap-1">
			{items.slice(0, max).map((item, i) => (
				<Pill key={`${item}-${i}`} tone={tone} className="font-mono">
					{item}
				</Pill>
			))}
			{items.length > max && <Pill>+{items.length - max}</Pill>}
		</div>
	);
}

export function StyleTable({ styles }) {
	const entries = Object.entries(styles || {});
	if (!entries.length) return null;
	return (
		<div className="overflow-hidden rounded-lg border border-slate-100 dark:border-slate-800" dir="ltr">
			<table className="w-full text-[11px]">
				<tbody>
					{entries.map(([k, v]) => {
						const color = /color|background/i.test(k) && /^(rgb|#|hsl|oklch)/.test(String(v)) ? v : null;
						return (
							<tr key={k} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
								<td className="w-36 whitespace-nowrap px-2 py-1 font-mono text-slate-500 dark:text-slate-400">{k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}</td>
								<td className="px-2 py-1 font-mono text-slate-800 dark:text-slate-200">
									<span className="inline-flex items-center gap-1.5 break-all">
										{color && <span className="inline-block size-3 shrink-0 rounded border border-black/10" style={{ background: color }} />}
										{String(v)}
									</span>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

export function toCss(selector, styles) {
	const body = Object.entries(styles || {})
		.map(([k, v]) => `  ${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}: ${v};`)
		.join('\n');
	return `${selector || '.element'} {\n${body}\n}`;
}

export function svgDataUri(markup) {
	try {
		const withNs = /xmlns=/.test(markup) ? markup : markup.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
		return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(withNs)))}`;
	} catch {
		return '';
	}
}
