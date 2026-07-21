'use client';

import { AlertCircle, RefreshCw, Sparkles } from 'lucide-react';

const COPY = {
	en: {
		title: 'AI reply suggestions',
		regenerate: 'Regenerate suggestions',
		retry: 'Retry',
		hint: 'Select a suggestion to edit it before sending.',
		prompt: 'Prompt',
	},
	ar: {
		title: 'اقتراحات الرد بالذكاء الاصطناعي',
		regenerate: 'إنشاء اقتراحات جديدة',
		retry: 'إعادة المحاولة',
		hint: 'اختر اقتراحًا لتعديله قبل الإرسال.',
		prompt: 'التعليمات',
	},
};

export default function AiReplySuggestions({
	locale = 'en',
	enabled,
	loading,
	error,
	suggestions,
	prompts = [],
	activePromptId,
	promptSaving,
	onSelect,
	onRegenerate,
	onPromptChange,
	repliesOnly = false,
}) {
	if (!enabled) return null;
	const text = COPY[String(locale).toLowerCase().startsWith('ar') ? 'ar' : 'en'];

	return (
		<section
			aria-label={text.title}
			className={`wa-ai-suggestions border-t border-slate-100 bg-white/95 px-3 py-2.5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 ${
				repliesOnly ? 'wa-ai-suggestions--replies-only' : ''
			}`}
		>
			{!repliesOnly && (
				<div className="mb-2 flex flex-wrap items-center justify-between gap-2">
					<div className="min-w-0">
						<div className="flex items-center gap-1.5 text-xs font-black text-violet-700 dark:text-violet-300">
							<Sparkles size={14} aria-hidden="true" />
							<span>{text.title}</span>
						</div>
						<p className="mt-0.5 truncate text-[10px] text-slate-400">{text.hint}</p>
					</div>
					<div className="flex min-w-0 items-center gap-2">
						{prompts.length > 0 && (
							<label className="flex min-w-0 items-center gap-1.5 text-[10px] font-bold text-slate-500">
								<span className="shrink-0">{text.prompt}</span>
								<select
									value={activePromptId || prompts[0]?.id || ''}
									onChange={event => onPromptChange(event.target.value)}
									disabled={promptSaving}
									className="h-8 min-w-0 max-w-44 rounded-lg border border-violet-200 bg-white px-2 text-xs font-bold text-slate-700 outline-none focus:border-violet-500 disabled:opacity-50 dark:border-violet-900 dark:bg-slate-900 dark:text-slate-200"
								>
									{prompts.map(prompt => (
										<option key={prompt.id} value={prompt.id}>
											{prompt.name}
										</option>
									))}
								</select>
							</label>
						)}
						<button
							type="button"
							onClick={onRegenerate}
							disabled={loading}
							aria-label={text.regenerate}
							title={text.regenerate}
							className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-violet-600 transition hover:bg-violet-50 disabled:cursor-wait disabled:opacity-50 dark:text-violet-300 dark:hover:bg-violet-950/40"
						>
							<RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
						</button>
					</div>
				</div>
			)}

			{loading ? (
				<div className="flex gap-2 overflow-hidden" aria-busy="true">
					{[72, 96, 80].map(width => (
						<div
							key={width}
							className="h-9 shrink-0 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800"
							style={{ width: `${width * 1.5}px` }}
						/>
					))}
				</div>
			) : error ? (
				<div className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
					<span className="flex min-w-0 items-start gap-2">
						<AlertCircle size={14} className="mt-0.5 shrink-0" />
						<span className="break-words leading-5">{error}</span>
					</span>
					<button
						type="button"
						onClick={onRegenerate}
						className="shrink-0 font-black underline underline-offset-2"
					>
						{text.retry}
					</button>
				</div>
			) : (
				<div className="nice-scroll flex max-w-full gap-2 overflow-x-auto pb-1">
					{suggestions.map((suggestion, index) => (
						<button
							key={`${index}-${suggestion}`}
							type="button"
							onClick={() => onSelect(suggestion)}
							className="max-w-[min(32rem,82vw)] shrink-0 whitespace-normal rounded-2xl border border-violet-200 bg-violet-50/70 px-3.5 py-2 text-start text-xs font-semibold leading-5 text-slate-700 transition hover:border-violet-400 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-violet-900 dark:bg-violet-950/30 dark:text-slate-200 dark:hover:border-violet-700"
						>
							{suggestion}
						</button>
					))}
				</div>
			)}
		</section>
	);
}
