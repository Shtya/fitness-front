'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CreditCard, LayoutTemplate, MousePointer2, PanelBottom, PanelTop, Rows3, Tag, TextCursorInput } from 'lucide-react';
import { AiReconstruct } from '../AiPanels';
import CodeViewer from '../CodeViewer';
import ComponentTree from '../ComponentTree';
import PreviewInspector, { InspectorPanel } from '../PreviewInspector';
import { Chips, CopyButton, EmptyState, Expandable, KeyValue, Panel, Pill, SourceLabel, StyleTable, toCss } from '../ui';

const PREVIEW_KEYS = ['color', 'backgroundColor', 'backgroundImage', 'border', 'borderRadius', 'boxShadow', 'fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'lineHeight', 'padding', 'textTransform', 'backdropFilter'];

function previewStyle(styles = {}) {
	const out = {};
	for (const key of PREVIEW_KEYS) if (styles[key]) out[key] = styles[key];
	return out;
}

function VariantCard({ item, kind }) {
	const t = useTranslations('siteInspector');
	const sample = item.samples?.[0] || (kind === 'input' ? '' : item.iconOnly ? '◎' : 'Button');
	return (
		<div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 p-3 dark:border-slate-800">
			<div className="flex items-center justify-between gap-2">
				<div className="flex min-w-0 items-center gap-1.5">
					<p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{item.name}</p>
					{item.size && <Pill tone="sky">{item.size}</Pill>}
					{item.shape && <Pill>{item.shape}</Pill>}
				</div>
				<span className="shrink-0 text-[11px] text-slate-400">×{item.count}</span>
			</div>
			<div className="grid min-h-20 place-items-center rounded-lg bg-[radial-gradient(circle,#e2e8f0_1px,transparent_1px)] bg-[length:12px_12px] p-4 dark:bg-[radial-gradient(circle,#334155_1px,transparent_1px)]">
				{kind === 'input' ? (
					<span className="block w-full max-w-[260px] truncate text-slate-400" style={{ ...previewStyle(item.styles), height: item.height, display: 'flex', alignItems: 'center' }}>
						{item.types?.join(' / ')}
					</span>
				) : (
					<span className="inline-flex max-w-full items-center justify-center truncate" style={previewStyle(item.styles)}>
						{sample}
					</span>
				)}
			</div>
			{item.samples?.length > 1 && <Chips items={item.samples} />}
			{item.classes?.length > 0 && (
				<Expandable title={t('classes')} meta={item.classes.length}>
					<div className="flex items-start gap-2">
						<Chips items={item.classes} tone="indigo" max={60} />
						<CopyButton value={item.classes.join(' ')} size="xs" />
					</div>
				</Expandable>
			)}
			<Expandable title={t('computedStyles')} actions={<CopyButton value={toCss(item.selector, item.styles)} label="CSS" size="xs" />}>
				<StyleTable styles={item.styles} />
			</Expandable>
			{item.html && (
				<Expandable title="HTML">
					<CodeViewer code={item.html} language="html" title={item.selector} defaultFormat maxHeight={260} />
				</Expandable>
			)}
			<AiReconstruct compact payload={{ kind, name: item.name, html: item.html, styles: item.styles, samples: item.samples }} />
		</div>
	);
}

function LandmarkPanel({ title, icon, data, rows }) {
	const t = useTranslations('siteInspector');
	if (!data) return null;
	return (
		<Panel title={title} icon={icon} actions={<SourceLabel />}>
			<KeyValue rows={rows} />
			<div className="mt-3 space-y-2">
				<Expandable title={t('computedStyles')}>
					<StyleTable styles={data.styles} />
				</Expandable>
				{data.html && (
					<Expandable title="HTML">
						<CodeViewer code={data.html} language="html" title={data.selector} defaultFormat maxHeight={320} />
					</Expandable>
				)}
				<AiReconstruct compact payload={{ kind: title, html: data.html, styles: data.styles }} />
			</div>
		</Panel>
	);
}

export default function ComponentsTab({ report, selected, onSelect }) {
	const t = useTranslations('siteInspector');
	const c = report.components || {};
	const [highlight, setHighlight] = useState(null);
	const sections = c.sections || [];
	const totalHeight = sections.reduce((s, x) => s + x.height, 0) || 1;

	const pickFromTree = (node) => {
		const match = (report.inspect || []).find((n) => n.sel === node.sel);
		onSelect(match || { ...node, i: -1, children: node.children?.length, styles: null });
	};

	return (
		<div className="space-y-4">
			{c.patterns?.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{c.patterns.map((p) => (
						<Pill key={p.name} tone="violet" className="px-2 py-1 text-xs">
							{p.name} · {p.count}
						</Pill>
					))}
				</div>
			)}

			<Panel title={t('buttons')} icon={MousePointer2} subtitle={t('variantsHint')} actions={<SourceLabel />}>
				{c.buttons?.length ? (
					<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
						{c.buttons.map((b, i) => (
							<VariantCard key={`${b.signature}-${i}`} item={b} kind="button" />
						))}
					</div>
				) : (
					<EmptyState icon={MousePointer2}>{t('needsBrowser')}</EmptyState>
				)}
			</Panel>

			<div className="grid gap-4 xl:grid-cols-2">
				<Panel title={t('inputs')} icon={TextCursorInput} actions={<SourceLabel />}>
					{c.inputs?.length ? (
						<div className="grid gap-3 md:grid-cols-2">
							{c.inputs.map((b, i) => (
								<VariantCard key={`${b.signature}-${i}`} item={b} kind="input" />
							))}
						</div>
					) : (
						<EmptyState icon={TextCursorInput}>{t('none')}</EmptyState>
					)}
				</Panel>
				<Panel title={t('badges')} icon={Tag} actions={<SourceLabel />}>
					{c.badges?.length ? (
						<div className="space-y-2">
							{c.badges.map((b, i) => (
								<div key={`${b.signature}-${i}`} className="flex items-center gap-3 rounded-lg border border-slate-200/80 p-2 dark:border-slate-800">
									<span className="inline-flex shrink-0 items-center" style={previewStyle(b.styles)}>
										{b.samples?.[0] || 'Badge'}
									</span>
									<span className="min-w-0 flex-1 truncate text-[11px] text-slate-500">{b.samples?.join(' · ')}</span>
									<span className="text-[11px] text-slate-400">×{b.count}</span>
									<CopyButton value={toCss(b.selector, b.styles)} size="xs" />
								</div>
							))}
						</div>
					) : (
						<EmptyState icon={Tag}>{t('none')}</EmptyState>
					)}
				</Panel>
			</div>

			<Panel title={t('cards')} icon={CreditCard} actions={<SourceLabel />}>
				{c.cards?.length ? (
					<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
						{c.cards.map((card, i) => (
							<div key={`${card.signature}-${i}`} className="space-y-2 rounded-xl border border-slate-200/80 p-3 dark:border-slate-800">
								<div className="flex items-center justify-between gap-2">
									<p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{card.heading || t('cardVariant', { n: i + 1 })}</p>
									<span className="text-[11px] text-slate-400">×{card.count}</span>
								</div>
								<div className="grid h-24 place-items-center rounded-lg bg-slate-50 p-3 dark:bg-slate-800/40">
									<div className="h-full w-3/4" style={previewStyle(card.styles)} />
								</div>
								<div className="flex flex-wrap gap-1">
									<Pill>
										~{card.avgWidth}×{card.avgHeight}px
									</Pill>
									{card.hasImage && <Pill tone="sky">media</Pill>}
									{card.hasButton && <Pill tone="indigo">CTA</Pill>}
								</div>
								<Expandable title={t('computedStyles')} actions={<CopyButton value={toCss(card.selector, card.styles)} label="CSS" size="xs" />}>
									<StyleTable styles={card.styles} />
								</Expandable>
								{card.html && (
									<Expandable title="HTML">
										<CodeViewer code={card.html} language="html" title={card.selector} defaultFormat maxHeight={260} />
									</Expandable>
								)}
								<AiReconstruct compact payload={{ kind: 'card', html: card.html, styles: card.styles }} />
							</div>
						))}
					</div>
				) : (
					<EmptyState icon={CreditCard}>{t('noCards')}</EmptyState>
				)}
			</Panel>

			<div className="grid gap-4 xl:grid-cols-3">
				{(c.navigation || []).slice(0, 1).map((nav) => (
					<LandmarkPanel
						key={nav.selector}
						title={t('navigation')}
						icon={PanelTop}
						data={nav}
						rows={[
							['selector', nav.selector],
							[t('position'), `${nav.position}${nav.sticky ? ' (sticky)' : ''}`],
							[t('height'), `${nav.height}px`],
							[t('links'), `${nav.linkCount}: ${nav.links.join(' · ')}`],
							['logo', nav.hasLogo ? 'yes' : 'no'],
							['CTA', nav.ctaCount],
						]}
					/>
				))}
				<LandmarkPanel
					title={t('hero')}
					icon={LayoutTemplate}
					data={c.hero}
					rows={
						c.hero
							? [
									['selector', c.hero.selector],
									[t('height'), `${c.hero.height}px`],
									[t('headline'), c.hero.headline],
									[t('subline'), c.hero.subline],
									['CTA', c.hero.ctas.join(' · ')],
									['media', Object.entries(c.hero.media).filter(([, n]) => n).map(([k, n]) => `${k}: ${n}`).join(', ')],
								]
							: []
					}
				/>
				<LandmarkPanel
					title={t('footer')}
					icon={PanelBottom}
					data={c.footer}
					rows={
						c.footer
							? [
									['selector', c.footer.selector],
									[t('height'), `${c.footer.height}px`],
									[t('links'), c.footer.linkCount],
									['columns', c.footer.columns],
									['form', c.footer.hasForm ? 'yes' : 'no'],
									['social', c.footer.socialLinks.join(', ')],
								]
							: []
					}
				/>
			</div>

			<Panel title={t('pageMap')} icon={Rows3} subtitle={t('pageMapHint')}>
				{sections.length ? (
					<div className="grid gap-4 md:grid-cols-[120px_1fr]">
						<div className="hidden overflow-hidden rounded-lg border border-slate-200 md:block dark:border-slate-800">
							{sections.map((s, i) => (
								<div
									key={`${s.selector}-${i}`}
									className="border-b border-white/40 last:border-0"
									style={{ height: Math.max(8, (s.height / totalHeight) * 420), background: s.background && s.background !== 'rgba(0, 0, 0, 0)' ? s.background : undefined }}
									title={`${s.kind} · ${s.height}px`}
									onMouseEnter={() => setHighlight({ x: 0, y: s.y, w: report.screenshots?.desktop?.width || 1280, h: s.height })}
									onMouseLeave={() => setHighlight(null)}
								/>
							))}
						</div>
						<ol className="space-y-1.5">
							{sections.map((s, i) => (
								<li
									key={`${s.selector}-${i}`}
									className="flex items-center gap-2 rounded-lg border border-slate-200/80 px-2.5 py-1.5 text-xs hover:border-indigo-200 dark:border-slate-800"
									onMouseEnter={() => setHighlight({ x: 0, y: s.y, w: report.screenshots?.desktop?.width || 1280, h: s.height })}
									onMouseLeave={() => setHighlight(null)}
								>
									<span className="w-5 text-slate-400">{i + 1}</span>
									<Pill tone="violet">{s.kind}</Pill>
									<span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">{s.heading || s.selector}</span>
									{s.gridColumns > 0 && <Pill>{s.gridColumns} cols</Pill>}
									<span className="shrink-0 font-mono text-[10px] text-slate-400">{s.height}px</span>
								</li>
							))}
						</ol>
					</div>
				) : (
					<EmptyState icon={Rows3}>{t('needsBrowser')}</EmptyState>
				)}
			</Panel>

			<div className="grid gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
				<div className="space-y-4">
					<ComponentTree tree={report.layout?.tree} onHover={setHighlight} onPick={pickFromTree} />
					<InspectorPanel node={selected} onClear={() => onSelect(null)} inspectable={!!report.screenshots?.desktop} />
				</div>
				<div className="xl:sticky xl:top-28 xl:self-start">
					<PreviewInspector compact report={report} selected={selected} onSelect={onSelect} highlight={highlight} />
				</div>
			</div>
		</div>
	);
}
