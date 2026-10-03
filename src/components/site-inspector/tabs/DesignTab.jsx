'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Braces, Brush, Columns3, Layers2, MoveHorizontal, Palette, Ruler, Square, Type } from 'lucide-react';
import { cn } from '@/lib/utils';
import CodeViewer from '../CodeViewer';
import { CopyButton, EmptyState, KeyValue, Panel, Pill, SearchInput, SourceLabel, Swatch, includesQuery } from '../ui';

function buildThemeCss(design) {
	const tokens = design.colors?.tokens || [];
	const fonts = design.typography?.families || [];
	const lines = ['@theme {'];
	for (const tok of tokens) lines.push(`  --color-${tok.token}: ${tok.hex};`);
	design.colors?.brand?.slice(0, 6).forEach((c, i) => lines.push(`  --color-brand-${(i + 1) * 100}: ${c.hex};`));
	if (fonts[0]) lines.push(`  --font-sans: ${fonts[0].stack};`);
	if (fonts[1]) lines.push(`  --font-display: ${fonts[1].stack};`);
	(design.typography?.scale || [])
		.filter((s) => s.role)
		.forEach((s) => lines.push(`  --text-${s.role}: ${s.size};`));
	if (design.spacing?.baseUnit?.unit) lines.push(`  --spacing: ${design.spacing.baseUnit.unit / 2}px;`);
	(design.radii || [])
		.filter((r) => r.label !== 'full')
		.slice(0, 4)
		.sort((a, b) => a.px - b.px)
		.forEach((r, i) => lines.push(`  --radius-${['sm', 'md', 'lg', 'xl'][i]}: ${r.value};`));
	(design.shadows || []).slice(0, 3).forEach((s, i) => lines.push(`  --shadow-${['sm', 'md', 'lg'][i]}: ${s.value};`));
	(design.breakpoints || [])
		.filter((b) => b.type === 'min')
		.slice(0, 5)
		.forEach((b, i) => lines.push(`  --breakpoint-${['sm', 'md', 'lg', 'xl', '2xl'][i]}: ${b.value}px;`));
	lines.push('}');
	return lines.join('\n');
}

function ColorsSection({ colors }) {
	const t = useTranslations('siteInspector');
	const [role, setRole] = useState('all');
	const palette = (colors.palette || []).filter((c) => role === 'all' || c.roles.includes(role));
	return (
		<Panel title={t('colors')} icon={Palette} subtitle={colors.source === 'computed' ? t('colorsComputed') : t('colorsStylesheet')} actions={<SourceLabel />}>
			<div className="space-y-5">
				<div>
					<p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">{t('semanticTokens')}</p>
					<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
						{colors.tokens.map((tok) => (
							<Swatch key={tok.token} hex={tok.hex} label={tok.token} />
						))}
					</div>
				</div>
				{colors.brand?.length > 0 && (
					<div>
						<p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">{t('brandColors')}</p>
						<div className="flex h-14 overflow-hidden rounded-xl ring-1 ring-black/5">
							{colors.brand.map((c) => (
								<button key={c.hex} type="button" title={c.hex} onClick={() => navigator.clipboard?.writeText(c.hex)} className="group relative flex-1 transition-[flex] hover:flex-[2]" style={{ background: c.hex }}>
									<span className="absolute inset-x-0 bottom-1 hidden text-center font-mono text-[10px] text-white drop-shadow group-hover:block">{c.hex}</span>
								</button>
							))}
						</div>
					</div>
				)}
				<div>
					<div className="mb-2 flex flex-wrap items-center justify-between gap-2">
						<p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('fullPalette')}</p>
						<div className="flex gap-1">
							{['all', 'text', 'background', 'border'].map((r) => (
								<button key={r} type="button" onClick={() => setRole(r)} className={cn('h-6 rounded-md px-2 text-[11px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800', role === r && 'bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300')}>
									{r}
								</button>
							))}
						</div>
					</div>
					<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{palette.map((c) => (
							<Swatch key={c.hex} hex={c.hex} label={c.roles.join(', ')} count={c.count} />
						))}
					</div>
				</div>
				{colors.gradients?.length > 0 && (
					<div>
						<p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">{t('gradients')}</p>
						<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
							{colors.gradients.map((g) => (
								<div key={g.value} className="group overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
									<div className="h-16" style={{ backgroundImage: g.value }} />
									<div className="flex items-center gap-2 p-2">
										<p className="min-w-0 flex-1 truncate font-mono text-[10px] text-slate-500" dir="ltr" title={g.value}>
											{g.value}
										</p>
										<CopyButton value={g.value} size="xs" />
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</Panel>
	);
}

function TypographySection({ typography }) {
	const t = useTranslations('siteInspector');
	const headings = typography.styles?.headings || {};
	return (
		<Panel title={t('typography')} icon={Type} actions={<SourceLabel />}>
			<div className="space-y-5">
				<div className="grid gap-3 md:grid-cols-2">
					{typography.families.map((f) => (
						<div key={f.family} className="rounded-xl border border-slate-200/80 p-3 dark:border-slate-800">
							<div className="flex items-start justify-between gap-2">
								<p className="truncate text-2xl text-slate-900 dark:text-white" style={{ fontFamily: f.stack }}>
									{f.family}
								</p>
								<CopyButton value={`font-family: ${f.stack};`} size="xs" />
							</div>
							<p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-300" style={{ fontFamily: f.stack }}>
								The quick brown fox jumps over the lazy dog — 0123456789
							</p>
							<div className="mt-2 flex flex-wrap gap-1">
								<Pill tone="indigo">{f.source}</Pill>
								<Pill>×{f.count}</Pill>
								{f.weights?.map((w) => (
									<Pill key={w}>{w}</Pill>
								))}
							</div>
							<p className="mt-1.5 truncate font-mono text-[10px] text-slate-400" dir="ltr" title={f.stack}>
								{f.stack}
							</p>
						</div>
					))}
					{!typography.families.length && <EmptyState>{t('noData')}</EmptyState>}
				</div>

				<div>
					<p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">{t('typeScale')}</p>
					<div className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 dark:divide-slate-800 dark:border-slate-800">
						{typography.scale.map((s) => (
							<div key={s.size} className="flex items-center gap-3 px-3 py-2">
								<div className="w-24 shrink-0 font-mono text-[11px] text-slate-500" dir="ltr">
									{s.size}
									<span className="block text-[10px] text-slate-400">{s.rem}rem</span>
								</div>
								<p className="min-w-0 flex-1 truncate text-slate-900 dark:text-white" style={{ fontSize: Math.min(s.px, 72), lineHeight: 1.2, fontFamily: typography.families[0]?.stack }}>
									Aa Design system
								</p>
								{s.role && <Pill tone="violet">{s.role}</Pill>}
								<span className="shrink-0 text-[10px] text-slate-400">×{s.count}</span>
							</div>
						))}
					</div>
				</div>

				<div className="grid gap-4 md:grid-cols-3">
					{[
						[t('weights'), typography.weights],
						[t('lineHeights'), typography.lineHeights],
						[t('letterSpacing'), typography.letterSpacings],
					].map(([title, items]) => (
						<div key={title}>
							<p className="mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">{title}</p>
							<div className="space-y-1">
								{(items || []).map((it) => (
									<div key={it.value} className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1 text-xs dark:bg-slate-800/60">
										<span className="font-mono text-slate-700 dark:text-slate-200" style={title === t('weights') ? { fontWeight: it.value } : undefined}>
											{it.value}
										</span>
										<span className="text-[10px] text-slate-400">×{it.count}</span>
									</div>
								))}
								{!items?.length && <span className="text-xs text-slate-400">—</span>}
							</div>
						</div>
					))}
				</div>

				{Object.keys(headings).length > 0 && (
					<div className="overflow-x-auto">
						<table className="w-full min-w-[560px] text-[11px]" dir="ltr">
							<thead>
								<tr className="text-slate-400">
									{['el', 'size', 'weight', 'line-height', 'tracking', 'color', 'sample'].map((h) => (
										<th key={h} className="px-2 py-1 text-start font-medium">
											{h}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{Object.entries({ ...headings, body: typography.styles?.body, p: typography.styles?.paragraph, a: typography.styles?.link })
									.filter(([, v]) => v)
									.map(([el, s]) => (
										<tr key={el} className="border-t border-slate-100 dark:border-slate-800">
											<td className="px-2 py-1.5 font-mono font-semibold text-rose-600 dark:text-rose-300">{el}</td>
											<td className="px-2 py-1.5 font-mono">{s.fontSize}</td>
											<td className="px-2 py-1.5 font-mono">{s.fontWeight}</td>
											<td className="px-2 py-1.5 font-mono">{s.lineHeight}</td>
											<td className="px-2 py-1.5 font-mono">{s.letterSpacing}</td>
											<td className="px-2 py-1.5">
												<span className="inline-flex items-center gap-1 font-mono">
													<span className="size-3 rounded border border-black/10" style={{ background: s.color }} />
													{s.color}
												</span>
											</td>
											<td className="max-w-[220px] truncate px-2 py-1.5 text-slate-500">{s.sample}</td>
										</tr>
									))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</Panel>
	);
}

function VariablesSection({ variables }) {
	const t = useTranslations('siteInspector');
	const [query, setQuery] = useState('');
	const rows = variables.filter((v) => includesQuery(query, v.name, v.value, v.scope));
	return (
		<Panel
			title={t('cssVariables')}
			icon={Braces}
			subtitle={`${variables.length}`}
			actions={
				<>
					<SearchInput value={query} onChange={setQuery} placeholder={t('searchVariables')} className="w-48" />
					<CopyButton value={variables.map((v) => `${v.name}: ${v.value};`).join('\n')} />
				</>
			}
		>
			{rows.length ? (
				<div className="max-h-[420px] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800" dir="ltr">
					<table className="w-full text-[11px]">
						<tbody>
							{rows.slice(0, 400).map((v, i) => (
								<tr key={`${v.name}-${v.scope}-${i}`} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
									<td className="whitespace-nowrap px-2 py-1 font-mono text-fuchsia-700 dark:text-fuchsia-300">{v.name}</td>
									<td className="px-2 py-1 font-mono text-slate-700 dark:text-slate-200">
										<span className="inline-flex items-center gap-1.5 break-all">
											{v.hex && <span className="inline-block size-3 shrink-0 rounded border border-black/10" style={{ background: v.hex }} />}
											{v.value}
										</span>
									</td>
									<td className="max-w-[160px] truncate px-2 py-1 text-slate-400">{v.scope}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<EmptyState>{t('noData')}</EmptyState>
			)}
		</Panel>
	);
}

export default function DesignTab({ report }) {
	const t = useTranslations('siteInspector');
	const design = report.design || {};
	const theme = useMemo(() => buildThemeCss(design), [design]);
	const maxSpacing = Math.max(1, ...(design.spacing?.values || []).map((s) => s.px));
	const maxBp = Math.max(1600, ...(design.breakpoints || []).map((b) => b.value));

	return (
		<div className="space-y-4">
			<ColorsSection colors={design.colors} />
			<TypographySection typography={design.typography} />

			<div className="grid gap-4 lg:grid-cols-2">
				<Panel title={t('spacing')} icon={MoveHorizontal} subtitle={design.spacing?.baseUnit?.unit ? t('baseUnit', { unit: design.spacing.baseUnit.unit, fit: design.spacing.baseUnit.fit }) : t('noBaseUnit')}>
					<div className="max-h-[360px] space-y-1 overflow-auto">
						{(design.spacing?.values || []).map((s) => (
							<div key={s.value} className="grid grid-cols-[64px_1fr_44px] items-center gap-2 text-[11px]">
								<span className="font-mono text-slate-600 dark:text-slate-300" dir="ltr">
									{s.value}
								</span>
								<div className="h-3 rounded-sm bg-gradient-to-r from-indigo-400 to-indigo-500 dark:from-indigo-500 dark:to-indigo-400" style={{ width: `${Math.max(2, (s.px / maxSpacing) * 100)}%` }} />
								<span className="text-end text-slate-400">×{s.count}</span>
							</div>
						))}
						{!design.spacing?.values?.length && <EmptyState>{t('needsBrowser')}</EmptyState>}
					</div>
					{design.spacing?.gaps?.length > 0 && (
						<div className="mt-3">
							<p className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">gap</p>
							<div className="flex flex-wrap gap-1">
								{design.spacing.gaps.map((g) => (
									<Pill key={g.value} className="font-mono">
										{g.value} ×{g.count}
									</Pill>
								))}
							</div>
						</div>
					)}
				</Panel>

				<Panel title={t('radiiShadows')} icon={Square}>
					<div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
						{(design.radii || []).map((r) => (
							<div key={r.value} className="text-center">
								<div className="mx-auto size-14 border-2 border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10" style={{ borderRadius: r.value }} />
								<p className="mt-1 truncate font-mono text-[10px] text-slate-600 dark:text-slate-300" dir="ltr" title={r.value}>
									{r.label || r.value}
								</p>
								<p className="text-[10px] text-slate-400">×{r.count}</p>
							</div>
						))}
					</div>
					<div className="mt-4 grid gap-3 sm:grid-cols-2">
						{(design.shadows || []).map((s) => (
							<div key={s.value} className="group rounded-xl bg-slate-50 p-4 dark:bg-slate-800/40">
								<div className="h-12 rounded-lg bg-white dark:bg-slate-700" style={{ boxShadow: s.value }} />
								<div className="mt-2 flex items-center gap-1">
									<p className="min-w-0 flex-1 truncate font-mono text-[10px] text-slate-500" dir="ltr" title={s.value}>
										{s.value}
									</p>
									<CopyButton value={`box-shadow: ${s.value};`} size="xs" />
								</div>
							</div>
						))}
					</div>
					{!design.radii?.length && !design.shadows?.length && <EmptyState>{t('needsBrowser')}</EmptyState>}
				</Panel>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<Panel title={t('breakpoints')} icon={Ruler}>
					{design.breakpoints?.length ? (
						<>
							<div className="relative mb-6 mt-2 h-8 rounded-lg bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700" dir="ltr">
								{design.breakpoints.map((b, i) => (
									<div key={`${b.type}-${b.value}-${i}`} className="absolute top-0 h-full" style={{ left: `${(b.value / maxBp) * 100}%` }}>
										<div className={cn('h-full w-0.5', b.type === 'min' ? 'bg-indigo-500' : 'bg-amber-500')} />
										<span className="absolute top-full mt-0.5 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] text-slate-500">{b.value}</span>
									</div>
								))}
							</div>
							<div className="flex flex-wrap gap-1">
								{design.breakpoints.map((b, i) => (
									<Pill key={`${b.type}-${b.value}-${i}`} tone={b.type === 'min' ? 'indigo' : 'amber'} className="font-mono">
										{b.type}-width: {b.value}px{b.label ? ` · ${b.label}` : ''} ×{b.count}
									</Pill>
								))}
							</div>
						</>
					) : (
						<EmptyState>{t('noData')}</EmptyState>
					)}
				</Panel>
				<Panel title={t('layoutTokens')} icon={Columns3}>
					<KeyValue
						rows={[
							[t('containers'), (design.containers || []).map((c) => `${c.value} (×${c.count})`).join(', ')],
							['z-index', (design.zIndex || []).map((z) => z.value).join(', ')],
							[t('fontFaces'), (design.typography?.fontFaces || []).map((f) => `${f.family} ${f.weight}`).slice(0, 12).join(', ')],
						]}
					/>
				</Panel>
			</div>

			<Panel title={t('generatedTheme')} icon={Brush} subtitle={t('generatedThemeHint')}>
				<CodeViewer code={theme} language="css" title="theme.css (Tailwind v4 @theme)" filename="theme.css" maxHeight={320} />
			</Panel>

			<VariablesSection variables={design.cssVariables || []} />

			{design.typography?.fontFaces?.length > 0 && (
				<Panel title={t('fontFaces')} icon={Layers2}>
					<div className="grid gap-2 md:grid-cols-2">
						{design.typography.fontFaces.map((f, i) => (
							<div key={`${f.family}-${i}`} className="rounded-lg border border-slate-200 p-2 text-[11px] dark:border-slate-800" dir="ltr">
								<p className="font-semibold text-slate-800 dark:text-slate-200">
									{f.family} <span className="font-normal text-slate-500">{f.weight} {f.style} · display: {f.display || 'auto'}</span>
								</p>
								{f.src.slice(0, 2).map((s) => (
									<p key={s} className="truncate font-mono text-[10px] text-slate-400" title={s}>
										{s}
									</p>
								))}
							</div>
						))}
					</div>
				</Panel>
			)}
		</div>
	);
}
