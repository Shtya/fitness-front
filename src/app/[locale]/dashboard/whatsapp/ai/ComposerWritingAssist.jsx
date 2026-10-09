'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
	Check,
	Languages,
	Loader2,
	Sparkles,
	WandSparkles,
	X,
} from 'lucide-react';
import { whatsappAiApi } from './whatsapp-ai-api';

const PANEL_WIDTH = 340;
const VIEWPORT_PAD = 12;

const MODES = [
	{
		id: 'ar_to_en',
		icon: Languages,
		en: { label: 'AR → EN', hint: 'Write Arabic, get English' },
		ar: { label: 'عربي → إنجليزي', hint: 'اكتب بالعربي واحصل على إنجليزي' },
	},
	{
		id: 'en_polish',
		icon: WandSparkles,
		en: { label: 'Fix English', hint: 'Grammar & sentence polish' },
		ar: { label: 'تصحيح إنجليزي', hint: 'تصحيح النحو والجملة' },
	},
	{
		id: 'en_stronger',
		icon: Sparkles,
		en: { label: 'Stronger', hint: 'More powerful wording' },
		ar: { label: 'أقوى صياغة', hint: 'كلمات وجمل أقوى' },
	},
];

function errorMessage(error, fallback) {
	const value = error?.response?.data?.message || error?.message || fallback;
	return Array.isArray(value) ? value.join(', ') : String(value);
}

function clampPanelPosition(rect) {
	const width = Math.min(PANEL_WIDTH, Math.max(240, window.innerWidth - VIEWPORT_PAD * 2));
	// Prefer aligning the panel’s end with the trigger; fall back so it stays on-screen.
	let left = rect.right - width;
	left = Math.min(left, window.innerWidth - width - VIEWPORT_PAD);
	left = Math.max(VIEWPORT_PAD, left);
	const gap = 8;
	const spaceAbove = rect.top - VIEWPORT_PAD;
	const placeAbove = spaceAbove >= 220 || spaceAbove >= window.innerHeight - rect.bottom;
	if (placeAbove) {
		return {
			left,
			width,
			bottom: window.innerHeight - rect.top + gap,
			maxHeight: Math.max(180, Math.min(420, spaceAbove - gap)),
		};
	}
	return {
		left,
		width,
		top: rect.bottom + gap,
		maxHeight: Math.max(180, Math.min(420, window.innerHeight - rect.bottom - VIEWPORT_PAD - gap)),
	};
}

export default function ComposerWritingAssist({
	locale = 'en',
	conversationId,
	draft = '',
	getDraft,
	disabled = false,
	onApply,
}) {
	const ar = String(locale).toLowerCase().startsWith('ar');
	const [open, setOpen] = useState(false);
	const [mode, setMode] = useState('ar_to_en');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [result, setResult] = useState(null);
	const [position, setPosition] = useState(null);
	const abortRef = useRef(null);
	const rootRef = useRef(null);
	const buttonRef = useRef(null);
	const panelRef = useRef(null);

	const readDraft = () => {
		if (typeof getDraft === 'function') return String(getDraft() || '');
		return String(draft || '');
	};

	const copy = useMemo(
		() =>
			ar
				? {
						title: 'مساعد الكتابة',
						run: 'حسّن',
						use: 'استخدم في الرسالة',
						discard: 'تجاهل',
						final: 'الإنجليزي النهائي',
						notes: 'ملاحظات',
						empty: 'اكتب رسالة أولاً',
						open: 'مساعد الكتابة',
					}
				: {
						title: 'Writing assist',
						run: 'Improve',
						use: 'Use in composer',
						discard: 'Discard',
						final: 'Final English',
						notes: 'Notes',
						empty: 'Write a draft first',
						open: 'Writing assist',
					},
		[ar],
	);

	const updatePosition = useCallback(() => {
		const rect = buttonRef.current?.getBoundingClientRect();
		if (!rect) return;
		setPosition(clampPanelPosition(rect));
	}, []);

	useEffect(() => {
		if (!open) return undefined;
		updatePosition();
		const onPointer = event => {
			const target = event.target;
			if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
			setOpen(false);
		};
		const onKey = event => {
			if (event.key === 'Escape') setOpen(false);
		};
		window.addEventListener('resize', updatePosition);
		window.addEventListener('scroll', updatePosition, true);
		document.addEventListener('pointerdown', onPointer);
		document.addEventListener('keydown', onKey);
		return () => {
			window.removeEventListener('resize', updatePosition);
			window.removeEventListener('scroll', updatePosition, true);
			document.removeEventListener('pointerdown', onPointer);
			document.removeEventListener('keydown', onKey);
		};
	}, [open, updatePosition]);

	useEffect(
		() => () => {
			abortRef.current?.abort();
		},
		[],
	);

	const runAssist = async () => {
		const text = readDraft().trim();
		if (!conversationId || !text || loading || disabled) return;
		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;
		setLoading(true);
		setError('');
		setResult(null);
		try {
			const data = await whatsappAiApi.writingAssist(
				conversationId,
				{ text, mode },
				controller.signal,
			);
			setResult(data);
			requestAnimationFrame(updatePosition);
		} catch (err) {
			if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
			setError(errorMessage(err, ar ? 'تعذر تحسين النص' : 'Could not improve the draft'));
		} finally {
			setLoading(false);
		}
	};

	const applyResult = () => {
		const text = String(result?.finalText || '').trim();
		if (!text) return;
		onApply?.(text);
		setOpen(false);
		setResult(null);
		setError('');
	};

	const panel =
		open && position && typeof document !== 'undefined'
			? createPortal(
					<div
						ref={panelRef}
						className="wa-writing-assist__panel fixed z-[500] overflow-hidden rounded-2xl border border-[#e9edef] bg-white shadow-[0_16px_48px_rgba(11,20,26,0.22)]"
						style={{
							left: position.left,
							width: position.width,
							...(position.bottom != null
								? { bottom: position.bottom }
								: { top: position.top }),
							maxHeight: position.maxHeight,
						}}
						role="dialog"
						aria-label={copy.title}
					>
						<div className="flex items-center justify-between border-b border-[#e9edef] px-3.5 py-2.5">
							<div className="min-w-0">
								<p className="text-sm font-bold text-[#111b21]">{copy.title}</p>
								<p className="truncate text-[11px] text-[#667781]">
									{ar ? MODES.find(m => m.id === mode)?.ar.hint : MODES.find(m => m.id === mode)?.en.hint}
								</p>
							</div>
							<button
								type="button"
								onClick={() => setOpen(false)}
								className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#667781] hover:bg-[#f0f2f5]"
								aria-label={ar ? 'إغلاق' : 'Close'}
							>
								<X size={16} />
							</button>
						</div>
						<div className="wa-ui-scroll nice-scroll space-y-3 overflow-y-auto p-3" style={{ maxHeight: Math.max(120, (position.maxHeight || 360) - 52) }}>
							<div className="grid grid-cols-3 gap-1.5">
								{MODES.map(item => {
									const labels = ar ? item.ar : item.en;
									const Icon = item.icon;
									const active = mode === item.id;
									return (
										<button
											key={item.id}
											type="button"
											onClick={() => {
												setMode(item.id);
												setResult(null);
												setError('');
											}}
											className={`rounded-xl border px-2 py-2.5 text-start transition ${
												active
													? 'border-[#00a884] bg-[#e7f8f2] text-[#008069] shadow-[inset_0_0_0_1px_rgba(0,168,132,0.25)]'
													: 'border-[#e9edef] bg-white text-[#111b21] hover:bg-[#f7f8fa]'
											}`}
											title={labels.hint}
										>
											<Icon size={15} strokeWidth={2.2} className="mb-1.5" />
											<p className="text-[11px] font-bold leading-tight">{labels.label}</p>
										</button>
									);
								})}
							</div>
							<button
								type="button"
								disabled={disabled || loading || !readDraft().trim()}
								onClick={() => void runAssist()}
								className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00a884] px-3 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-50"
							>
								{loading ? (
									<Loader2 size={16} className="animate-spin" />
								) : (
									<WandSparkles size={16} />
								)}
								{loading ? (ar ? 'جارٍ التحسين…' : 'Improving…') : copy.run}
							</button>
							{!readDraft().trim() ? (
								<p className="text-xs text-[#667781]">{copy.empty}</p>
							) : null}
							{error ? <p className="text-xs text-rose-600">{error}</p> : null}
							{result?.finalText ? (
								<div className="space-y-2 rounded-xl bg-[#f0f2f5] p-3">
									<p className="text-[11px] font-bold uppercase tracking-wide text-[#667781]">
										{copy.final}
									</p>
									<p
										className="whitespace-pre-wrap text-sm leading-5 text-[#111b21]"
										dir="ltr"
										lang="en"
									>
										{result.finalText}
									</p>
									{Array.isArray(result.notes) && result.notes.length ? (
										<div className="space-y-1">
											<p className="text-[11px] font-bold text-[#667781]">{copy.notes}</p>
											<ul className="list-disc space-y-0.5 ps-4 text-xs text-[#54656f]">
												{result.notes.map(note => (
													<li key={note}>{note}</li>
												))}
											</ul>
										</div>
									) : null}
									<div className="flex gap-2 pt-1">
										<button
											type="button"
											onClick={applyResult}
											className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#111b21] px-3 py-2 text-xs font-bold text-white"
										>
											<Check size={14} />
											{copy.use}
										</button>
										<button
											type="button"
											onClick={() => {
												setResult(null);
												setError('');
											}}
											className="rounded-xl px-3 py-2 text-xs font-bold text-[#667781] hover:bg-white"
										>
											{copy.discard}
										</button>
									</div>
								</div>
							) : null}
						</div>
					</div>,
					document.body,
				)
			: null;

	return (
		<div ref={rootRef} className="wa-writing-assist relative shrink-0">
			<button
				ref={buttonRef}
				type="button"
				disabled={disabled}
				title={copy.open}
				aria-label={copy.open}
				aria-expanded={open}
				onClick={() => {
					setOpen(current => {
						const next = !current;
						if (next) requestAnimationFrame(updatePosition);
						return next;
					});
				}}
				className={`wa-input-action wa-composer-tool--desktop grid h-9 w-9 place-items-center rounded-full text-[#54656f] transition hover:bg-[#f0f2f5] disabled:opacity-40 ${
					open ? 'bg-[#e7f8f2] text-[#00a884]' : ''
				}`}
			>
				<Languages size={18} strokeWidth={2.1} />
			</button>
			{panel}
		</div>
	);
}
