'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { siteInspectorApi } from '@/lib/site-inspector/site-inspector-api';
import CodeViewer from './CodeViewer';
import { Panel, SourceLabel } from './ui';

const MAX_SUMMARY = 6800;

function errorMessage(err, fallback) {
	const msg = err?.response?.data?.message;
	return (Array.isArray(msg) ? msg[0] : msg) || err?.message || fallback;
}

function fit(payload) {
	let json = JSON.stringify(payload);
	if (json.length <= MAX_SUMMARY) return payload;
	const copy = { ...payload };
	for (const key of ['html', 'styles', 'attrs', 'responsive', 'network', 'animations', 'design']) {
		if (!(key in copy)) continue;
		if (typeof copy[key] === 'string') copy[key] = copy[key].slice(0, Math.max(0, copy[key].length - (json.length - MAX_SUMMARY) - 50));
		else delete copy[key];
		json = JSON.stringify(copy);
		if (json.length <= MAX_SUMMARY) return copy;
	}
	return copy;
}

export function buildOverviewSummary(report) {
	const d = report.design || {};
	return fit({
		url: report.finalUrl,
		title: report.page?.title,
		mode: report.mode,
		tech: (report.tech || []).slice(0, 28).map((x) => `${x.name}${x.version ? ` ${x.version}` : ''} [${x.category}, ${x.confidence}%]`),
		design: {
			tokens: (d.colors?.tokens || []).map((x) => `${x.token}:${x.hex}`),
			fonts: (d.typography?.families || []).slice(0, 4).map((f) => `${f.family} (${f.source})`),
			scale: (d.typography?.scale || []).slice(0, 8).map((s) => s.size),
			spacingBase: d.spacing?.baseUnit?.unit || null,
			radii: (d.radii || []).slice(0, 4).map((r) => r.value),
			breakpoints: (d.breakpoints || []).slice(0, 8).map((b) => `${b.type}-${b.value}`),
		},
		components: {
			buttons: (report.components?.buttons || []).map((b) => b.name),
			cards: (report.components?.cards || []).length,
			sections: (report.components?.sections || []).map((s) => s.kind),
			patterns: (report.components?.patterns || []).map((p) => `${p.name}:${p.count}`),
		},
		animations: { ...report.animations?.summary, libraries: (report.animations?.libraries || []).map((l) => l.name) },
		seo: { score: report.seo?.score, failed: (report.seo?.checks || []).filter((c) => !c.ok).map((c) => c.message) },
		network: { requests: report.network?.requestCount, bytes: report.network?.totalBytes, apis: (report.network?.apis || []).length, byType: (report.network?.byType || []).slice(0, 6).map((x) => `${x.type}:${x.count}`) },
		responsive: (report.responsive?.notes || []).map((n) => n.text),
	});
}

export function AiReconstruct({ payload, compact }) {
	const t = useTranslations('siteInspector');
	const locale = useLocale();
	const [state, setState] = useState({ loading: false, error: '', result: null });

	const run = async () => {
		setState({ loading: true, error: '', result: null });
		try {
			const res = await siteInspectorApi.insights({ mode: 'component', summary: fit(payload), locale: locale === 'ar' ? 'ar' : 'en' });
			setState({ loading: false, error: '', result: res.data });
		} catch (err) {
			setState({ loading: false, error: errorMessage(err, t('aiFailed')), result: null });
		}
	};

	return (
		<div className="space-y-2">
			<button
				type="button"
				onClick={run}
				disabled={state.loading}
				className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
			>
				{state.loading ? <Loader2 className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />}
				{state.result ? t('regenerate') : compact ? t('reconstructShort') : t('reconstruct')}
			</button>
			{state.error && <p className="text-xs text-rose-600 dark:text-rose-400">{state.error}</p>}
			{state.result && (
				<>
					<CodeViewer code={state.result.data?.code || ''} language="tsx" label="ai" title={t('reconstructedComponent')} maxHeight={360} filename="Component.tsx" />
					{state.result.data?.notes && <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{state.result.data.notes}</p>}
					<p className="text-[11px] text-violet-600 dark:text-violet-300">{t('aiDisclaimer')}</p>
				</>
			)}
		</div>
	);
}

function List({ title, items }) {
	if (!Array.isArray(items) || !items.length) return null;
	return (
		<div>
			<p className="mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">{title}</p>
			<ul className="space-y-1">
				{items.map((item, i) => (
					<li key={i} className="flex gap-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
						<span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-violet-400" />
						<span>{String(item)}</span>
					</li>
				))}
			</ul>
		</div>
	);
}

export function AiOverviewInsights({ report }) {
	const t = useTranslations('siteInspector');
	const locale = useLocale();
	const [state, setState] = useState({ loading: false, error: '', result: null });

	const run = async () => {
		setState({ loading: true, error: '', result: null });
		try {
			const res = await siteInspectorApi.insights({ mode: 'overview', summary: buildOverviewSummary(report), locale: locale === 'ar' ? 'ar' : 'en' });
			setState({ loading: false, error: '', result: res.data });
		} catch (err) {
			setState({ loading: false, error: errorMessage(err, t('aiFailed')), result: null });
		}
	};
	const data = state.result?.data || {};

	return (
		<Panel
			title={t('aiInsights')}
			icon={Sparkles}
			subtitle={t('aiInsightsHint')}
			actions={
				<>
					<SourceLabel kind="ai" />
					<button
						type="button"
						onClick={run}
						disabled={state.loading}
						className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-2.5 text-xs font-semibold text-white disabled:opacity-60"
					>
						{state.loading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
						{state.result ? t('regenerate') : t('generate')}
					</button>
				</>
			}
		>
			{state.error && <p className="text-xs text-rose-600 dark:text-rose-400">{state.error}</p>}
			{state.loading && (
				<div className="space-y-2">
					{[80, 95, 70, 88].map((w) => (
						<div key={w} className="h-3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" style={{ width: `${w}%` }} />
					))}
				</div>
			)}
			{!state.loading && !state.result && !state.error && <p className="text-xs text-slate-500 dark:text-slate-400">{t('aiInsightsEmpty')}</p>}
			{state.result && (
				<div className="space-y-4">
					{data.summary && <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">{String(data.summary)}</p>}
					<div className="grid gap-4 md:grid-cols-2">
						<List title={t('aiArchitecture')} items={data.architecture} />
						<List title={t('aiRebuildPlan')} items={data.rebuildPlan} />
						<List title={t('aiRecommendations')} items={data.recommendations} />
						<List title={t('aiRisks')} items={data.risks} />
					</div>
					<p className="text-[11px] text-violet-600 dark:text-violet-300">
						{t('aiDisclaimer')} · {state.result.provider}
					</p>
				</div>
			)}
		</Panel>
	);
}
