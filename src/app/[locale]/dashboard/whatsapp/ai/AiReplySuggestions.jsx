'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
	AlertCircle,
	Check,
	ChevronDown,
	Loader2,
	Power,
	RefreshCw,
	Sparkles,
} from 'lucide-react';

const COPY = {
	en: {
		title: 'AI suggestions',
		regenerate: 'Regenerate suggestions',
		retry: 'Retry',
		hint: 'Tap a suggestion to edit it before sending.',
		prompt: 'Instructions',
		enableTitle: 'AI suggestions are off',
		enableHint: 'Turn on FitCoach reply ideas for this WhatsApp account.',
		enable: 'Enable AI suggestions',
		empty: 'No suggestions yet. Tap regenerate.',
		waitingMessages: 'Waiting for messages…',
		waitingMessagesHint: 'Suggestions unlock after the chat history is ready.',
		hidden: 'AI suggestions are hidden',
		show: 'Show',
		noPrompts: 'No saved instructions',
	},
	ar: {
		title: 'اقتراحات AI',
		regenerate: 'إنشاء اقتراحات جديدة',
		retry: 'إعادة المحاولة',
		hint: 'اضغط اقتراحًا لتعديله قبل الإرسال.',
		prompt: 'التعليمات',
		enableTitle: 'اقتراحات الذكاء الاصطناعي متوقفة',
		enableHint: 'فعّل اقتراحات FitCoach لهذا حساب واتساب.',
		enable: 'تفعيل الاقتراحات',
		empty: 'لا توجد اقتراحات بعد. اضغط تحديث.',
		waitingMessages: 'بانتظار الرسائل…',
		waitingMessagesHint: 'تُفعَّل الاقتراحات بعد جاهزية سجل المحادثة.',
		hidden: 'اقتراحات الذكاء الاصطناعي مخفية',
		show: 'إظهار',
		noPrompts: 'لا توجد تعليمات محفوظة',
	},
};

export function PromptInstructionsDropdown({
	prompts = [],
	value,
	onChange,
	label,
	disabled,
	emptyLabel,
}) {
	const [open, setOpen] = useState(false);
	const [position, setPosition] = useState(null);
	const rootRef = useRef(null);
	const buttonRef = useRef(null);
	const menuRef = useRef(null);
	const selected =
		prompts.find(prompt => prompt.id === value) || prompts[0] || null;

	useEffect(() => {
		if (!open) return undefined;
		const updatePosition = () => {
			const rect = buttonRef.current?.getBoundingClientRect();
			if (!rect) return;
			const width = Math.max(rect.width, 220);
			const left = Math.min(
				Math.max(8, rect.left),
				Math.max(8, window.innerWidth - width - 8),
			);
			const opensUp = rect.bottom + 220 > window.innerHeight;
			setPosition({
				top: opensUp ? undefined : rect.bottom + 6,
				bottom: opensUp ? window.innerHeight - rect.top + 6 : undefined,
				left,
				width,
			});
		};
		updatePosition();
		const closeOnOutsideClick = event => {
			if (
				!rootRef.current?.contains(event.target) &&
				!menuRef.current?.contains(event.target)
			) {
				setOpen(false);
			}
		};
		const closeOnEscape = event => {
			if (event.key === 'Escape') setOpen(false);
		};
		document.addEventListener('pointerdown', closeOnOutsideClick);
		document.addEventListener('keydown', closeOnEscape);
		window.addEventListener('resize', updatePosition);
		window.addEventListener('scroll', updatePosition, true);
		return () => {
			document.removeEventListener('pointerdown', closeOnOutsideClick);
			document.removeEventListener('keydown', closeOnEscape);
			window.removeEventListener('resize', updatePosition);
			window.removeEventListener('scroll', updatePosition, true);
		};
	}, [open]);

	if (!prompts.length) return null;

	return (
		<div ref={rootRef} className="relative flex min-w-0 items-center gap-1.5">
			<span className="shrink-0 text-[10px] font-bold text-slate-500 dark:text-slate-400">
				{label}
			</span>
			<button
				ref={buttonRef}
				type="button"
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-label={label}
				disabled={disabled}
				onClick={() => setOpen(current => !current)}
				className="flex h-7 min-w-[6.5rem] max-w-[11rem] items-center justify-between gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 outline-none transition hover:border-violet-300 focus-visible:ring-2 focus-visible:ring-violet-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
			>
				<span className="truncate">{selected?.name || emptyLabel}</span>
				<ChevronDown
					size={14}
					className={`shrink-0 opacity-70 transition-transform ${open ? 'rotate-180' : ''}`}
				/>
			</button>
			{open &&
				position &&
				typeof document !== 'undefined' &&
				createPortal(
					<div
						ref={menuRef}
						role="listbox"
						aria-label={label}
						className="fixed z-[600] max-h-64 overflow-y-auto rounded-2xl border border-violet-100 bg-white p-1.5 shadow-2xl dark:border-violet-900 dark:bg-slate-900"
						style={position}
					>
						{prompts.map(prompt => {
							const active = prompt.id === (value || selected?.id);
							return (
								<button
									key={prompt.id}
									type="button"
									role="option"
									aria-selected={active}
									onClick={() => {
										onChange?.(prompt.id);
										setOpen(false);
									}}
									className={`flex w-full items-start gap-2 rounded-xl px-2.5 py-2 text-start transition-colors ${
										active
											? 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200'
											: 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'
									}`}
								>
									<div className="min-w-0 flex-1">
										<p className="truncate text-xs font-bold">{prompt.name}</p>
										{prompt.prompt ? (
											<p className="mt-0.5 line-clamp-2 text-[10px] font-medium leading-4 opacity-60">
												{prompt.prompt}
											</p>
										) : null}
									</div>
									{active ? (
										<Check size={14} className="mt-0.5 shrink-0 text-violet-600" />
									) : (
										<span className="w-3.5 shrink-0" />
									)}
								</button>
							);
						})}
					</div>,
					document.body,
				)}
		</div>
	);
}

export default function AiReplySuggestions({
	locale = 'en',
	visible = true,
	settingsEnabled = false,
	messagesReady = true,
	loading = false,
	enabling = false,
	error,
	suggestions = [],
	prompts = [],
	activePromptId,
	promptSaving,
	onSelect,
	onRegenerate,
	onPromptChange,
	onEnable,
	onShow,
	repliesOnly = false,
}) {
	if (!visible) return null;
	const text = COPY[String(locale).toLowerCase().startsWith('ar') ? 'ar' : 'en'];
	const items = Array.isArray(suggestions)
		? suggestions.filter(item => typeof item === 'string' && item.trim())
		: [];
	const canUseSuggestions = settingsEnabled && messagesReady;
	const showLoading = canUseSuggestions && loading;

	return (
		<section
			aria-label={text.title}
			className={`wa-ai-suggestions border-t border-slate-200/80 bg-[#F0F2F5] px-3 py-1.5 dark:border-slate-800 dark:bg-slate-950 ${
				repliesOnly ? 'wa-ai-suggestions--replies-only' : ''
			}`}
		>
			{!settingsEnabled ? (
				<div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/80 px-2.5 py-2 dark:bg-slate-900/80">
					<div className="min-w-0">
						<div className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
							<Sparkles size={13} aria-hidden="true" />
							<span>{text.enableTitle}</span>
						</div>
						<p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
							{text.enableHint}
						</p>
					</div>
					<button
						type="button"
						onClick={onEnable}
						disabled={enabling || !onEnable}
						className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{enabling ? (
							<RefreshCw size={13} className="animate-spin" />
						) : (
							<Power size={13} />
						)}
						{text.enable}
					</button>
				</div>
			) : (
				<>
					<div className="flex items-center gap-2">
						<div className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
							<Sparkles size={13} aria-hidden="true" className="text-violet-600 dark:text-violet-300" />
							<span className="truncate text-violet-700 dark:text-violet-300" title={text.hint}>{text.title}</span>
							{!messagesReady ? (
								<span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
									<Loader2 size={10} className="animate-spin" />
									{text.waitingMessages}
								</span>
							) : null}
						</div>
						<div className="ms-auto flex min-w-0 shrink-0 items-center gap-1.5">
							{prompts.length > 0 ? (
								<PromptInstructionsDropdown
									prompts={prompts}
									value={activePromptId || prompts[0]?.id || ''}
									onChange={onPromptChange}
									label={text.prompt}
									disabled={promptSaving || !messagesReady}
									emptyLabel={text.noPrompts}
								/>
							) : null}
							<button
								type="button"
								onClick={onRegenerate}
								disabled={!canUseSuggestions || loading}
								aria-label={text.regenerate}
								title={
									!messagesReady ? text.waitingMessagesHint : text.regenerate
								}
								className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full text-slate-500 transition hover:bg-white hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-violet-300"
							>
								<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
							</button>
						</div>
					</div>

					{!messagesReady ? (
						<p className="mt-1.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
							{text.waitingMessagesHint}
						</p>
					) : showLoading ? (
						<div className="wa-ai-suggestions-scroller mt-1.5" aria-busy="true">
							{[168, 132, 148].map(width => (
								<div
									key={width}
									className="h-8 shrink-0 animate-pulse rounded-full bg-white/80 dark:bg-slate-800"
									style={{ width: `${width}px` }}
								/>
							))}
						</div>
					) : error ? (
						<div className="mt-1.5 flex items-center justify-between gap-2 rounded-xl bg-rose-50 px-2.5 py-1.5 text-[11px] text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
							<span className="flex min-w-0 items-center gap-1.5">
								<AlertCircle size={13} className="shrink-0" />
								<span className="truncate">{error}</span>
							</span>
							<button
								type="button"
								onClick={onRegenerate}
								disabled={!canUseSuggestions}
								className="shrink-0 cursor-pointer font-semibold underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{text.retry}
							</button>
						</div>
					) : items.length ? (
						<div className="wa-ai-suggestions-scroller mt-1.5">
							{items.map((suggestion, index) => (
								<button
									key={`${index}-${suggestion}`}
									type="button"
									title={suggestion}
									onClick={() => onSelect?.(suggestion)}
									className="wa-ai-suggestion-chip"
								>
									<span className="line-clamp-2">{suggestion}</span>
								</button>
							))}
						</div>
					) : (
						<div className="mt-1.5 flex items-center justify-between gap-2 px-0.5 text-[11px] text-slate-500">
							<span>{text.empty}</span>
							<button
								type="button"
								onClick={onRegenerate}
								disabled={!canUseSuggestions}
								className="cursor-pointer font-semibold text-violet-600 underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:text-violet-300"
							>
								{text.regenerate}
							</button>
						</div>
					)}
				</>
			)}
		</section>
	);
}
