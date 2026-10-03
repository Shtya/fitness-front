'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Activity, Clapperboard, Film, Gauge, MousePointerClick, Orbit, Sparkles, Timer } from 'lucide-react';
import CodeViewer from '../CodeViewer';
import { Chips, ConfidenceBar, EmptyState, Expandable, Panel, Pill, SearchInput, SourceLabel, StatTile, includesQuery } from '../ui';

const KEYFRAMES_RE = /^@(-webkit-)?keyframes\s+[^{\s]+\s*\{[\s\S]*\}\s*$/;

function isSingleBlock(text) {
	let depth = 0;
	for (let i = 0; i < text.length; i++) {
		if (text[i] === '{') depth++;
		else if (text[i] === '}' && --depth === 0 && text.slice(i + 1).trim()) return false;
		if (depth < 0) return false;
	}
	return depth === 0;
}

function KeyframePreview({ css, index }) {
	const name = `si-kf-${index}`;
	const safe = useMemo(() => {
		const text = String(css || '').trim();
		if (!KEYFRAMES_RE.test(text) || !isSingleBlock(text) || /[<>]|@import|url\(|expression\(|javascript:/i.test(text)) return null;
		return text.replace(/^@(-webkit-)?keyframes\s+[^{\s]+/, `@keyframes ${name}`);
	}, [css, name]);
	if (!safe) return <div className="grid size-14 place-items-center rounded-lg bg-slate-100 text-[10px] text-slate-400 dark:bg-slate-800">n/a</div>;
	return (
		<div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-800/60">
			<style>{safe}</style>
			<div className="size-7 rounded-md bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow" style={{ animation: `${name} 1.6s ease-in-out infinite alternate` }} />
		</div>
	);
}

export default function AnimationsTab({ report }) {
	const t = useTranslations('siteInspector');
	const a = report.animations || {};
	const [query, setQuery] = useState('');
	const attrs = Object.entries(a.attributes || {}).filter(([, v]) => v?.count > 0);
	const transitions = (a.transitions || []).filter((x) => includesQuery(query, x.selector, x.property, x.text, x.tag));
	const summary = a.summary || {};

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-2 gap-3 md:grid-cols-5">
				<StatTile icon={Sparkles} tone="violet" label={t('libraries')} value={summary.libraries ?? 0} />
				<StatTile icon={Film} label={t('keyframes')} value={summary.keyframes ?? 0} />
				<StatTile icon={Activity} tone="emerald" label={t('runningAnimations')} value={summary.running ?? 0} />
				<StatTile icon={MousePointerClick} tone="sky" label={t('transitions')} value={summary.transitions ?? 0} />
				<StatTile icon={Orbit} tone="amber" label="ScrollTrigger" value={summary.scrollTriggers ?? 0} />
			</div>

			<Panel title={t('animationLibraries')} icon={Clapperboard} actions={<SourceLabel />}>
				{a.libraries?.length ? (
					<div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
						{a.libraries.map((lib) => (
							<div key={lib.name} className="rounded-xl border border-slate-200/80 p-3 dark:border-slate-800">
								<p className="text-sm font-semibold text-slate-900 dark:text-white">
									{lib.name} {lib.version && <span className="font-mono text-xs font-normal text-indigo-600 dark:text-indigo-300">v{lib.version}</span>}
								</p>
								<div className="my-2">
									<ConfidenceBar value={lib.confidence} />
								</div>
								<Chips items={lib.evidence} />
							</div>
						))}
					</div>
				) : (
					<EmptyState icon={Clapperboard}>{t('noAnimationLibs')}</EmptyState>
				)}
				<div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
					<Pill tone={a.reducedMotion ? 'emerald' : 'amber'}>prefers-reduced-motion: {a.reducedMotion ? t('supported') : t('notFound')}</Pill>
					{a.willChange?.map((w) => (
						<Pill key={w.value} className="font-mono">
							will-change: {w.value} ×{w.count}
						</Pill>
					))}
				</div>
			</Panel>

			<Panel title={t('keyframes')} icon={Film} subtitle={t('keyframesHint')}>
				{a.keyframes?.length ? (
					<div className="grid gap-2 lg:grid-cols-2">
						{a.keyframes.map((k, i) => (
							<Expandable
								key={`${k.name}-${i}`}
								title={
									<span className="flex items-center gap-3">
										<KeyframePreview css={k.css} index={i} />
										<span className="min-w-0">
											<span className="block truncate font-mono text-[13px]" dir="ltr">
												@keyframes {k.name}
											</span>
											<span className="block truncate text-[11px] font-normal text-slate-500" dir="ltr">
												{k.usedBy?.length ? `${t('usedBy')}: ${k.usedBy.slice(0, 3).join(', ')}` : t('notReferenced')}
												{k.running ? ` · ${k.running} running` : ''}
											</span>
										</span>
									</span>
								}
							>
								<CodeViewer code={k.css} language="css" title={k.source} defaultFormat maxHeight={240} />
								{k.usedBy?.length > 3 && (
									<div className="mt-2">
										<Chips items={k.usedBy} />
									</div>
								)}
							</Expandable>
						))}
					</div>
				) : (
					<EmptyState icon={Film}>{t('noKeyframes')}</EmptyState>
				)}
			</Panel>

			<Panel title={t('runtimeAnimations')} icon={Activity} subtitle={t('runtimeHint')}>
				{a.runtime?.length ? (
					<div className="max-h-[380px] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800" dir="ltr">
						<table className="w-full min-w-[720px] text-[11px]">
							<thead className="sticky top-0 bg-slate-50 dark:bg-slate-900">
								<tr className="text-slate-500">
									{['type', 'name', 'target', 'duration', 'iterations', 'easing', 'properties', 'state'].map((h) => (
										<th key={h} className="px-2 py-1.5 text-start font-medium">
											{h}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{a.runtime.map((r, i) => (
									<tr key={i} className="border-t border-slate-100 dark:border-slate-800">
										<td className="px-2 py-1">
											<Pill tone={r.type === 'CSSTransition' ? 'sky' : r.type === 'CSSAnimation' ? 'violet' : 'amber'}>{r.type}</Pill>
										</td>
										<td className="px-2 py-1 font-mono">{r.name}</td>
										<td className="max-w-[240px] truncate px-2 py-1 font-mono text-slate-500" title={r.target}>
											{r.target}
										</td>
										<td className="px-2 py-1 font-mono">{r.duration}ms</td>
										<td className="px-2 py-1 font-mono">{String(r.iterations)}</td>
										<td className="max-w-[140px] truncate px-2 py-1 font-mono">{r.easing}</td>
										<td className="px-2 py-1 font-mono">{r.properties?.join(', ')}</td>
										<td className="px-2 py-1">{r.playState}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<EmptyState icon={Activity}>{t('noRuntime')}</EmptyState>
				)}
			</Panel>

			{(a.gsap || attrs.length > 0) && (
				<Panel title={t('scrollAnimations')} icon={Orbit} actions={<SourceLabel />}>
					<div className="space-y-3">
						{attrs.map(([key, v]) => (
							<div key={key} className="rounded-xl border border-slate-200/80 p-3 dark:border-slate-800">
								<p className="mb-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
									{key} <span className="font-normal text-slate-400">· {v.count} elements</span>
								</p>
								{v.values?.length > 0 && <Chips items={v.values.map((x) => `${x.value || '(empty)'} ×${x.count}`)} tone="violet" />}
								{v.samples?.length > 0 && (
									<div className="mt-1.5">
										<Chips items={v.samples} />
									</div>
								)}
							</div>
						))}
						{a.gsap && (
							<div className="rounded-xl border border-slate-200/80 p-3 dark:border-slate-800">
								<p className="mb-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
									GSAP {a.gsap.version} <span className="font-normal text-slate-400">· plugins: {a.gsap.plugins?.join(', ') || '—'}</span>
								</p>
								<div className="grid gap-2 md:grid-cols-2">
									{(a.gsap.tweens || []).slice(0, 30).map((tw, i) => (
										<div key={i} className="rounded-lg bg-slate-50 p-2 font-mono text-[10.5px] text-slate-600 dark:bg-slate-800/50 dark:text-slate-300" dir="ltr">
											<p className="truncate">{tw.targets?.join(', ') || '(no targets)'}</p>
											<p className="text-slate-400">
												{tw.duration}s · delay {tw.delay}s · {tw.ease || 'default'} {tw.scrollTrigger && '· ScrollTrigger'}
											</p>
											<p className="truncate">{tw.props?.join(', ')}</p>
										</div>
									))}
								</div>
								{a.gsap.scrollTriggers?.length > 0 && (
									<div className="mt-2 space-y-1">
										{a.gsap.scrollTriggers.map((st, i) => (
											<p key={i} className="truncate font-mono text-[10.5px] text-slate-500" dir="ltr">
												trigger {st.trigger} · start {st.start} · end {st.end}
												{st.scrub ? ' · scrub' : ''}
												{st.pin ? ' · pin' : ''}
											</p>
										))}
									</div>
								)}
							</div>
						)}
					</div>
				</Panel>
			)}

			<div className="grid gap-4 lg:grid-cols-3">
				<Panel title={t('durations')} icon={Timer}>
					<Chips items={(a.durations || []).map((d) => `${d.value} ×${d.count}`)} />
				</Panel>
				<Panel title={t('easings')} icon={Gauge}>
					<Chips items={(a.easings || []).map((d) => `${d.value} ×${d.count}`)} />
				</Panel>
				<Panel title={t('transitionProperties')} icon={MousePointerClick}>
					<Chips items={(a.transitionProperties || []).map((d) => `${d.value} ×${d.count}`)} />
				</Panel>
			</div>

			<Panel title={t('transitions')} icon={MousePointerClick} subtitle={t('transitionsHint')} actions={<SearchInput value={query} onChange={setQuery} placeholder={t('search')} className="w-48" />}>
				{transitions.length ? (
					<div className="max-h-[380px] space-y-1 overflow-auto">
						{transitions.map((x, i) => (
							<div key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border border-slate-200/70 px-2.5 py-1.5 text-[11px] dark:border-slate-800">
								<div className="min-w-0" dir="ltr">
									<p className="truncate font-mono text-slate-700 dark:text-slate-200">
										{x.selector}
										{x.text && <span className="ms-2 font-sans text-slate-400">“{x.text}”</span>}
									</p>
									<p className="truncate font-mono text-slate-400">
										{x.property} · {x.duration} · {x.easing}
									</p>
								</div>
								{x.interactive && <Pill tone="sky">hover/focus</Pill>}
							</div>
						))}
					</div>
				) : (
					<EmptyState>{query ? t('noMatches') : t('noTransitions')}</EmptyState>
				)}
			</Panel>

			{a.declarations?.length > 0 && (
				<Panel title={t('animationDeclarations')} icon={Film}>
					<CodeViewer code={a.declarations.map((d) => `${d.selector} {\n  animation: ${d.value};\n}`).join('\n\n')} language="css" title="animation: …" maxHeight={300} />
				</Panel>
			)}
		</div>
	);
}
