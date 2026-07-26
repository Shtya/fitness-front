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
		title: 'AI reply suggestions',
		regenerate: 'Regenerate suggestions',
		retry: 'Retry',
		hint: 'Select a suggestion to edit it before sending.',
		prompt: 'Instructions',
		enableTitle: 'AI suggestions are off',
		enableHint: 'Turn on FitCoach reply ideas for this WhatsApp account.',
		enable: 'Enable AI suggestions',
		empty: 'No suggestions yet. Tap regenerate.',
		waitingMessages: 'Waiting for messages to load…',
		waitingMessagesHint: 'Suggestions unlock after the chat history is ready.',
		hidden: 'AI suggestions are hidden',
		show: 'Show',
		noPrompts: 'No saved instructions',
	},
	ar: {
		title: 'اقتراحات الرد بالذكاء الاصطناعي',
		regenerate: 'إنشاء اقتراحات جديدة',
		retry: 'إعادة المحاولة',
		hint: 'اختر اقتراحًا لتعديله قبل الإرسال.',
		prompt: 'التعليمات',
		enableTitle: 'اقتراحات الذكاء الاصطناعي متوقفة',
		enableHint: 'فعّل اقتراحات FitCoach لهذا حساب واتساب.',
		enable: 'تفعيل الاقتراحات',
		empty: 'لا توجد اقتراحات بعد. اضغط تحديث.',
		waitingMessages: 'بانتظار تحميل الرسائل…',
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
				className="flex h-8 min-w-[7.5rem] max-w-[13rem] items-center justify-between gap-1.5 rounded-full border border-violet-200 bg-white px-2.5 text-xs font-bold text-slate-700 outline-none transition hover:border-violet-400 focus-visible:ring-2 focus-visible:ring-violet-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-900 dark:bg-slate-900 dark:text-slate-200"
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
			className={`wa-ai-suggestions border-t border-slate-100 bg-gradient-to-b from-violet-50/70 to-white/95 px-3 py-2.5 backdrop-blur dark:border-slate-800 dark:from-violet-950/20 dark:to-slate-950/95 ${
				repliesOnly ? 'wa-ai-suggestions--replies-only' : ''
			}`}
		>
			{!settingsEnabled ? (
				<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-200/80 bg-white/90 px-3 py-2.5 shadow-sm dark:border-violet-900 dark:bg-slate-900/80">
					<div className="min-w-0">
						<div className="flex items-center gap-1.5 text-xs font-black text-violet-700 dark:text-violet-300">
							<Sparkles size={14} aria-hidden="true" />
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
						className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
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
					<div className="mb-2 flex flex-wrap items-center justify-between gap-2">
						<div className="min-w-0">
							<div className="flex items-center gap-1.5 text-xs font-black text-violet-700 dark:text-violet-300">
								<Sparkles size={14} aria-hidden="true" />
								<span>{text.title}</span>
								{!messagesReady ? (
									<span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
										<Loader2 size={11} className="animate-spin" />
										{text.waitingMessages}
									</span>
								) : null}
							</div>
							{!repliesOnly ? (
								<p className="mt-0.5 truncate text-[10px] text-slate-400">{text.hint}</p>
							) : null}
						</div>
						<div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
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
								className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full text-violet-600 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-violet-300 dark:hover:bg-violet-950/40"
							>
								<RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
							</button>
						</div>
					</div>

					{!messagesReady ? (
						<div className="flex items-center gap-2 rounded-2xl border border-dashed border-violet-200 bg-white/70 px-3 py-2.5 text-xs text-slate-500 dark:border-violet-900 dark:bg-slate-900/50 dark:text-slate-400">
							<Loader2 size={14} className="shrink-0 animate-spin text-violet-500" />
							<div className="min-w-0">
								<p className="font-bold text-slate-600 dark:text-slate-300">
									{text.waitingMessages}
								</p>
								<p className="mt-0.5 text-[10px] opacity-80">{text.waitingMessagesHint}</p>
							</div>
						</div>
					) : showLoading ? (
						<div className="flex gap-2 overflow-hidden" aria-busy="true">
							{[72, 96, 80].map(width => (
								<div
									key={width}
									className="h-9 shrink-0 animate-pulse rounded-full bg-violet-100/80 dark:bg-violet-950/40"
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
								disabled={!canUseSuggestions}
								className="shrink-0 cursor-pointer font-black underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{text.retry}
							</button>
						</div>
					) : items.length ? (
						<div className="nice-scroll flex max-w-full gap-2 overflow-x-auto pb-1">
							{items.map((suggestion, index) => (
								<button
									key={`${index}-${suggestion}`}
									type="button"
									onClick={() => onSelect?.(suggestion)}
									className="max-w-[min(32rem,82vw)] shrink-0 cursor-pointer whitespace-normal rounded-2xl border border-violet-200 bg-white px-3.5 py-2 text-start text-xs font-semibold leading-5 text-slate-700 shadow-sm transition hover:-translate-y-px hover:border-violet-400 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-violet-900 dark:bg-violet-950/30 dark:text-slate-200 dark:hover:border-violet-700"
								>
									{suggestion}
								</button>
							))}
						</div>
					) : (
						<div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-violet-200 bg-white/60 px-3 py-2 text-xs text-slate-500 dark:border-violet-900 dark:bg-slate-900/40">
							<span>{text.empty}</span>
							<button
								type="button"
								onClick={onRegenerate}
								disabled={!canUseSuggestions}
								className="cursor-pointer font-bold text-violet-600 underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:text-violet-300"
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
