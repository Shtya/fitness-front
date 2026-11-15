'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, FileText, Image as ImageIcon, MapPin, RefreshCw, Sparkles, User } from 'lucide-react';
import { PromptInstructionsDropdown } from '../ai/AiReplySuggestions';
import { Toggle } from './WaToggle';

export function MobileAttachmentSheet({
	open,
	onClose,
	onAction,
	locale = 'en',
	anchorRef = null,
	aiEnabled = false,
	aiVisible = true,
	onToggleAiVisible,
	prompts = [],
	activePromptId,
	promptSaving = false,
	onPromptChange,
	suggestionsLoading = false,
	onRegenerateSuggestions,
	settingsEnabled = false,
	onEnableAi,
	onDisableAi,
	// Composer tools that sit inline on desktop but would crush the input on a phone.
	mobileToolActions = [],
}) {
	const [placement, setPlacement] = useState(null);

	// Escape closes it (it used to stay open over the next popup, e.g. the message menu).
	useEffect(() => {
		if (!open) return undefined;
		const onKey = event => {
			if (event.key === 'Escape') onClose?.();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open, onClose]);

	useLayoutEffect(() => {
		if (!open) {
			setPlacement(null);
			return undefined;
		}

		const update = () => {
			const desktop =
				typeof window !== 'undefined' &&
				window.matchMedia('(min-width: 769px)').matches;
			const rect = anchorRef?.current?.getBoundingClientRect?.();
			if (!desktop || !rect) {
				setPlacement({ mode: 'sheet' });
				return;
			}
			const width = Math.min(248, window.innerWidth - 24);
			let left = rect.left;
			if (left + width > window.innerWidth - 12) {
				left = window.innerWidth - width - 12;
			}
			left = Math.max(12, left);
			setPlacement({
				mode: 'popover',
				bottom: Math.max(12, window.innerHeight - rect.top + 8),
				left,
				width,
			});
		};

		update();
		window.addEventListener('resize', update);
		window.addEventListener('scroll', update, true);
		return () => {
			window.removeEventListener('resize', update);
			window.removeEventListener('scroll', update, true);
		};
	}, [open, anchorRef]);

	if (!open) return null;
	if (!placement) return null;
	const ar = String(locale).toLowerCase().startsWith('ar');
	const isDesktop = placement.mode === 'popover';
	const actions = [
		['photos', ImageIcon, ar ? 'الصور والوسائط' : 'Photos & media', '#7C5CFC'],
		...(!isDesktop
			? [['camera', Camera, ar ? 'الكاميرا' : 'Camera', '#FF4F78']]
			: []),
		['document', FileText, ar ? 'مستند' : 'Document', '#4B88FF'],
		['contact', User, ar ? 'جهة اتصال' : 'Contact', '#00A884'],
		['location', MapPin, ar ? 'الموقع' : 'Location', '#20B86B'],
		...(!isDesktop ? mobileToolActions : []),
	];
	return createPortal(
		<div className="wa-composer-overlay fixed inset-0 z-500" role="presentation">
			<button type="button" aria-label={ar ? 'إغلاق الإجراءات' : 'Close attachment actions'} onClick={onClose} className={`absolute inset-0 ${isDesktop ? 'bg-transparent' : 'bg-black/20'}`} />
			<section
				role="dialog"
				aria-modal="true"
				aria-label={ar ? 'المزيد من الخيارات' : 'More options'}
				className={
					isDesktop
						? 'wa-attachment-popover bg-white px-1.5 py-1.5 dark:bg-[#233138] dark:text-[#e9edef]'
						: 'wa-attachment-sheet absolute inset-x-0 bottom-0 mx-auto max-w-[430px] rounded-t-[20px] bg-white px-3 pb-[max(18px,env(safe-area-inset-bottom))] pt-2.5 shadow-2xl dark:bg-[#233138] dark:text-[#e9edef]'
				}
				style={
					isDesktop
						? {
								bottom: placement.bottom,
								left: placement.left,
								width: placement.width,
							}
						: undefined
				}
			>
				{!isDesktop && <div className="wa-att-grabber mx-auto mb-2.5 h-1 w-8 rounded-full bg-slate-300" />}

				{aiEnabled && (
					<div className="wa-att-ai mb-1 rounded-xl border border-violet-100 bg-violet-50/80 px-2 py-1.5">
						<div className="flex items-center gap-2">
							<span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet-600 text-white">
								<Sparkles size={12} />
							</span>
							<div className="min-w-0 flex-1">
								<p className="text-[12px] font-bold leading-4 text-violet-900">
									{ar ? 'اقتراحات الذكاء' : 'AI suggestions'}
								</p>
								{!isDesktop ? (
									<p className="text-[10px] leading-3 text-violet-700/80">
										{ar ? 'ردود مقترحة أثناء الشات' : 'Suggest replies while you chat'}
									</p>
								) : null}
							</div>
							<Toggle
								size="sm"
								checked={Boolean(settingsEnabled)}
								label={ar ? 'تفعيل الذكاء الاصطناعي' : 'Enable AI suggestions'}
								onChange={next => {
									if (next) {
										void Promise.resolve(onEnableAi?.()).catch(() => {});
										if (!aiVisible) onToggleAiVisible?.();
									} else {
										void Promise.resolve(onDisableAi?.()).catch(() => {});
									}
								}}
							/>
						</div>
						{settingsEnabled ? (
							<div className="mt-1.5 flex items-center gap-1.5 border-t border-violet-100 pt-1.5">
								<Toggle
									size="sm"
									checked={Boolean(aiVisible)}
									label={ar ? 'إظهار الشريط' : 'Show suggestion bar'}
									onChange={() => onToggleAiVisible?.()}
								/>
								<span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-violet-800">
									{ar ? 'إظهار الشريط' : 'Show bar'}
								</span>
								{prompts.length > 0 && !isDesktop ? (
									<PromptInstructionsDropdown
										prompts={prompts}
										value={activePromptId || prompts[0]?.id || ''}
										onChange={onPromptChange}
										label={ar ? 'التعليمات' : 'Instructions'}
										disabled={promptSaving}
										emptyLabel={ar ? 'لا توجد تعليمات' : 'No instructions'}
									/>
								) : null}
								<button
									type="button"
									onClick={onRegenerateSuggestions}
									disabled={suggestionsLoading || !aiVisible}
									aria-label={ar ? 'تحديث الاقتراحات' : 'Regenerate suggestions'}
									className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-violet-200 bg-white text-violet-700 disabled:opacity-40"
								>
									<RefreshCw size={11} className={suggestionsLoading ? 'animate-spin' : ''} />
								</button>
							</div>
						) : null}
					</div>
				)}

				<div className="wa-att-list flex flex-col">
					{actions.map(([id, Icon, label, color]) => (
						<button
							key={id}
							type="button"
							onClick={() => onAction(id)}
							className={`wa-att-item flex w-full items-center text-start last:border-0 hover:bg-black/[0.04] active:bg-black/[0.05] ${
								isDesktop
									? 'min-h-9 gap-2 rounded-lg px-1.5 py-1'
									: 'min-h-11 gap-2.5 border-b border-black/5 px-0.5 py-2'
							}`}
						>
							<span
								className={`wa-att-icon grid shrink-0 place-items-center rounded-full text-white ${
									isDesktop ? 'h-7 w-7' : 'h-9 w-9'
								}`}
								style={{ background: color, '--att': color }}
							>
								<Icon size={isDesktop ? 13 : 17} strokeWidth={2.2} />
							</span>
							<span className={`wa-att-label font-semibold text-[#111b21] ${isDesktop ? 'text-[12px]' : 'text-[14px]'}`}>
								{label}
							</span>
						</button>
					))}
				</div>
			</section>
		</div>,
		document.body,
	);
}
