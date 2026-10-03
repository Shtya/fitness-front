'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle, CheckCircle2, Globe, Info, Layers, Palette, Search, Smartphone, Type, Zap, Boxes, Gauge, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AiOverviewInsights } from '../AiPanels';
import PreviewInspector from '../PreviewInspector';
import { KeyValue, Panel, Pill, StatTile, formatBytes, shortUrl } from '../ui';

const FRAMEWORK_CATEGORIES = /framework|meta-framework|static site|cms|site builder|e-?commerce/i;

function SeoPanel({ seo }) {
	const t = useTranslations('siteInspector');
	const og = seo.openGraph || {};
	const image = og['og:image'];
	return (
		<Panel title={t('seo')} icon={Search} actions={<Pill tone={seo.score >= 80 ? 'emerald' : seo.score >= 55 ? 'amber' : 'rose'}>{t('score', { value: seo.score })}</Pill>}>
			<div className="grid gap-4 lg:grid-cols-2">
				<ul className="space-y-1.5">
					{seo.checks.map((c) => (
						<li key={c.id} className="flex items-start gap-2 text-xs">
							{c.ok ? (
								<CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
							) : c.level === 'error' ? (
								<XCircle className="mt-0.5 size-3.5 shrink-0 text-rose-500" />
							) : c.level === 'warning' ? (
								<AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
							) : (
								<Info className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
							)}
							<span className="text-slate-700 dark:text-slate-300" dir="ltr">
								{c.message}
							</span>
						</li>
					))}
				</ul>
				<div className="space-y-3">
					<div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800" dir="ltr">
						{image && /^https?:/.test(image) && (
							// eslint-disable-next-line @next/next/no-img-element
							<img src={image} alt="" loading="lazy" referrerPolicy="no-referrer" className="aspect-[1.91/1] w-full bg-slate-100 object-cover dark:bg-slate-800" />
						)}
						<div className="space-y-0.5 p-3">
							<p className="truncate text-[11px] uppercase text-slate-400">{shortUrl(seo.canonical || og['og:url'] || '', 50)}</p>
							<p className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white">{og['og:title'] || seo.title}</p>
							<p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{og['og:description'] || seo.description}</p>
						</div>
					</div>
					<KeyValue
						rows={[
							['lang / dir', [seo.lang, seo.dir].filter(Boolean).join(' / ')],
							['robots', seo.robots],
							['viewport', seo.viewport],
							['theme-color', seo.themeColor],
							['links', `${seo.links.internal} internal · ${seo.links.external} external`],
							['hreflang', seo.hreflang.map((h) => h.lang).join(', ')],
							['twitter:card', seo.twitter?.['twitter:card']],
						]}
					/>
				</div>
			</div>
		</Panel>
	);
}

function ResponsivePanel({ responsive }) {
	const t = useTranslations('siteInspector');
	const vps = responsive.viewports || [];
	return (
		<Panel title={t('responsive')} icon={Smartphone} subtitle={responsive.mobileFirst ? t('mobileFirst') : t('desktopFirst')}>
			{vps.length > 0 && (
				<div className="mb-3 overflow-x-auto">
					<table className="w-full min-w-[520px] text-xs" dir="ltr">
						<thead>
							<tr className="text-start text-[11px] uppercase text-slate-400">
								{['viewport', 'doc height', 'overflow-x', 'nav links', 'menu button', 'grid cols', 'h1', 'body'].map((h) => (
									<th key={h} className="px-2 py-1 text-start font-medium">
										{h}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{vps.map((v) => (
								<tr key={v.name} className="border-t border-slate-100 dark:border-slate-800">
									<td className="px-2 py-1.5 font-semibold text-slate-800 dark:text-slate-200">
										{v.name} <span className="font-normal text-slate-400">{v.width}px</span>
									</td>
									<td className="px-2 py-1.5 font-mono">{v.docHeight}px</td>
									<td className={cn('px-2 py-1.5 font-mono', v.overflowX ? 'text-rose-600' : 'text-emerald-600')}>{v.overflowX ? `yes (${v.docWidth}px)` : 'no'}</td>
									<td className="px-2 py-1.5 font-mono">{v.navLinksVisible}</td>
									<td className="px-2 py-1.5 font-mono">{v.hamburger ? 'yes' : 'no'}</td>
									<td className="px-2 py-1.5 font-mono">{v.maxGridColumns}</td>
									<td className="px-2 py-1.5 font-mono">{v.h1Size || '—'}</td>
									<td className="px-2 py-1.5 font-mono">{v.bodySize}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
			<ul className="space-y-1.5">
				{responsive.notes.map((n, i) => (
					<li key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
						{n.level === 'warning' ? <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" /> : <Info className="mt-0.5 size-3.5 shrink-0 text-sky-500" />}
						<span dir="ltr">{n.text}</span>
					</li>
				))}
			</ul>
		</Panel>
	);
}

export default function OverviewTab({ report, selected, onSelect, highlight }) {
	const t = useTranslations('siteInspector');
	const tech = report.tech || [];
	const framework = tech.find((x) => FRAMEWORK_CATEGORIES.test(x.category));
	const cssFramework = tech.find((x) => /css framework|ui library/i.test(x.category));
	const tokens = report.design?.colors?.tokens || [];
	const fonts = report.design?.typography?.families || [];

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
				<StatTile icon={Layers} label={t('framework')} value={framework ? framework.name : t('unknown')} hint={framework?.version ? `v${framework.version}` : framework?.note} />
				<StatTile icon={Palette} tone="violet" label={t('styling')} value={cssFramework?.name || t('customCss')} hint={cssFramework?.note || cssFramework?.version} />
				<StatTile icon={Boxes} tone="sky" label={t('technologies')} value={tech.length} hint={t('detectedSignals')} />
				<StatTile icon={Type} tone="amber" label={t('fonts')} value={fonts.length} hint={fonts[0]?.family} />
				<StatTile icon={Zap} tone="emerald" label={t('requests')} value={report.network?.requestCount ?? '—'} hint={report.network?.totalBytes ? formatBytes(report.network.totalBytes) : undefined} />
				<StatTile icon={Gauge} tone="rose" label={t('seoScore')} value={`${report.seo?.score ?? 0}%`} hint={`${report.animations?.summary?.keyframes ?? 0} keyframes`} />
			</div>

			<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
				<Panel title={t('snapshot')} icon={Globe}>
					<KeyValue
						rows={[
							[t('title'), report.page?.title],
							[t('description'), report.page?.description],
							[t('finalUrl'), report.finalUrl],
							['HTTP', `${report.page?.status} · ${report.page?.contentType}`],
							[t('redirects'), (report.page?.redirects || []).join(' → ')],
							[t('document'), report.page?.docHeight ? `${report.page.docWidth} × ${report.page.docHeight}px · ${report.page.counts?.elements ?? '?'} elements` : `${report.page?.counts?.elements ?? '?'} elements`],
							[t('htmlSize'), report.page?.htmlBytes ? formatBytes(report.page.htmlBytes) : ''],
						]}
					/>
					<div className="mt-3 flex flex-wrap gap-1">
						{tech.slice(0, 14).map((x) => (
							<Pill key={x.name} tone="indigo">
								{x.name}
								{x.version ? ` ${x.version}` : ''}
							</Pill>
						))}
					</div>
				</Panel>
				<Panel title={t('designAtAGlance')} icon={Palette}>
					<div className="mb-3 flex flex-wrap gap-2">
						{tokens.map((tok) => (
							<div key={tok.token} className="flex items-center gap-1.5 rounded-lg border border-slate-200 py-1 ps-1 pe-2 dark:border-slate-800">
								<span className="size-6 rounded-md border border-black/10" style={{ background: tok.hex }} />
								<span className="text-[11px] text-slate-600 dark:text-slate-300">{tok.token}</span>
								<span className="font-mono text-[10px] text-slate-400" dir="ltr">
									{tok.hex}
								</span>
							</div>
						))}
					</div>
					<div className="space-y-1.5">
						{fonts.slice(0, 3).map((f) => (
							<div key={f.family} className="flex items-baseline justify-between gap-2 border-b border-slate-100 pb-1.5 last:border-0 dark:border-slate-800">
								<span className="truncate text-lg text-slate-900 dark:text-white" style={{ fontFamily: f.stack }}>
									{f.family}
								</span>
								<span className="shrink-0 text-[11px] text-slate-400">{f.source}</span>
							</div>
						))}
					</div>
				</Panel>
			</div>

			<PreviewInspector report={report} selected={selected} onSelect={onSelect} highlight={highlight} />

			{report.limitations?.length > 0 && (
				<Panel title={t('limitations')} icon={Info} subtitle={t('limitationsHint')}>
					<ul className="space-y-1.5">
						{report.limitations.map((l, i) => (
							<li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
								<Info className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
								<span dir="ltr">{l}</span>
							</li>
						))}
					</ul>
				</Panel>
			)}

			<AiOverviewInsights report={report} />
			<div className="grid gap-4 2xl:grid-cols-2">
				<SeoPanel seo={report.seo} />
				<ResponsivePanel responsive={report.responsive} />
			</div>
		</div>
	);
}
