'use client';

import { useState } from 'react';
import { Loader2, MonitorPlay, RefreshCw, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DemoPresentationCard({ demo, labels, locale }) {
	const [progress, setProgress] = useState(null);
	const [failure, setFailure] = useState('');
	const presenting = Boolean(demo.settings.enabled && demo.settings.featureFlags?.showcaseOnly);
	const busy = demo.loading || demo.saving || progress !== null;
	const percent = progress?.total ? Math.round((progress.done / progress.total) * 100) : 0;

	const run = async action => {
		setFailure('');
		setProgress({ done: 0, total: 0 });
		try {
			await action({ locale, onProgress: setProgress });
		} catch (error) {
			setFailure(error?.response?.data?.message || error?.message || labels.presentationFailed);
		} finally {
			setProgress(null);
		}
	};

	return (
		<section
			dir={labels.dir}
			data-demo-presentation={presenting ? 'on' : 'off'}
			className={`mb-4 overflow-hidden rounded-2xl border shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ${
				presenting
					? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/20'
					: 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
			}`}
		>
			<div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
				<div className="flex min-w-0 gap-3">
					<span
						className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white shadow-md ${
							presenting ? 'bg-emerald-500 shadow-emerald-500/25' : 'bg-[#25D366] shadow-[#25D366]/25'
						}`}
					>
						<MonitorPlay size={20} />
					</span>
					<div className="min-w-0">
						<h2 className="text-base font-black text-slate-900 dark:text-white">{labels.presentationTitle}</h2>
						<p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-600 dark:text-slate-300">
							{labels.presentationHint}
						</p>
						<p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-slate-400">{labels.presentationIncludes}</p>
						<p
							className={`mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold ${
								presenting ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'
							}`}
						>
							<span
								className={`h-2 w-2 rounded-full ${presenting ? 'animate-pulse bg-emerald-500' : 'bg-slate-300'}`}
							/>
							{presenting ? labels.presentationLive : labels.presentationOff}
						</p>
					</div>
				</div>
				<div className="flex shrink-0 flex-col items-stretch gap-2 sm:w-56">
					{presenting ? (
						<Button type="button" variant="outline" disabled={busy} onClick={() => void run(demo.stopPresentation)}>
							<Square />
							{labels.presentationStop}
						</Button>
					) : (
						<Button
							type="button"
							disabled={busy}
							onClick={() => void run(demo.startPresentation)}
							className="bg-[#25D366] text-white hover:bg-[#1fb257]"
						>
							{progress ? <Loader2 className="animate-spin" /> : <MonitorPlay />}
							{labels.presentationStart}
						</Button>
					)}
					{demo.showcaseProfile && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							disabled={busy}
							onClick={() => void run(demo.generateShowcase)}
						>
							<RefreshCw />
							{labels.presentationRegenerate}
						</Button>
					)}
					<p className="text-center text-[10px] leading-snug text-slate-400">
						{demo.showcaseProfile ? labels.presentationReady : labels.presentationNotReady}
					</p>
				</div>
			</div>
			{progress && (
				<div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5" role="status" aria-live="polite">
					<div className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-slate-500">
						<span>{labels.presentationPreparing}</span>
						{progress.total > 0 && (
							<span dir="ltr">
								{progress.done}/{progress.total}
							</span>
						)}
					</div>
					<div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
						<div className="h-full rounded-full bg-[#25D366] transition-[width]" style={{ width: `${percent}%` }} />
					</div>
				</div>
			)}
			{failure && (
				<p className="border-t border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-600 dark:border-rose-900 dark:bg-rose-950/20 sm:px-5">
					{labels.presentationFailed} {failure !== labels.presentationFailed ? `(${failure})` : ''}
				</p>
			)}
		</section>
	);
}
