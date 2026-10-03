'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Crosshair, ImageOff, Monitor, MousePointerClick, Smartphone, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AiReconstruct } from './AiPanels';
import { CopyButton, EmptyState, KeyValue, Panel, SourceLabel, StyleTable, toCss } from './ui';

function pickNode(nodes, x, y) {
	let best = null;
	let bestArea = Infinity;
	for (const n of nodes) {
		if (x < n.x || y < n.y || x > n.x + n.w || y > n.y + n.h) continue;
		const area = n.w * n.h;
		if (area < bestArea) {
			best = n;
			bestArea = area;
		}
	}
	return best;
}

export function InspectorPanel({ node, onClear, inspectable = true, className }) {
	const t = useTranslations('siteInspector');
	return (
		<Panel
			title={t('inspector')}
			icon={MousePointerClick}
			actions={
				node && (
					<button type="button" onClick={onClear} className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" aria-label={t('clear')}>
						<X className="size-4" />
					</button>
				)
			}
			className={className}
			bodyClassName="max-h-[640px] space-y-3 overflow-auto"
		>
			{node ? (
				<>
					<div className="flex items-start justify-between gap-2">
						<div className="min-w-0">
							<p className="font-mono text-sm font-semibold text-rose-600 dark:text-rose-300" dir="ltr">
								&lt;{node.tag}&gt;
							</p>
							<p className="break-all font-mono text-[11px] text-slate-500 dark:text-slate-400" dir="ltr">
								{node.sel}
							</p>
						</div>
						<SourceLabel />
					</div>
					<KeyValue
						rows={[
							[t('size'), `${node.w} × ${node.h}px`],
							[t('position'), `x ${node.x}, y ${node.y}`],
							['id', node.id],
							['class', node.cls],
							[t('text'), node.text],
							[t('children'), node.children],
							...Object.entries(node.attrs || {}),
						]}
					/>
					{node.styles && Object.keys(node.styles).length > 0 && (
						<>
							<div className="flex items-center justify-between">
								<p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('computedStyles')}</p>
								<div className="flex gap-1">
									<CopyButton value={node.sel} label={t('selector')} size="xs" />
									<CopyButton value={toCss(node.cls ? `.${node.cls.split(' ')[0]}` : node.tag, node.styles)} label="CSS" size="xs" />
								</div>
							</div>
							<StyleTable styles={node.styles} />
							<AiReconstruct
								payload={{
									kind: 'element',
									tag: node.tag,
									classes: node.cls,
									text: node.text,
									attrs: node.attrs,
									size: `${node.w}x${node.h}`,
									styles: node.styles,
									children: node.children,
								}}
							/>
						</>
					)}
				</>
			) : (
				<EmptyState icon={MousePointerClick}>{inspectable ? t('inspectEmpty') : t('inspectUnavailable')}</EmptyState>
			)}
		</Panel>
	);
}

export default function PreviewInspector({ report, selected, onSelect, highlight, compact = false }) {
	const t = useTranslations('siteInspector');
	const [device, setDevice] = useState('desktop');
	const [hover, setHover] = useState(null);
	const [width, setWidth] = useState(0);
	const frameRef = useRef(null);
	const rafRef = useRef(0);
	const shots = report.screenshots || {};
	const shot = device === 'mobile' ? shots.mobile : shots.desktop;
	const inspectable = device === 'desktop' && !!shots.desktop;
	const scale = shot && width ? width / shot.width : 0;

	const nodes = useMemo(() => {
		if (!shots.desktop) return [];
		return (report.inspect || []).filter((n) => n.y < shots.desktop.height && n.w > 0 && n.h > 0);
	}, [report.inspect, shots.desktop]);

	useEffect(() => {
		const el = frameRef.current;
		if (!el) return undefined;
		const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
		ro.observe(el);
		return () => ro.disconnect();
	}, [shot]);

	useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

	const locate = useCallback(
		(event) => {
			const rect = event.currentTarget.getBoundingClientRect();
			return pickNode(nodes, (event.clientX - rect.left) / scale, (event.clientY - rect.top) / scale);
		},
		[nodes, scale],
	);

	const onMove = (event) => {
		if (!inspectable || !scale) return;
		const { clientX, clientY, currentTarget } = event;
		cancelAnimationFrame(rafRef.current);
		rafRef.current = requestAnimationFrame(() => setHover(locate({ clientX, clientY, currentTarget })));
	};

	const box = (n, tone) =>
		n && scale ? (
			<div
				className={cn(
					'pointer-events-none absolute rounded-[2px] transition-all duration-75',
					tone === 'selected' ? 'border-2 border-indigo-500 bg-indigo-500/10' : tone === 'highlight' ? 'border-2 border-dashed border-fuchsia-500 bg-fuchsia-500/10' : 'border border-sky-500 bg-sky-400/15',
				)}
				style={{ left: n.x * scale, top: n.y * scale, width: Math.max(2, n.w * scale), height: Math.max(2, n.h * scale) }}
			>
				{tone !== 'highlight' && (
					<span className="absolute -top-5 start-0 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] text-white shadow" dir="ltr">
						{n.tag}
						{n.cls ? `.${n.cls.split(' ')[0]}` : ''} · {n.w}×{n.h}
					</span>
				)}
			</div>
		) : null;

	const selectedNode = selected ? nodes.find((n) => n.i === selected.i) || selected : null;

	return (
		<div className={cn('grid gap-4', !compact && 'xl:grid-cols-[minmax(0,1fr)_360px]')}>
			<Panel
				title={t('preview')}
				icon={Crosshair}
				subtitle={inspectable ? t('previewHint') : undefined}
				bodyClassName="p-0"
				actions={
					<div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
						{[
							['desktop', Monitor, !!shots.desktop],
							['mobile', Smartphone, !!shots.mobile],
						].map(([key, Icon, available]) => (
							<button
								key={key}
								type="button"
								disabled={!available}
								onClick={() => setDevice(key)}
								className={cn('inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-slate-500 disabled:opacity-40 dark:text-slate-400', device === key && 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white')}
							>
								<Icon className="size-3.5" />
								{t(key)}
							</button>
						))}
					</div>
				}
			>
				{shot ? (
					<div className="max-h-[680px] overflow-auto bg-[radial-gradient(circle,#e2e8f0_1px,transparent_1px)] bg-[length:16px_16px] p-3 dark:bg-[radial-gradient(circle,#1e293b_1px,transparent_1px)]">
						<div ref={frameRef} className={cn('relative mx-auto overflow-hidden rounded-lg shadow-xl ring-1 ring-black/10 dark:ring-white/10', device === 'mobile' ? 'max-w-[320px]' : 'w-full')}>
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								src={`data:image/jpeg;base64,${shot.data}`}
								alt={t('screenshotAlt', { url: report.finalUrl })}
								className={cn('block w-full select-none', inspectable && 'cursor-crosshair')}
								draggable={false}
								onMouseMove={onMove}
								onMouseLeave={() => setHover(null)}
								onClick={(e) => inspectable && scale && onSelect(locate(e))}
							/>
							{inspectable && box(highlight, 'highlight')}
							{inspectable && hover && hover.i !== selectedNode?.i && box(hover, 'hover')}
							{inspectable && selectedNode && box(selectedNode, 'selected')}
						</div>
					</div>
				) : (
					<div className="p-4">
						<EmptyState icon={ImageOff}>{t('noScreenshot')}</EmptyState>
					</div>
				)}
			</Panel>

			{!compact && <InspectorPanel node={selectedNode} onClear={() => onSelect(null)} inspectable={inspectable} className="xl:sticky xl:top-28 xl:self-start" />}
		</div>
	);
}
