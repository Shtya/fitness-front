'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import {
	ArrowLeftRight,
	BookMarked,
	Check,
	ListChecks,
	LoaderCircle,
	Sparkles,
	Wand2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import {
	enhanceTranscription,
	enhanceTranscriptionErrorMessage,
	getStoredEnhanceAiProvider,
	memorizeTranscription,
	storeEnhanceAiProvider,
	summarizeTranscription,
} from './transcription-client';

const labels = {
	en: {
		aiTools: 'AI cleanup & memorize',
		aiHint:
			'Fix unclear speech mistakes, compare before/after, then expand the topic into study-ready details.',
		enhance: 'Enhance with AI',
		enhancing: 'Enhancing…',
		memorize: 'Memorize details',
		memorizing: 'Building memorize pack…',
		before: 'Before',
		after: 'After',
		apply: 'Apply enhanced',
		applied: 'Enhanced text applied',
		revert: 'Revert to before',
		changes: 'What changed',
		noChanges: 'No change notes returned.',
		compare: 'Before / After',
		tldr: 'TL;DR',
		expanded: 'Expanded notes',
		keyPoints: 'Key points',
		terms: 'Terms',
		remember: 'Remember',
		flashcards: 'Flashcards',
		questions: 'Open questions',
		enhanceFailed: 'Could not enhance this transcript.',
		memorizeFailed: 'Could not build memorize notes.',
		summarize: 'Summarize request',
		summarizing: 'Summarizing…',
		summarizeFailed: 'Could not summarize this transcript.',
		summarizedBadge: 'Summary',
		request: 'What they asked for',
		context: 'Context',
		asks: 'Asks',
		nextSteps: 'Next steps',
		needText: 'Add transcript text first.',
		enhancedBadge: 'Enhanced',
		memorizedBadge: 'Memorized',
		originalCollapsed: 'Original transcript',
		enhancedOpen: 'Corrected transcript',
		enhanceApplied: 'Transcript corrected',
		enhancePartial: 'Basic cleanup only — AI providers were unavailable.',
		toggleOriginal: 'Show / hide original',
	},
	ar: {
		aiTools: 'تنظيف بالذكاء الاصطناعي + تثبيت',
		aiHint:
			'يصلح أخطاء الكلام غير الواضح، يعرض قبل/بعد، ثم يوسّع الموضوع بتفاصيل أسهل للحفظ.',
		enhance: 'تحسين بالذكاء الاصطناعي',
		enhancing: 'جاري التحسين…',
		memorize: 'تثبيت بتفاصيل أكثر',
		memorizing: 'جاري تجهيز ملاحظات الحفظ…',
		before: 'قبل',
		after: 'بعد',
		apply: 'تطبيق النص المحسّن',
		applied: 'تم تطبيق النص المحسّن',
		revert: 'الرجوع للنص قبل التحسين',
		changes: 'ما الذي تغيّر',
		noChanges: 'لا توجد ملاحظات تغيير.',
		compare: 'قبل / بعد',
		tldr: 'ملخص سريع',
		expanded: 'ملاحظات موسّعة',
		keyPoints: 'نقاط أساسية',
		terms: 'مصطلحات',
		remember: 'احفظ',
		flashcards: 'بطاقات',
		questions: 'أسئلة مفتوحة',
		enhanceFailed: 'تعذر تحسين النص.',
		memorizeFailed: 'تعذر إنشاء ملاحظات الحفظ.',
		summarize: 'تلخيص الطلب',
		summarizing: 'جارٍ التلخيص…',
		summarizeFailed: 'تعذر تلخيص النص.',
		summarizedBadge: 'ملخص',
		request: 'هو طالب إيه',
		context: 'السياق',
		asks: 'الطلبات',
		nextSteps: 'خطوات تالية',
		needText: 'أضف نص التحويل أولاً.',
		enhancedBadge: 'محسّن',
		memorizedBadge: 'مثبّت',
		originalCollapsed: 'النص الأصلي',
		enhancedOpen: 'النص بعد التصحيح',
		enhanceApplied: 'تم تصحيح النص',
		enhancePartial: 'تم تنظيف بسيط فقط — مزوّدات الذكاء الاصطناعي غير متاحة حالياً.',
		toggleOriginal: 'إظهار / إخفاء الأصلي',
	},
};

const TranscriptionAiPanel = forwardRef(function TranscriptionAiPanel({
	locale = 'en',
	transcriptionId,
	transcriptText,
	onApplyText,
	onResultUpdated,
	onBusyChange,
	onEnhanced,
	initialCompare = null,
	initialMemorize = null,
	initialSummary = null,
	variant = 'page',
}, ref) {
	const t = labels[locale?.startsWith?.('ar') ? 'ar' : 'en'] || labels.en;
	const compact = variant === 'compact';
	const [enhancing, setEnhancing] = useState(false);
	const [memorizing, setMemorizing] = useState(false);
	const [summarizing, setSummarizing] = useState(false);
	const [compare, setCompare] = useState(initialCompare);
	const [memorize, setMemorize] = useState(initialMemorize);
	const [summary, setSummary] = useState(initialSummary);
	const [view, setView] = useState(
		initialCompare ? 'compare' : initialSummary ? 'summary' : 'editor',
	);

	const changes = useMemo(
		() =>
			Array.isArray(compare?.changesSummary)
				? compare.changesSummary.filter(Boolean)
				: [],
		[compare],
	);

	const runEnhance = async () => {
		if (!transcriptionId) return;
		const text = String(transcriptText || '').trim();
		if (!text) {
			toast.error(t.needText);
			return;
		}
		setEnhancing(true);
		try {
			const preferredProvider = getStoredEnhanceAiProvider();
			const data = await enhanceTranscription(transcriptionId, {
				text,
				locale: 'auto',
				mode: 'full',
				// Persist corrected text so Copy / Save use the enhanced version.
				apply: true,
				...(preferredProvider ? { provider: preferredProvider } : {}),
			});
			const originalText = data.originalText || text;
			const enhancedText = String(data.enhancedText || text).trim() || text;
			const next = {
				originalText,
				enhancedText,
				changesSummary: data.changesSummary || [],
			};
			setCompare(next);
			setView('compare');
			onApplyText?.(enhancedText);
			onEnhanced?.(next);
			onResultUpdated?.(data.transcription || null);
			if (data.provider && data.provider !== 'local-fallback') {
				storeEnhanceAiProvider(data.provider);
			}
			if (data.usedLocalFallback) {
				toast(t.enhancePartial, { icon: '⚠️' });
			} else {
				toast.success(t.enhanceApplied);
			}
		} catch (error) {
			toast.error(enhanceTranscriptionErrorMessage(error, locale));
		} finally {
			setEnhancing(false);
		}
	};

	const runMemorize = async () => {
		if (!transcriptionId) return;
		const text = String(
			compare?.enhancedText || transcriptText || '',
		).trim();
		if (!text) {
			toast.error(t.needText);
			return;
		}
		setMemorizing(true);
		try {
			const data = await memorizeTranscription(transcriptionId, {
				text,
				locale: locale?.startsWith?.('ar') ? 'ar' : 'en',
				depth: 'detailed',
				includeFlashcards: true,
			});
			setMemorize(data.memorize || null);
			setView('memorize');
			onResultUpdated?.(data.transcription || null);
			toast.success(t.memorize);
		} catch (error) {
			toast.error(error?.response?.data?.message || t.memorizeFailed);
		} finally {
			setMemorizing(false);
		}
	};

	const runSummarize = async () => {
		if (!transcriptionId) return;
		const text = String(compare?.enhancedText || transcriptText || '').trim();
		if (!text) {
			toast.error(t.needText);
			return;
		}
		setSummarizing(true);
		try {
			const data = await summarizeTranscription(transcriptionId, {
				text,
				locale: 'auto',
			});
			setSummary(data.summary || null);
			setView('summary');
			onResultUpdated?.(data.transcription || null);
			toast.success(t.summarizedBadge);
		} catch (error) {
			toast.error(error?.response?.data?.message || t.summarizeFailed);
		} finally {
			setSummarizing(false);
		}
	};

	const applyEnhanced = () => {
		if (!compare?.enhancedText) return;
		onApplyText?.(compare.enhancedText);
		toast.success(t.applied);
	};

	const revertBefore = () => {
		if (!compare?.originalText) return;
		onApplyText?.(compare.originalText);
	};

	useImperativeHandle(ref, () => ({
		enhance: runEnhance,
		summarize: runSummarize,
	}));

	useEffect(() => {
		onBusyChange?.({ enhancing, summarizing });
	}, [enhancing, summarizing, onBusyChange]);

	const shellClass = compact
		? 'mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-3'
		: 'mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 md:p-5';
	const ghostBtn = compact
		? 'inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700'
		: 'learning-pill-btn--light !px-3 !py-2 !text-xs';
	const primaryBtn = compact
		? 'inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--color-primary-600)] px-3 text-[12px] font-semibold text-white disabled:opacity-50'
		: 'learning-pill-btn !px-4 !py-2.5';
	const lightBtn = compact
		? 'inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-[#f7f8fa] px-3 text-[12px] font-semibold text-slate-700 disabled:opacity-50'
		: 'learning-pill-btn--light !px-4 !py-2.5';

	const card = compact
		? 'rounded-xl border border-slate-200 bg-[#f7f8fa] p-2.5'
		: 'learning-neu-inset p-4';

	if (compact && !compare && !summary) {
		return <div className="hidden" aria-hidden="true" />;
	}

	return (
		<section className={compact ? 'mt-3' : shellClass}>
			{compact ? (
				<div className="mb-2 flex flex-wrap gap-1.5">
					{compare ? (
						<button
							type="button"
							onClick={() => setView('compare')}
							className={`${ghostBtn} ${view === 'compare' ? 'ring-2 ring-[var(--color-primary-400)]' : ''}`}
						>
							<ArrowLeftRight size={14} />
							{t.compare}
						</button>
					) : null}
					{summary ? (
						<button
							type="button"
							onClick={() => setView('summary')}
							className={`${ghostBtn} ${view === 'summary' ? 'ring-2 ring-sky-400' : ''}`}
						>
							<ListChecks size={14} />
							{t.summarizedBadge}
						</button>
					) : null}
				</div>
			) : (
			<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<div className="min-w-0">
					<h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
						<span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-primary-50)] text-[var(--color-primary-600)]">
							<Sparkles size={16} />
						</span>
						{t.aiTools}
					</h3>
					<p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">{t.aiHint}</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{(compare || memorize || summary) && (
						<>
							{compare ? (
								<button
									type="button"
									onClick={() => setView('compare')}
									className={`${ghostBtn} ${
										view === 'compare' ? 'ring-2 ring-[var(--color-primary-400)]' : ''
									}`}
								>
									<ArrowLeftRight size={14} />
									{t.compare}
								</button>
							) : null}
							{summary ? (
								<button
									type="button"
									onClick={() => setView('summary')}
									className={`${ghostBtn} ${
										view === 'summary' ? 'ring-2 ring-sky-400' : ''
									}`}
								>
									<ListChecks size={14} />
									{t.summarizedBadge}
								</button>
							) : null}
							{memorize ? (
								<button
									type="button"
									onClick={() => setView('memorize')}
									className={`${ghostBtn} ${
										view === 'memorize' ? 'ring-2 ring-amber-400' : ''
									}`}
								>
									<BookMarked size={14} />
									{t.memorizedBadge}
								</button>
							) : null}
						</>
					)}
					<button
						type="button"
						disabled={enhancing || !transcriptionId}
						onClick={runEnhance}
						className="inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
					>
						{enhancing ? (
							<LoaderCircle size={15} className="animate-spin" />
						) : (
							<Wand2 size={15} />
						)}
						{enhancing ? t.enhancing : t.enhance}
					</button>
					<button
						type="button"
						disabled={summarizing || !transcriptionId}
						onClick={runSummarize}
						className="inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
					>
						{summarizing ? (
							<LoaderCircle size={15} className="animate-spin" />
						) : (
							<ListChecks size={15} />
						)}
						{summarizing ? t.summarizing : t.summarize}
					</button>
					<button
						type="button"
						disabled={memorizing || !transcriptionId}
						onClick={runMemorize}
						className="inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
					>
						{memorizing ? (
							<LoaderCircle size={15} className="animate-spin" />
						) : (
							<BookMarked size={15} />
						)}
						{memorizing ? t.memorizing : t.memorize}
					</button>
				</div>
			</div>
			)}

			{view === 'compare' && compare ? (
				<div className={compact ? 'space-y-2' : 'mt-4 space-y-4'}>
					{compact ? null : (
						<div className="grid gap-3 lg:grid-cols-2">
							<div className={card}>
								<div className="mb-2 flex items-center justify-between gap-2">
									<p className="text-xs font-black uppercase tracking-wide text-slate-500">
										{t.before}
									</p>
									<span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-600">
										ASR
									</span>
								</div>
								<pre className="max-h-72 overflow-y-auto whitespace-pre-wrap break-words font-sans text-sm leading-7 text-slate-700">
									{compare.originalText}
								</pre>
							</div>
							<div className={`${card} border-[var(--color-primary-200)] bg-[var(--color-primary-50)]/40`}>
								<div className="mb-2 flex items-center justify-between gap-2">
									<p className="text-xs font-black uppercase tracking-wide text-[var(--color-primary-700)]">
										{t.after}
									</p>
									<span className="rounded-full bg-[var(--color-primary-500)] px-2 py-0.5 text-[10px] font-bold text-white">
										{t.enhancedBadge}
									</span>
								</div>
								<pre className="max-h-72 overflow-y-auto whitespace-pre-wrap break-words font-sans text-sm leading-7 text-slate-800">
									{compare.enhancedText}
								</pre>
							</div>
						</div>
					)}

					<div className={compact ? 'rounded-xl border border-slate-200 bg-[#f7f8fa] px-2.5 py-2' : card}>
						<p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
							{t.changes}
						</p>
						{changes.length ? (
							<ul className={`mt-1.5 space-y-1 ${compact ? 'text-[11px] leading-5' : 'text-sm'} text-slate-700`}>
								{changes.map(item => (
									<li key={item} className="flex gap-2">
										<Check size={compact ? 12 : 14} className="mt-0.5 shrink-0 text-emerald-600" />
										<span>{item}</span>
									</li>
								))}
							</ul>
						) : (
							<p className={`mt-1.5 ${compact ? 'text-[11px]' : 'text-sm'} text-slate-500`}>{t.noChanges}</p>
						)}
						{!compact ? (
							<div className="mt-2 flex flex-wrap gap-2">
								<Button size="sm" onClick={applyEnhanced}>
									<Check />
									{t.apply}
								</Button>
								<Button size="sm" variant="outline" onClick={revertBefore}>
									{t.revert}
								</Button>
							</div>
						) : (
							<div className="mt-2 flex flex-wrap gap-2">
								<Button size="sm" variant="outline" onClick={revertBefore}>
									{t.revert}
								</Button>
							</div>
						)}
					</div>
				</div>
			) : null}

			{view === 'summary' && summary ? (
				<div className="mt-4 space-y-3">
					{summary.tldr ? (
						<div className={card}>
							<p className="text-xs font-black uppercase tracking-wide text-sky-700">
								{t.tldr}
							</p>
							<p className="mt-2 text-sm leading-7 text-slate-800">{summary.tldr}</p>
						</div>
					) : null}
					{summary.request ? (
						<div className={card}>
							<p className="text-xs font-black uppercase tracking-wide text-slate-500">
								{t.request}
							</p>
							<p className="mt-2 text-sm leading-7 text-slate-800">{summary.request}</p>
						</div>
					) : null}
					{summary.context ? (
						<div className={card}>
							<p className="text-xs font-black uppercase tracking-wide text-slate-500">
								{t.context}
							</p>
							<p className="mt-2 text-sm leading-7 text-slate-800">{summary.context}</p>
						</div>
					) : null}
					{Array.isArray(summary.asks) && summary.asks.length > 0 ? (
						<div className={card}>
							<p className="text-xs font-black uppercase tracking-wide text-slate-500">
								{t.asks}
							</p>
							<ul className="mt-2 space-y-1.5 text-sm text-slate-700">
								{summary.asks.map(item => (
									<li key={item} className="flex gap-2">
										<span className="mt-2 size-1.5 shrink-0 rounded-full bg-sky-500" />
										<span>{item}</span>
									</li>
								))}
							</ul>
						</div>
					) : null}
					{Array.isArray(summary.nextSteps) && summary.nextSteps.length > 0 ? (
						<div className={card}>
							<p className="text-xs font-black uppercase tracking-wide text-slate-500">
								{t.nextSteps}
							</p>
							<ol className="mt-2 list-decimal space-y-1.5 ps-5 text-sm text-slate-700">
								{summary.nextSteps.map(item => (
									<li key={item}>{item}</li>
								))}
							</ol>
						</div>
					) : null}
				</div>
			) : null}

			{view === 'memorize' && memorize ? (
				<div className="mt-4 space-y-3">
					{memorize.tldr ? (
						<div className="learning-neu-inset p-4">
							<p className="text-xs font-black uppercase tracking-wide text-amber-700">
								{t.tldr}
							</p>
							<p className="mt-2 text-sm leading-7 text-slate-800">{memorize.tldr}</p>
						</div>
					) : null}

					{memorize.expandedNotes ? (
						<div className="learning-neu-inset p-4">
							<p className="text-xs font-black uppercase tracking-wide text-slate-500">
								{t.expanded}
							</p>
							<pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm leading-7 text-slate-800">
								{memorize.expandedNotes}
							</pre>
						</div>
					) : null}

					{Array.isArray(memorize.keyPoints) && memorize.keyPoints.length > 0 ? (
						<div className="learning-neu-inset p-4">
							<p className="text-xs font-black uppercase tracking-wide text-slate-500">
								{t.keyPoints}
							</p>
							<ul className="mt-2 space-y-1.5 text-sm text-slate-700">
								{memorize.keyPoints.map(item => (
									<li key={item} className="flex gap-2">
										<span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--color-primary-500)]" />
										<span>{item}</span>
									</li>
								))}
							</ul>
						</div>
					) : null}

					{Array.isArray(memorize.terms) && memorize.terms.length > 0 ? (
						<div className="learning-neu-inset p-4">
							<p className="text-xs font-black uppercase tracking-wide text-slate-500">
								{t.terms}
							</p>
							<div className="mt-3 grid gap-2 sm:grid-cols-2">
								{memorize.terms.map(item => (
									<div
										key={`${item.term}-${item.definition}`}
										className="rounded-2xl border border-slate-200/80 bg-white/80 p-3"
									>
										<p className="text-sm font-black text-slate-900">{item.term}</p>
										<p className="mt-1 text-xs leading-5 text-slate-600">
											{item.definition}
										</p>
									</div>
								))}
							</div>
						</div>
					) : null}

					{Array.isArray(memorize.remember) && memorize.remember.length > 0 ? (
						<div className="learning-neu-inset p-4">
							<p className="text-xs font-black uppercase tracking-wide text-slate-500">
								{t.remember}
							</p>
							<ul className="mt-2 space-y-1.5 text-sm text-slate-700">
								{memorize.remember.map(item => (
									<li key={item}>• {item}</li>
								))}
							</ul>
						</div>
					) : null}

					{Array.isArray(memorize.flashcards) && memorize.flashcards.length > 0 ? (
						<div className="learning-neu-inset p-4">
							<p className="text-xs font-black uppercase tracking-wide text-slate-500">
								{t.flashcards}
							</p>
							<div className="mt-3 grid gap-2 md:grid-cols-2">
								{memorize.flashcards.map((card, index) => (
									<div
										key={`${card.front}-${index}`}
										className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-3"
									>
										<p className="text-sm font-black text-amber-950">{card.front}</p>
										<p className="mt-2 text-xs leading-5 text-amber-900/80">{card.back}</p>
									</div>
								))}
							</div>
						</div>
					) : null}

					{Array.isArray(memorize.openQuestions) && memorize.openQuestions.length > 0 ? (
						<div className="learning-neu-inset p-4">
							<p className="text-xs font-black uppercase tracking-wide text-slate-500">
								{t.questions}
							</p>
							<ol className="mt-2 list-decimal space-y-1.5 ps-5 text-sm text-slate-700">
								{memorize.openQuestions.map(item => (
									<li key={item}>{item}</li>
								))}
							</ol>
						</div>
					) : null}
				</div>
			) : null}
		</section>
	);
});

TranscriptionAiPanel.displayName = 'TranscriptionAiPanel';

export default TranscriptionAiPanel;
