'use client';

import { Copy, Trash2, Pencil, Check, MousePointerClick } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatParticleCount } from '@/lib/particle-playground/asset-utils';
import { cn } from '@/lib/utils';

export function AssetLibrary({
	assets = [],
	selectedId,
	particleCount,
	onSelect,
	onRename,
	onDelete,
	onDuplicate,
}) {
	return (
		<div className="flex min-h-0 flex-1 flex-col space-y-2">
			<div className="flex items-center justify-between gap-2">
				<p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
					Library
				</p>
				<span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-500">
					{assets.length}
				</span>
			</div>

			{assets.length > 0 ? (
				<p className="flex items-center gap-1.5 text-[11px] text-zinc-500">
					<MousePointerClick className="h-3 w-3 text-emerald-400/80" />
					Click any asset to preview on canvas
				</p>
			) : null}

			<div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
				{assets.length === 0 ? (
					<div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-3 py-8 text-center">
						<p className="text-xs font-medium text-zinc-300">No assets yet</p>
						<p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
							Upload, drop, or paste a logo to start.
						</p>
					</div>
				) : (
					assets.map((asset) => {
						const selected = asset.id === selectedId;
						const src = asset.objectUrl || asset.url;
						const isModel = asset.type === 'model';
						return (
							<div
								key={asset.id}
								role="button"
								tabIndex={0}
								onClick={() => onSelect?.(asset.id)}
								onKeyDown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										onSelect?.(asset.id);
									}
								}}
								className={cn(
									'group relative rounded-xl border p-2.5 transition',
									selected
										? 'border-emerald-400/50 bg-emerald-400/[0.08] shadow-[inset_0_0_0_1px_rgba(52,211,153,0.2)]'
										: 'border-zinc-800 bg-zinc-950/70 hover:border-zinc-600 hover:bg-zinc-900/60',
								)}
							>
								{selected ? (
									<span className="absolute right-2 top-2 rounded bg-emerald-400 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-950">
										Active
									</span>
								) : null}
								<div className="flex gap-2.5">
									<div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-900 ring-1 ring-zinc-800">
										{isModel ? (
											<span className="text-[9px] uppercase text-zinc-500">3D</span>
										) : (
											// eslint-disable-next-line @next/next/no-img-element
											<img
												src={src}
												alt={asset.name}
												className="h-full w-full object-contain p-1.5"
											/>
										)}
									</div>
									<div className="min-w-0 flex-1 pr-10">
										<p className="truncate text-sm font-medium text-zinc-50">{asset.name}</p>
										<p className="mt-0.5 truncate text-[11px] text-zinc-500">
											{asset.filename || asset.url}
										</p>
										<p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-600">
											{asset.type} · {formatParticleCount(particleCount)} pts
										</p>
									</div>
								</div>
								<div className="mt-2.5 flex gap-1 border-t border-zinc-800/80 pt-2 opacity-90">
									<Button
										type="button"
										size="sm"
										variant="ghost"
										className="h-7 flex-1 px-1 text-[10px] text-zinc-400"
										onClick={(e) => {
											e.stopPropagation();
											const next = window.prompt('Rename asset', asset.name);
											if (next?.trim()) onRename?.(asset.id, next.trim());
										}}
									>
										<Pencil className="mr-1 h-3 w-3" /> Rename
									</Button>
									<Button
										type="button"
										size="sm"
										variant="ghost"
										className="h-7 px-2 text-zinc-400"
										title="Duplicate"
										onClick={(e) => {
											e.stopPropagation();
											onDuplicate?.(asset.id);
										}}
									>
										<Copy className="h-3 w-3" />
									</Button>
									<Button
										type="button"
										size="sm"
										variant="ghost"
										className="h-7 px-2 text-red-400/80"
										title="Delete"
										onClick={(e) => {
											e.stopPropagation();
											onDelete?.(asset.id);
										}}
									>
										<Trash2 className="h-3 w-3" />
									</Button>
								</div>
								{!selected ? (
									<div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
										<span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-zinc-950">
											Preview
										</span>
									</div>
								) : (
									<div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-300/90">
										<Check className="h-3 w-3" /> Showing on canvas
									</div>
								)}
							</div>
						);
					})
				)}
			</div>
		</div>
	);
}
