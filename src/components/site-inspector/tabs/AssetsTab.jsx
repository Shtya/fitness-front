'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ExternalLink, FileImage, Film, Frame, Image as ImageIcon, PenTool, Star, Type } from 'lucide-react';
import { cn } from '@/lib/utils';
import CodeViewer from '../CodeViewer';
import { CopyButton, EmptyState, Panel, Pill, SearchInput, SourceLabel, StatTile, formatBytes, includesQuery, shortUrl, svgDataUri } from '../ui';

const PAGE = 60;

function Thumb({ src, alt, className }) {
	const [failed, setFailed] = useState(false);
	if (failed || !/^(https?:|data:image\/)/.test(src || '')) {
		return (
			<div className={cn('grid place-items-center bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600', className)}>
				<FileImage className="size-6" />
			</div>
		);
	}
	return (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt || ''} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} className={cn('bg-[conic-gradient(#f1f5f9_25%,#fff_0_50%,#f1f5f9_0_75%,#fff_0)] bg-[length:14px_14px] object-contain', className)} />
	);
}

function OpenLink({ href }) {
	if (!/^https?:/.test(href || '')) return null;
	return (
		<a href={href} target="_blank" rel="noopener noreferrer nofollow" className="grid size-6 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" aria-label={href}>
			<ExternalLink className="size-3.5" />
		</a>
	);
}

export default function AssetsTab({ report }) {
	const t = useTranslations('siteInspector');
	const assets = report.assets || {};
	const [query, setQuery] = useState('');
	const [shown, setShown] = useState(PAGE);
	const images = useMemo(() => (assets.images || []).filter((i) => includesQuery(query, i.src, i.alt, i.format)), [assets.images, query]);
	const svgs = (assets.svgs || []).filter((s) => includesQuery(query, s.cls, s.selector, s.viewBox));
	const bgs = (assets.backgrounds || []).filter((b) => includesQuery(query, b.url, b.selector));
	const summary = assets.summary || {};

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-2 gap-3 md:grid-cols-5">
				<StatTile icon={ImageIcon} label={t('images')} value={summary.images ?? 0} hint={t('missingAlt', { count: summary.missingAlt ?? 0 })} />
				<StatTile icon={PenTool} tone="violet" label="SVG" value={summary.svgs ?? 0} />
				<StatTile icon={Film} tone="rose" label={t('videos')} value={summary.videos ?? 0} />
				<StatTile icon={Type} tone="amber" label={t('fontFiles')} value={summary.fonts ?? 0} />
				<StatTile icon={Star} tone="emerald" label={t('lazyImages')} value={summary.lazy ?? 0} />
			</div>

			<SearchInput value={query} onChange={setQuery} placeholder={t('searchAssets')} className="max-w-md" />

			<Panel title={t('images')} icon={ImageIcon} subtitle={`${images.length}`} actions={<><SourceLabel /><CopyButton value={images.map((i) => i.src).join('\n')} label={t('copyUrls')} /></>}>
				{images.length ? (
					<>
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
							{images.slice(0, shown).map((img, i) => (
								<figure key={`${img.src}-${i}`} className="group overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800">
									<Thumb src={img.src} alt={img.alt} className="aspect-square w-full" />
									<figcaption className="space-y-1 p-2">
										<p className="truncate font-mono text-[10px] text-slate-600 dark:text-slate-300" dir="ltr" title={img.src}>
											{img.src.startsWith('data:') ? 'data URI' : shortUrl(img.src, 40)}
										</p>
										<div className="flex flex-wrap items-center gap-1">
											<Pill className="uppercase">{img.format}</Pill>
											{img.naturalWidth > 0 && <Pill>{img.naturalWidth}×{img.naturalHeight}</Pill>}
											{img.bytes > 0 && <Pill>{formatBytes(img.bytes)}</Pill>}
											{(img.alt === null || img.alt === undefined) && <Pill tone="rose">no alt</Pill>}
											{img.loading === 'lazy' && <Pill tone="emerald">lazy</Pill>}
										</div>
										<div className="flex items-center justify-end gap-1">
											<OpenLink href={img.src} />
											<CopyButton value={img.src} size="xs" />
										</div>
									</figcaption>
								</figure>
							))}
						</div>
						{images.length > shown && (
							<div className="mt-3 text-center">
								<button type="button" onClick={() => setShown((s) => s + PAGE)} className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-300">
									{t('loadMore', { count: images.length - shown })}
								</button>
							</div>
						)}
					</>
				) : (
					<EmptyState icon={ImageIcon}>{t('none')}</EmptyState>
				)}
			</Panel>

			<Panel title={t('svgIcons')} icon={PenTool} subtitle={`${svgs.length}`} actions={<SourceLabel />}>
				{svgs.length ? (
					<div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8 xl:grid-cols-10">
						{svgs.map((svg, i) => (
							<SvgTile key={i} svg={svg} />
						))}
					</div>
				) : (
					<EmptyState icon={PenTool}>{t('none')}</EmptyState>
				)}
			</Panel>

			{bgs.length > 0 && (
				<Panel title={t('backgroundImages')} icon={Frame}>
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
						{bgs.map((b, i) => (
							<div key={`${b.url}-${i}`} className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800">
								<Thumb src={b.url} className="h-28 w-full object-cover" />
								<div className="flex items-center gap-1 p-2">
									<p className="min-w-0 flex-1 truncate font-mono text-[10px] text-slate-500" dir="ltr" title={b.url}>
										{shortUrl(b.url, 40)}
									</p>
									<OpenLink href={b.url} />
									<CopyButton value={b.url} size="xs" />
								</div>
							</div>
						))}
					</div>
				</Panel>
			)}

			<div className="grid gap-4 lg:grid-cols-2">
				<Panel title={t('iconsManifest')} icon={Star}>
					{assets.icons?.length ? (
						<div className="space-y-1.5">
							{assets.icons.map((ic, i) => (
								<div key={`${ic.href}-${i}`} className="flex items-center gap-2 text-xs">
									{/manifest/.test(ic.rel) ? <Pill tone="sky">manifest</Pill> : <Thumb src={ic.href} className="size-8 rounded" />}
									<span className="min-w-0 flex-1 truncate font-mono text-[11px] text-slate-600 dark:text-slate-300" dir="ltr" title={ic.href}>
										{ic.rel} {ic.sizes && `· ${ic.sizes}`} · {shortUrl(ic.href, 50)}
									</span>
									<CopyButton value={ic.href} size="xs" />
								</div>
							))}
						</div>
					) : (
						<EmptyState>{t('none')}</EmptyState>
					)}
				</Panel>
				<Panel title={t('videosEmbeds')} icon={Film}>
					<div className="space-y-1.5">
						{(assets.videos || []).map((v, i) => (
							<div key={`v-${i}`} className="flex items-center gap-2 text-xs">
								<Pill tone="rose">video</Pill>
								<span className="min-w-0 flex-1 truncate font-mono text-[11px]" dir="ltr" title={v.src}>
									{shortUrl(v.src || v.poster, 60)}
								</span>
								{v.autoplay && <Pill>autoplay</Pill>}
								{v.loop && <Pill>loop</Pill>}
								{v.muted && <Pill>muted</Pill>}
								<CopyButton value={v.src || v.poster} size="xs" />
							</div>
						))}
						{(assets.iframes || []).map((f, i) => (
							<div key={`f-${i}`} className="flex items-center gap-2 text-xs">
								<Pill tone="violet">iframe</Pill>
								<span className="min-w-0 flex-1 truncate font-mono text-[11px]" dir="ltr" title={f.src}>
									{f.title ? `${f.title} · ` : ''}
									{shortUrl(f.src, 60)}
								</span>
								<CopyButton value={f.src} size="xs" />
							</div>
						))}
						{!assets.videos?.length && !assets.iframes?.length && <EmptyState>{t('none')}</EmptyState>}
					</div>
				</Panel>
			</div>

			<Panel title={t('fontFiles')} icon={Type}>
				{assets.fonts?.files?.length || assets.fonts?.loaded?.length ? (
					<div className="grid gap-4 lg:grid-cols-2">
						<div className="space-y-1">
							{(assets.fonts.files || []).map((f) => (
								<div key={f.url} className="flex items-center gap-2 text-xs">
									<Pill className="uppercase">{f.format || 'font'}</Pill>
									<span className="min-w-0 flex-1 truncate font-mono text-[11px]" dir="ltr" title={f.url}>
										{shortUrl(f.url, 60)}
									</span>
									<span className="text-[11px] text-slate-400">{formatBytes(f.bytes)}</span>
									<CopyButton value={f.url} size="xs" />
								</div>
							))}
						</div>
						<div className="flex flex-wrap content-start gap-1">
							{(assets.fonts.loaded || []).map((f, i) => (
								<Pill key={`${f.family}-${i}`} tone={f.status === 'loaded' ? 'emerald' : 'slate'}>
									{f.family} {f.weight} {f.style !== 'normal' ? f.style : ''} · {f.status}
								</Pill>
							))}
						</div>
					</div>
				) : (
					<EmptyState icon={Type}>{t('none')}</EmptyState>
				)}
			</Panel>
		</div>
	);
}

function SvgTile({ svg }) {
	const t = useTranslations('siteInspector');
	const [open, setOpen] = useState(false);
	const uri = useMemo(() => svgDataUri(svg.markup), [svg.markup]);
	return (
		<>
			<button type="button" onClick={() => setOpen(true)} className="group flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-slate-200/80 p-2 text-slate-800 transition hover:border-indigo-300 hover:shadow-sm dark:border-slate-800 dark:text-slate-100" title={svg.selector}>
				{uri ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img src={uri} alt="" className="max-h-10 max-w-full dark:invert" />
				) : (
					<PenTool className="size-5 text-slate-300" />
				)}
				<span className="font-mono text-[9px] text-slate-400">{svg.width ? `${svg.width}×${svg.height}` : svg.viewBox}</span>
			</button>
			{open && (
				<div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={() => setOpen(false)} role="dialog" aria-modal="true">
					<div className="w-full max-w-2xl space-y-3 rounded-2xl bg-white p-4 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
						<div className="flex items-center justify-between gap-2">
							<p className="truncate font-mono text-xs text-slate-500" dir="ltr">
								{svg.selector || 'svg'}
							</p>
							<button type="button" onClick={() => setOpen(false)} className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
								{t('close')}
							</button>
						</div>
						<div className="grid h-40 place-items-center rounded-xl bg-[conic-gradient(#f1f5f9_25%,#fff_0_50%,#f1f5f9_0_75%,#fff_0)] bg-[length:16px_16px]">
							{/* eslint-disable-next-line @next/next/no-img-element */}
							{uri && <img src={uri} alt="" className="max-h-32 max-w-[80%]" />}
						</div>
						<CodeViewer code={svg.markup} language="svg" title={svg.viewBox ? `viewBox="${svg.viewBox}"` : 'svg'} filename="icon.svg" defaultFormat maxHeight={260} />
					</div>
				</div>
			)}
		</>
	);
}
