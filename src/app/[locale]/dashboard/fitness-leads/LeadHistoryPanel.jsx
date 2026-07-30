'use client';

import { Download, Eye, History, LoaderCircle, X } from 'lucide-react';

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
	onOpen,
	onDownload,
	t,
	isAr,
}) {
	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose}>
			<aside
				dir={isAr ? 'rtl' : 'ltr'}
				className="flex h-full w-full max-w-md flex-col border-s border-slate-200 bg-white shadow-2xl"
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

				<div className="flex-1 overflow-y-auto px-3 py-2">
					{loading ? (
						<div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
							<LoaderCircle className="h-4 w-4 animate-spin" />
							{t.loadingHistory}
						</div>
					) : !history.length ? (
						<p className="px-2 py-16 text-center text-sm text-slate-400">{t.historyEmpty}</p>
					) : (
						<ul className="space-y-2">
							{history.map(item => {
								const active = activeJobId === item.jobId;
								const title =
									(item.categories || []).slice(0, 3).join(', ') ||
									(item.cities || []).slice(0, 2).join(', ') ||
									item.jobId.slice(0, 8);
								const busy = openingJobId === item.jobId || downloadingJobId === item.jobId;
								return (
									<li
										key={item.jobId}
										className={`rounded-xl border p-3 transition ${
											active
												? 'border-emerald-300 bg-emerald-50/70'
												: 'border-slate-200 bg-white hover:border-slate-300'
										}`}
									>
										<div className="min-w-0">
											<div className="truncate text-sm font-semibold text-slate-900">{title}</div>
											<div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
												<span>{formatWhen(item.createdAt, isAr)}</span>
												<span>
													{item.leadsCount || 0} {t.leadsLabel}
												</span>
												<span className="font-medium uppercase tracking-wide">{item.status}</span>
											</div>
											{(item.cities || []).length > 0 && (
												<div className="mt-1.5 truncate text-[11px] text-slate-600">
													{(item.cities || []).join(' · ')}
												</div>
											)}
										</div>
										<div className="mt-3 flex gap-2">
											<button
												type="button"
												disabled={busy || !item.leadsCount}
												onClick={() => onDownload(item)}
												className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40"
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
												className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-2 py-2 text-xs font-semibold text-white disabled:opacity-50"
											>
												{openingJobId === item.jobId ? (
													<LoaderCircle className="h-3.5 w-3.5 animate-spin" />
												) : (
													<Eye className="h-3.5 w-3.5" />
												)}
												{t.historyOpen}
											</button>
										</div>
									</li>
								);
							})}
						</ul>
					)}
				</div>
			</aside>
		</div>
	);
}
