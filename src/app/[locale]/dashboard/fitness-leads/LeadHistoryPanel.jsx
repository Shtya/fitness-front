'use client';

import { Download, Eye, History, LoaderCircle, Star, Trash2, X } from 'lucide-react';

function formatWhen(iso, isAr) {
	if (!iso) return '';
	try {
		return new Date(iso).toLocaleString(isAr ? 'ar' : 'en', {
			dateStyle: 'medium',
			timeStyle: 'short',
		});
	} catch {
		return String(iso);
	}
}

export default function LeadHistoryPanel({
	open,
	onClose,
	history,
	loading,
	activeJobId,
	openingJobId,
	downloadingJobId,
	favoritingJobId,
	deletingJobId,
	onOpen,
	onDownload,
	onToggleFavorite,
	onDelete,
	t,
	isAr,
}) {
	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose}>
			<aside
				dir={isAr ? 'rtl' : 'ltr'}
				className="flex h-full w-full max-w-3xl flex-col border-s border-slate-200 bg-white shadow-2xl"
				onClick={e => e.stopPropagation()}
			>
				<header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
					<div>
						<div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
							<History className="h-3.5 w-3.5" />
							{t.history}
						</div>
						<p className="mt-1 text-sm text-slate-500">{t.historySubtitle}</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
						aria-label={t.close}
					>
						<X className="h-4 w-4" />
					</button>
				</header>

				<div className="flex-1 overflow-y-auto">
					{loading ? (
						<div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
							<LoaderCircle className="h-4 w-4 animate-spin" />
							{t.loadingHistory}
						</div>
					) : !history.length ? (
						<p className="px-2 py-16 text-center text-sm text-slate-400">{t.historyEmpty}</p>
					) : (
						<div className="overflow-x-auto">
							<table className="min-w-full border-collapse text-sm">
								<thead className="sticky top-0 z-10 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
									<tr className="border-b border-slate-200">
										<th className="w-10 px-2 py-2.5 text-center font-semibold">
											<span className="sr-only">{t.historyFavorite}</span>
											<Star className="mx-auto h-3.5 w-3.5" />
										</th>
										<th className="px-3 py-2.5 text-start font-semibold">{t.historyColSearch}</th>
										<th className="px-3 py-2.5 text-start font-semibold">{t.historyColCities}</th>
										<th className="whitespace-nowrap px-3 py-2.5 text-start font-semibold">{t.historyColWhen}</th>
										<th className="whitespace-nowrap px-3 py-2.5 text-start font-semibold">{t.leadsLabel}</th>
										<th className="px-3 py-2.5 text-end font-semibold">{t.historyColActions}</th>
									</tr>
								</thead>
								<tbody>
									{history.map(item => {
										const active = activeJobId === item.jobId;
										const title =
											(item.categories || []).slice(0, 3).join(', ') ||
											(item.cities || []).slice(0, 2).join(', ') ||
											item.jobId.slice(0, 8);
										const busy =
											openingJobId === item.jobId ||
											downloadingJobId === item.jobId ||
											favoritingJobId === item.jobId ||
											deletingJobId === item.jobId;
										const fav = Boolean(item.isFavorite);
										return (
											<tr
												key={item.jobId}
												className={`border-b border-slate-100 transition ${
													active
														? 'bg-emerald-50/80'
														: fav
															? 'bg-amber-50/40 hover:bg-amber-50/70'
															: 'bg-white hover:bg-slate-50'
												}`}
											>
												<td className="px-2 py-2 text-center">
													<button
														type="button"
														disabled={busy}
														onClick={() => onToggleFavorite?.(item)}
														title={fav ? t.historyUnfavorite : t.historyFavorite}
														className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition disabled:opacity-40 ${
															fav
																? 'text-amber-500 hover:bg-amber-100'
																: 'text-slate-300 hover:bg-slate-100 hover:text-amber-500'
														}`}
													>
														{favoritingJobId === item.jobId ? (
															<LoaderCircle className="h-3.5 w-3.5 animate-spin" />
														) : (
															<Star
																className="h-4 w-4"
																fill={fav ? 'currentColor' : 'none'}
																strokeWidth={fav ? 0 : 2}
															/>
														)}
													</button>
												</td>
												<td className="max-w-[180px] px-3 py-2">
													<div className="truncate font-medium text-slate-900" title={title}>
														{title}
													</div>
												</td>
												<td className="max-w-[160px] px-3 py-2 text-slate-600">
													<div
														className="truncate text-[12px]"
														title={(item.cities || []).join(' · ')}
													>
														{(item.cities || []).length
															? (item.cities || []).join(' · ')
															: '—'}
													</div>
												</td>
												<td className="whitespace-nowrap px-3 py-2 text-[12px] text-slate-500">
													{formatWhen(item.createdAt, isAr)}
												</td>
												<td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-700">
													{item.leadsCount || 0}
												</td>
												<td className="px-3 py-2">
													<div className="flex items-center justify-end gap-1">
														<button
															type="button"
															disabled={busy || !item.leadsCount}
															onClick={() => onDownload(item)}
															title={t.historyDownload}
															className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2 text-[11px] font-semibold text-slate-700 hover:bg-white disabled:opacity-40"
														>
															{downloadingJobId === item.jobId ? (
																<LoaderCircle className="h-3.5 w-3.5 animate-spin" />
															) : (
																<Download className="h-3.5 w-3.5" />
															)}
															{t.historyDownload}
														</button>
														<button
															type="button"
															disabled={busy}
															onClick={() => onOpen(item.jobId)}
															title={t.historyOpen}
															className="inline-flex h-8 items-center gap-1 rounded-lg bg-slate-900 px-2 text-[11px] font-semibold text-white disabled:opacity-50"
														>
															{openingJobId === item.jobId ? (
																<LoaderCircle className="h-3.5 w-3.5 animate-spin" />
															) : (
																<Eye className="h-3.5 w-3.5" />
															)}
															{t.historyOpen}
														</button>
														<button
															type="button"
															disabled={busy}
															onClick={() => onDelete?.(item)}
															title={t.historyDelete}
															className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 text-red-500 hover:bg-red-50 disabled:opacity-40"
														>
															{deletingJobId === item.jobId ? (
																<LoaderCircle className="h-3.5 w-3.5 animate-spin" />
															) : (
																<Trash2 className="h-3.5 w-3.5" />
															)}
														</button>
													</div>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</aside>
		</div>
	);
}
